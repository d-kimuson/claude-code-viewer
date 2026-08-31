/// A minimalistic ptrace-based sandbox.
///
/// Modern (2025-era) sandboxes should use seccomp-bpf + user notification, but at Replit, there's
/// already one such sandbox in use, so it cannot be used. Instead, an old (2000s-era) ptrace-based
/// sandbox is used. It is not intended to be secure, just to prevent accidents.
///
/// Note that it is important for this whole library to consistently use [nix::libc::_exit] instead
/// of [std::process:exit], because the latter runs atexit handlers, which will cause the process
/// to segfault.
use std::ffi::CStr;
use std::fs::read_link;
use std::panic::catch_unwind;
use std::path::PathBuf;

use anyhow::{Context, Result};
use log::{debug, error};
use nix::fcntl::OFlag;
use nix::libc::{self, c_int};
use nix::sys::prctl::set_name;
use nix::sys::ptrace;
use nix::sys::signal::{kill, raise, signal, sigprocmask, SigSet, SigmaskHow, Signal};
use nix::sys::wait::{wait, waitpid, WaitStatus};
use nix::unistd::{fork, ForkResult, Pid};
use nix::Error;
use syscalls::x86_64::Sysno;

const AT_FDCWD: u64 = 0xffffff9c;
const AT_FDCWD64: u64 = 0xffffffffffffff9c;

static mut CHILD_PID: Pid = Pid::from_raw(-1);

/// Read a path (a NUL-terminated string) from the tracee.
fn read_path(pid: Pid, mut addr: u64) -> Result<PathBuf> {
  // All reads must be word-aligned.
  const ALIGNMENT: u64 = 0x7;
  let mut buf = Vec::<u8>::with_capacity(1024);
  let mut offset = (addr & ALIGNMENT) as usize;
  addr &= !ALIGNMENT;
  // We should limit ourselves to MAX_PATH, but we'll add quite a bit of leeway.
  while buf.len() < 8_192 {
    match ptrace::read(pid, addr as ptrace::AddressType) {
      Ok(ret) => {
        let bytes = ret.to_ne_bytes();
        let (slice, last) = match bytes.as_slice()[offset..].iter().position(|x| *x == 0) {
          Some(end) => (&bytes.as_slice()[offset..offset + end], true),
          None => (&bytes.as_slice()[offset..], false),
        };
        buf.extend_from_slice(slice);
        if last {
          return Ok(PathBuf::from(
            String::from_utf8(buf).context("decode string")?,
          ));
        }
        offset = 0;
        addr += 8;
      }
      Err(Error::ESRCH) => {
        return Err(anyhow::Error::new(Error::ESRCH))
          .with_context(|| format!("process exited: {pid}"));
      }
      Err(err) => {
        return Err(anyhow::Error::new(err))
          .with_context(|| format!("failed to read string: {pid} at 0x{addr:x}"));
      }
    }
  }
  anyhow::bail!("path exceeds MAX_PATH");
}

/// Get the tracee's cwd.
fn get_cwd(pid: Pid) -> Result<PathBuf> {
  read_link(format!("/proc/{}/cwd", pid)).with_context(|| format!("get cwd: /proc/{pid}/cwd"))
}

/// Get the tracee's path for a file descriptor.
fn get_fd_path(pid: Pid, fd: i32) -> Result<PathBuf> {
  read_link(format!("/proc/{}/fd/{}", pid, fd))
    .with_context(|| format!("get path: /proc/{pid}/fd/{fd}"))
}

struct SyscallTarget {
  operation: Operation,
  sysno: Sysno,
  path: PathBuf,
}

/// Get the tracee's target path for the syscall that is about to be executed by the kernel.
fn get_syscall_targets(pid: Pid) -> Result<Vec<SyscallTarget>> {
  let regs = match ptrace::getregs(pid) {
    Ok(regs) => regs,
    Err(Error::ESRCH) => return Ok(vec![]), // process gone, no targets
    Err(err) => return Err(err).context("ptrace::getregs"),
  };
  if regs.rax != (-(Error::ENOSYS as i32)) as u64 {
    // This is a syscall-exit-stop, and we have already made the decision of allowing / denying the operation.
    return Ok(vec![]);
  }
  match Sysno::new(regs.orig_rax as usize) {
    Some(sysno @ Sysno::open) => {
      let mut path = get_cwd(pid).context("open: get cwd")?;
      path.push(read_path(pid, regs.rdi as u64).context("open: read path")?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      let accmode = (regs.rsi & OFlag::O_ACCMODE.bits() as u64) as c_int;
      if accmode != OFlag::O_WRONLY.bits() && accmode != OFlag::O_RDWR.bits() {
        return Ok(vec![]);
      }
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::truncate) => {
      let mut path = get_cwd(pid).context("truncate: get cwd")?;
      path.push(read_path(pid, regs.rdi as u64).context("truncate: read path")?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::rmdir) => {
      let mut path = get_cwd(pid).context("rmdir: get cwd")?;
      path.push(read_path(pid, regs.rdi as u64).context("rmdir: read path")?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Delete,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::rename) => {
      let cwd = get_cwd(pid).context("rename: get cwd")?;
      let oldname = cwd.join(read_path(pid, regs.rdi as u64).context("rename: read oldname")?);
      let newname = cwd.join(read_path(pid, regs.rsi as u64).context("rename: read newname")?);
      debug!(pid:? = pid, oldname:?= oldname, newname:? = newname, sysno:?=sysno; "syscall");
      Ok(vec![
        SyscallTarget {
          operation: Operation::Delete,
          sysno,
          path: oldname,
        },
        SyscallTarget {
          operation: Operation::Modify,
          sysno,
          path: newname,
        },
      ])
    }
    Some(sysno @ Sysno::creat) => {
      let mut path = get_cwd(pid).context("creat: get cwd")?;
      path.push(read_path(pid, regs.rdi as u64).context("creat: read path")?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::link) => {
      let cwd = get_cwd(pid).context("link: get cwd")?;
      let oldname = cwd.join(read_path(pid, regs.rdi as u64).context("link: read oldname")?);
      let newname = cwd.join(read_path(pid, regs.rsi as u64).context("link: read newname")?);
      debug!(pid:? = pid, oldname:?= oldname, newname:? = newname, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path: newname,
      }])
    }
    Some(sysno @ Sysno::unlink) => {
      let mut path = get_cwd(pid).context("unlink: get cwd")?;
      path.push(read_path(pid, regs.rdi as u64).context("unlink: read path")?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Delete,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::symlink) => {
      let cwd = get_cwd(pid).context("symlink: get cwd")?;
      let oldname = cwd.join(read_path(pid, regs.rdi as u64).context("symlink: read oldname")?);
      let newname = cwd.join(read_path(pid, regs.rsi as u64).context("symlink: read newname")?);
      debug!(pid:? = pid, oldname:?= oldname, newname:? = newname, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path: newname,
      }])
    }
    Some(sysno @ Sysno::openat) => {
      let mut path = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("openat: get cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("openat: get fd path {:x}", regs.rdi))?,
      };
      path.push(read_path(pid, regs.rsi as u64)?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      let accmode = (regs.rdx & OFlag::O_ACCMODE.bits() as u64) as c_int;
      if accmode != OFlag::O_WRONLY.bits() && accmode != OFlag::O_RDWR.bits() {
        return Ok(vec![]);
      }
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::unlinkat) => {
      let mut path = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("unlinkat: get cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("unlinkat: get fd path {:x}", regs.rdi))?,
      };
      path.push(read_path(pid, regs.rsi as u64)?);
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Delete,
        sysno,
        path,
      }])
    }
    Some(sysno @ Sysno::renameat) => {
      let mut oldname = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("renameat: get old cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("renameat: get old fd path {:x}", regs.rdi))?,
      };
      oldname.push(read_path(pid, regs.rsi as u64).context("renameat: get old path")?);
      let mut newname = match regs.rdx {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("renameat: get new cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("renameat: get new fd path {:x}", regs.rdi))?,
      };
      newname.push(read_path(pid, regs.r10 as u64).context("renameat: get new path")?);
      debug!(pid:? = pid, oldname:?= oldname, newname:? = newname, sysno:?=sysno; "syscall");
      Ok(vec![
        SyscallTarget {
          operation: Operation::Delete,
          sysno,
          path: oldname,
        },
        SyscallTarget {
          operation: Operation::Modify,
          sysno,
          path: newname,
        },
      ])
    }
    Some(sysno @ Sysno::linkat) => {
      let mut oldpath = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("linkat: get old cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("linkat: get old fd path {:x}", regs.rdi))?,
      };
      oldpath.push(read_path(pid, regs.rsi as u64).context("linkat: get old path")?);
      let mut newpath = match regs.rdx {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("linkat: get new cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("linkat: get new fd path {:x}", regs.rdi))?,
      };
      newpath.push(read_path(pid, regs.rsi as u64).context("linkat: get new path")?);
      debug!(pid:? = pid, oldpath:?= oldpath, newpath:? = newpath, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path: newpath,
      }])
    }
    Some(sysno @ Sysno::symlinkat) => {
      let cwd = get_cwd(pid).context("symlinkat: get cwd")?;
      let oldname = cwd.join(read_path(pid, regs.rdi as u64).context("symlinkat: read oldname")?);
      let mut newname = match regs.rsi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("symlinkat: get new cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("symlinkat: get newfd path {:x}", regs.rsi))?,
      };
      newname.push(read_path(pid, regs.rdx as u64).context("symlinkat: get newname")?);
      debug!(pid:?=pid, oldname:?=oldname, newname:?=newname, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path: newname,
      }])
    }
    Some(sysno @ Sysno::renameat2) => {
      let mut oldpath = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("renameat2: get old cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("renameat2: get old fd path {:x}", regs.rdi))?,
      };
      oldpath.push(read_path(pid, regs.rsi as u64).context("renameat2: get old path")?);
      let mut newpath = match regs.rdx {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("renameat2: get new cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("renameat2: get new fd path {:x}", regs.rdi))?,
      };
      newpath.push(read_path(pid, regs.r10 as u64).context("renameat2: get new path")?);
      debug!(pid:? = pid, oldpath:?= oldpath, newpath:? = newpath, sysno:?=sysno; "syscall");
      Ok(vec![
        SyscallTarget {
          operation: Operation::Delete,
          sysno,
          path: oldpath,
        },
        SyscallTarget {
          operation: Operation::Modify,
          sysno,
          path: newpath,
        },
      ])
    }
    Some(sysno @ Sysno::openat2) => {
      let mut path = match regs.rdi {
        AT_FDCWD64 | AT_FDCWD => get_cwd(pid).context("openat2: get cwd")?,
        dirfd => get_fd_path(pid, dirfd as i32)
          .with_context(|| format!("openat2: get fd path {:x}", regs.rdi))?,
      };
      path.push(read_path(pid, regs.rsi as u64)?);
      let accmode = (regs.rdx & OFlag::O_ACCMODE.bits() as u64) as c_int;
      if accmode != OFlag::O_WRONLY.bits() && accmode != OFlag::O_RDWR.bits() {
        return Ok(vec![]);
      }
      debug!(pid:? = pid, filename:?= path, sysno:?=sysno; "syscall");
      Ok(vec![SyscallTarget {
        operation: Operation::Modify,
        sysno,
        path,
      }])
    }
    Some(sysno) => {
      debug!(pid:? = pid, sysno:?=sysno.name(); "syscall");

      Ok(vec![])
    }
    None => {
      // We don't know what this is.
      Ok(vec![])
    }
  }
}

#[derive(Debug, PartialEq, Eq)]
pub struct SandboxError {
  sysno: Sysno,
  message: String,
  path: PathBuf,
}

impl std::fmt::Display for SandboxError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}: {}", self.message, self.path.display())
  }
}

impl std::error::Error for SandboxError {
  fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
    None
  }
}

/// Inspect the tracee's syscall that is about to be executed.
fn handle_syscall(pid: Pid, options: &Options) -> Result<()> {
  for target in get_syscall_targets(pid).context("get_target_path")? {
    let path_str = match target.path.as_path().to_str() {
      Some(path_str) => path_str,
      None => {
        continue;
      }
    };
    for rule in &options.rules {
      if target.operation != rule.operation {
        continue;
      }

      // Check if path matches any prefix
      let matches_prefix = rule
        .prefixes
        .iter()
        .any(|prefix| path_str.starts_with(prefix));
      if !matches_prefix {
        continue;
      }

      // Path matches operation and a prefix, now check excludes
      if let Some(exclude_prefixes) = &rule.exclude_prefixes {
        let matches_exclude = exclude_prefixes
          .iter()
          .any(|exclude| path_str.starts_with(exclude));
        if matches_exclude {
          continue; // This rule doesn't apply due to exclude
        }
      }

      // Rule applies - return error
      return Err(
        SandboxError {
          sysno: target.sysno,
          message: rule.message.clone(),
          path: target.path,
        }
        .into(),
      );
    }
  }

  Ok(())
}

extern "C" fn forward_signal(signum: c_int) {
  debug!(signum; "received signal");
  if let Ok(signal) = Signal::try_from(signum) {
    let err = unsafe { kill(CHILD_PID, signal) };
    debug!(signum, err:? = err, pid:? = unsafe { CHILD_PID }; "sent signal");
  }
}

/// Run the tracee under the sandbox.
fn run_parent(main_pid: Pid, options: &Options) -> Result<i32> {
  set_name(CStr::from_bytes_with_nul(b"sandbox\0").context("create process name")?)
    .context("set process name")?;
  unsafe {
    CHILD_PID = main_pid;
    // Forward all signals to the child process.
    for signum in Signal::iterator() {
      if signum == Signal::SIGKILL || signum == Signal::SIGCHLD || signum == Signal::SIGSTOP {
        continue;
      }
      match signal(
        signum,
        nix::sys::signal::SigHandler::Handler(forward_signal),
      ) {
        Ok(_) => {}
        Err(err) => {
          return Err(err).with_context(|| {
            format!(
              "failed to install signal handler for {:?}: {:?}",
              signum, err
            )
          });
        }
      }
    }

    // Close all open file descriptors, except stderr.
    let close_range_flags: c_int = 0;
    libc::syscall(libc::SYS_close_range, 0, 1, close_range_flags);
    libc::syscall(
      libc::SYS_close_range,
      3,
      libc::c_uint::MAX,
      close_range_flags,
    );
  }

  // The child process will send a SIGCHLD.
  match waitpid(main_pid, None).with_context(|| format!("waitpid {main_pid}"))? {
    WaitStatus::Exited(_, status_code) => {
      return Ok(status_code);
    }
    WaitStatus::Signaled(_, sig_num, _core_dump) => {
      return Ok(128 + sig_num as i32);
    }
    WaitStatus::Stopped(..)
    | WaitStatus::Continued(..)
    | WaitStatus::StillAlive
    | WaitStatus::PtraceEvent(..)
    | WaitStatus::PtraceSyscall(..) => {}
  }
  match ptrace::setoptions(
    main_pid,
    ptrace::Options::PTRACE_O_TRACESYSGOOD
      | ptrace::Options::PTRACE_O_TRACEFORK
      | ptrace::Options::PTRACE_O_TRACEVFORK
      | ptrace::Options::PTRACE_O_TRACECLONE
      | ptrace::Options::PTRACE_O_EXITKILL
      | ptrace::Options::PTRACE_O_TRACEEXIT,
  ) {
    Ok(_) => {}
    Err(Error::ESRCH) => {
      // The child process has already exited.
      return Ok(0);
    }
    Err(err) => {
      return Err(err).context("ptrace::setoptions");
    }
  }
  match ptrace::syscall(main_pid, None) {
    Ok(_) => {}
    Err(Error::ESRCH) => {
      // The child process has already exited.
      return Ok(0);
    }
    Err(err) => {
      return Err(err).context("failed to continue process");
    }
  }

  loop {
    match wait() {
      Ok(WaitStatus::Stopped(pid, sig_num)) => match sig_num {
        signum @ Signal::SIGTRAP => {
          debug!(signal:?=signum, pid:? = pid; "signal");
          match handle_syscall(pid, options)
            .with_context(|| format!("handle_sigtrap pid={pid}, signum={signum}"))
          {
            Ok(()) => match ptrace::syscall(pid, None) {
              Ok(_) => {}
              Err(Error::ESRCH) => {}
              Err(err) => {
                return Err(anyhow::Error::new(err).context("failed to continue process"));
              }
            },
            Err(err) => {
              match ptrace::kill(pid) {
                Ok(_) => {}
                Err(Error::ESRCH) => {}
                Err(err) => {
                  error!(pid:? = pid, error:?=err; "failed to kill process");
                }
              }
              return Err(err);
            }
          }
        }
        signum @ Signal::SIGSTOP => {
          debug!(signal:?=signum, pid:? = pid; "signal");
          match ptrace::setoptions(
            pid,
            ptrace::Options::PTRACE_O_TRACESYSGOOD
              | ptrace::Options::PTRACE_O_TRACEFORK
              | ptrace::Options::PTRACE_O_TRACEVFORK
              | ptrace::Options::PTRACE_O_TRACECLONE
              | ptrace::Options::PTRACE_O_EXITKILL
              | ptrace::Options::PTRACE_O_TRACEEXIT,
          ) {
            Ok(_) => {}
            Err(Error::ESRCH) => {}
            Err(err) => {
              return Err(anyhow::Error::new(err).context("setoptions"));
            }
          }
          match ptrace::syscall(pid, None) {
            Ok(_) => {}
            Err(Error::ESRCH) => {}
            Err(err) => {
              return Err(anyhow::Error::new(err).context("failed to continue process"));
            }
          }
        }
        signum => {
          debug!(signal:?=signum, pid:? = pid; "signal");
          match ptrace::syscall(pid, Some(signum)) {
            Ok(_) => {}
            Err(Error::ESRCH) => {}
            Err(err) => {
              return Err(anyhow::Error::new(err).context("failed to continue process"));
            }
          }
        }
      },

      Ok(WaitStatus::PtraceSyscall(pid)) => {
        match handle_syscall(pid, options).with_context(|| format!("handle_syscall pid={pid}")) {
          Ok(()) => match ptrace::syscall(pid, None) {
            Ok(_) => {}
            Err(Error::ESRCH) => {}
            Err(err) => {
              return Err(anyhow::Error::new(err).context("failed to continue process"));
            }
          },
          Err(err) => {
            match ptrace::kill(pid) {
              Ok(_) => {}
              Err(Error::ESRCH) => {}
              Err(err) => {
                error!(pid:? = pid, error:?=err; "failed to kill process");
              }
            }
            return Err(err);
          }
        }
      }

      Ok(WaitStatus::PtraceEvent(pid, _sig_num, _data)) => match ptrace::syscall(pid, None) {
        Ok(_) => {}
        Err(Error::ESRCH) => {}
        Err(err) => {
          return Err(anyhow::Error::new(err).context("failed to continue process"));
        }
      },

      Ok(WaitStatus::Exited(pid, exit_status)) => {
        debug!(pid:? = pid, exit_status:? = exit_status; "exited");
        if pid == main_pid {
          return Ok(exit_status);
        }
      }

      Ok(WaitStatus::Signaled(pid, sig_num, _core_dump)) => {
        debug!(pid:? = pid, signal:? = sig_num; "signaled");
        if pid == main_pid {
          return Ok(128 + sig_num as i32);
        }
        match ptrace::syscall(pid, Some(sig_num)) {
          Ok(_) => {}
          Err(Error::ESRCH) => {}
          Err(err) => {
            return Err(anyhow::Error::new(err).context("failed to continue process"));
          }
        }
      }

      Ok(status) => {
        debug!(pid:? = main_pid, status:? = status; "wait");
        match ptrace::syscall(main_pid, None) {
          Ok(_) => {}
          Err(Error::ESRCH) => {}
          Err(err) => {
            return Err(anyhow::Error::new(err).context("failed to continue process"));
          }
        }
      }

      Err(Error::ECHILD) => {
        // No more children! We're done.
        break;
      }

      Err(err) => {
        error!("Some kind of error - {:?}", err);
        break;
      }
    }
  }

  Ok(0)
}

#[derive(PartialEq, Eq, Clone)]
pub enum Operation {
  Modify,
  Delete,
}

/// Sandboxing rules. Deleting / modifying a path with any of the prefixes is forbidden and will
/// cause process termination.
#[derive(Clone)]
pub struct Rule {
  /// The forbidden operation.
  pub operation: Operation,
  /// The list of prefixes that are matched by this rule.
  pub prefixes: Vec<String>,
  /// The list of prefixes that are excluded from this rule.
  pub exclude_prefixes: Option<Vec<String>>,
  /// The message to be shown if this rule triggers.
  pub message: String,
}

/// Options for the sandbox.
#[derive(Clone)]
pub struct Options {
  pub rules: Vec<Rule>,
}

/// Install a sandbox in "the current process".
///
/// In reality this forks the process and the child process is the one that is run under the sandbox.
/// The parent process is not accessible and is the one that actually runs the sandbox.
/// This is intended to be used as a "pre-execve" hook.
///
/// Modifying the forbidden paths / unlinking the forbidden prefixes will result in the sandboxed process being killed.
pub fn install_sandbox(options: Options) -> Result<()> {
  // Reset signal handlers
  for signum in Signal::iterator() {
    if signum == Signal::SIGKILL || signum == Signal::SIGCHLD || signum == Signal::SIGSTOP {
      continue;
    }
    match unsafe { signal(signum, nix::sys::signal::SigHandler::SigDfl) } {
      Ok(_) => {}
      Err(err) => {
        return Err(err).with_context(|| {
          format!(
            "failed to install signal handler for {:?}: {:?}",
            signum, err
          )
        });
      }
    }
  }
  sigprocmask(SigmaskHow::SIG_SETMASK, Some(&SigSet::empty()), None).context("sigprocmask")?;

  match unsafe { fork() }.context("fork")? {
    ForkResult::Child => {
      ptrace::traceme().context("ptrace::traceme")?;
      raise(Signal::SIGSTOP).context("raise SIGSTOP")?;

      Ok(())
    }

    ForkResult::Parent { child } => {
      let err = catch_unwind(|| {
        let status_code = match run_parent(child, &options).context("run_parent") {
          Ok(result) => result,
          Err(err) => match err.downcast_ref::<SandboxError>() {
            Some(err) => {
              eprintln!("{}", err);
              254
            }
            None => {
              eprintln!("run process: {:?}", err);
              1
            }
          },
        };

        unsafe { libc::_exit(status_code) };
      });
      if err.is_ok() {
        unsafe { libc::_exit(0) };
      } else {
        eprintln!("{:#?}", err);
        unsafe { libc::_exit(253) };
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  use std::ffi::c_void;
  use std::fs::{read, read_dir, File};
  use std::os::fd::AsRawFd;
  use std::os::unix::process::CommandExt;
  use std::path::Path;
  use std::process::Command;

  use nix::sys::wait::waitpid;
  use nix::unistd::{dup2, getppid};
  use tempfile::TempDir;

  fn test_install_sandbox(child: fn() -> !, tempdir: &Path) -> Result<(i32, String, String)> {
    let stdout_path = tempdir.join("stdout.txt");
    let stdout_file = File::create(&stdout_path).context("create stdout")?;
    let stderr_path = tempdir.join("stderr.txt");
    let stderr_file = File::create(&stderr_path).context("create stderr")?;

    // We do a double-fork so that the tracer exists in its own little process. That lets the PTRACE_O_EXITKILL magic kick in.
    match unsafe { fork() }.context("fork")? {
      ForkResult::Child => {
        let err = catch_unwind(|| {
          if let Err(err) = dup2(stdout_file.as_raw_fd(), 1) {
            eprintln!("failed to redirect stdout: {err}");
            unsafe { libc::_exit(2) };
          }
          drop(stdout_file);
          if let Err(err) = dup2(stderr_file.as_raw_fd(), 2) {
            eprintln!("failed to redirect stderr: {err}");
            unsafe { libc::_exit(3) };
          }
          drop(stderr_file);

          if let Err(err) = install_sandbox(Options {
            rules: vec![
              Rule {
                operation: Operation::Modify,
                prefixes: vec![
                  "/home/runner/workspace/.replit".to_string(),
                  "/home/runner/workspace/replit.nix".to_string(),
                  "/home/runner/workspace/.git/refs/replit/agent-ledger".to_string(),
                ],
                exclude_prefixes: None,
                message: "Tried to modify a forbidden path".to_string(),
              },
              Rule {
                operation: Operation::Delete,
                prefixes: vec!["/home/runner/workspace/.git/".to_string()],
                exclude_prefixes: Some(vec!["/home/runner/workspace/.git/index.lock".to_string()]),
                message: "Tried to delete a forbidden path".to_string(),
              },
            ],
          }) {
            eprintln!("failed to fork sandbox: {err}");
            unsafe { libc::_exit(4) };
          }
          child()
        });
        if err.is_ok() {
          unsafe { libc::_exit(0) };
        } else {
          eprintln!("{:#?}", err);
          unsafe { libc::_exit(253) };
        }
      }
      ForkResult::Parent { child } => {
        drop(stdout_file);
        drop(stderr_file);

        let wait_status = match waitpid(child, None) {
          Ok(WaitStatus::Exited(_pid, exit_status)) => exit_status,
          Ok(wait_status) => {
            panic!("unexpected wait status: {:#?}", wait_status);
          }
          Err(err) => {
            panic!("unexpected wait error: {:#?}", err);
          }
        };
        let stdout = String::from_utf8(
          read(&stdout_path).with_context(|| format!("read {:#?}", stdout_path))?,
        )
        .context("decode stdout")?;
        let stderr = String::from_utf8(
          read(&stderr_path).with_context(|| format!("read {:#?}", stderr_path))?,
        )
        .context("decode stderr")?;
        Ok((wait_status, stdout, stderr))
      }
    }
  }

  #[test]
  fn it_lets_safe_commands_proceed() {
    fn exec_hook() -> ! {
      let err = Command::new("bash").args(["-c", "echo hello"]).exec();
      eprintln!("failed to exec: {err:#?}");
      unsafe { libc::_exit(1) };
    }

    let tmp_dir =
      TempDir::with_prefix("pid2sandbox-").expect("Failed to create temporary directory");
    assert_eq!(
      test_install_sandbox(exec_hook, tmp_dir.path()).expect("test_install_sandbox"),
      (0, "hello\n".to_string(), "".to_string())
    );
  }

  #[test]
  fn it_doesnt_leak_fds() {
    fn exec_hook() -> ! {
      let self_fds = read_dir("/proc/self/fd")
        .expect("read fds")
        .map(|res| res.map(|e| e.file_name()))
        .collect::<Result<Vec<_>, std::io::Error>>()
        .expect("get paths");
      let parent_fds = read_dir(format!("/proc/{}/fd", getppid()))
        .expect("read fds")
        .map(|res| res.map(|e| e.file_name()))
        .collect::<Result<Vec<_>, std::io::Error>>()
        .expect("get paths");
      let result = format!("parent={:?}\nself={:?}\n", parent_fds, self_fds);
      unsafe { libc::write(2, result.as_bytes().as_ptr() as *const c_void, result.len()) };
      unsafe { libc::_exit(0) };
    }

    let tmp_dir =
      TempDir::with_prefix("pid2sandbox-").expect("Failed to create temporary directory");
    // The parent should only contain stderr. The child should only contain the three stdio fds
    // plus a fourth fd: the one opening /proc/self/fd.
    assert_eq!(
      test_install_sandbox(exec_hook, tmp_dir.path()).expect("test_install_sandbox"),
      (
        0,
        "".to_string(),
        "parent=[\"2\"]\nself=[\"0\", \"1\", \"2\", \"3\"]\n".to_string()
      )
    );
  }

  #[test]
  fn it_prevents_modifying_dot_replit() {
    fn exec_hook() -> ! {
      std::fs::write("/home/runner/workspace/.replit", "yo").expect("write .replit");
      unsafe { libc::_exit(0) };
    }

    let tmp_dir =
      TempDir::with_prefix("pid2sandbox-").expect("Failed to create temporary directory");
    // Cargo captures the error message, but we only care about the exit code.
    let (exit_status, _, _) =
      test_install_sandbox(exec_hook, tmp_dir.path()).expect("test_install_sandbox");
    assert_eq!(exit_status, 254);
  }

  #[test]
  fn it_allows_modifying_dot_git_index_lock() {
    fn exec_hook() -> ! {
      std::fs::write("/home/runner/workspace/.git/index.lock", "yo")
        .expect("write .git/index.lock");
      unsafe { libc::_exit(0) };
    }

    let tmp_dir =
      TempDir::with_prefix("pid2sandbox-").expect("Failed to create temporary directory");
    // Cargo captures the error message, but we only care about the exit code.
    let (exit_status, _, _) =
      test_install_sandbox(exec_hook, tmp_dir.path()).expect("test_install_sandbox");
    assert_eq!(exit_status, 0);
  }
}
