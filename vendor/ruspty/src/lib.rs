use std::collections::HashMap;
use std::fs::{write, File};
use std::io::ErrorKind;
use std::io::{Error, Write};
use std::os::fd::{AsRawFd, OwnedFd};
use std::os::fd::{FromRawFd, IntoRawFd, RawFd};
use std::os::unix::process::CommandExt;
use std::process::{Command, Stdio};
use std::thread;

use napi::bindgen_prelude::{Buffer, JsFunction};
use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi::Status::GenericFailure;
use napi::{self, Env};
use nix::errno::Errno;
use nix::fcntl::{fcntl, FcntlArg, FdFlag, OFlag};
use nix::libc::{self, c_int, TIOCSCTTY, TIOCSWINSZ};
use nix::pty::{openpty, Winsize};
use nix::sys::termios::{self, SetArg};

#[macro_use]
extern crate napi_derive;

// The sandbox module uses x86_64 ptrace register layouts (rdi/rsi/rdx/orig_rax)
// that don't exist on aarch64; it has never been ported to other architectures.
#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
mod sandbox;

#[napi]
#[allow(dead_code)]
struct Pty {
  controller_fd: Option<OwnedFd>,
  user_fd: Option<OwnedFd>,
  /// The pid of the forked process.
  pub pid: u32,
}

#[napi(string_enum)]
pub enum Operation {
  Modify,
  Delete,
}

/// Sandboxing rules. Deleting / modifying a path with any of the prefixes is forbidden and will
/// cause process termination.
#[napi(object)]
pub struct SandboxRule {
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
#[napi(object)]
pub struct SandboxOptions {
  pub rules: Vec<SandboxRule>,
}

/// The options that can be passed to the constructor of Pty.
#[napi(object)]
struct PtyOptions {
  pub command: String,
  pub args: Option<Vec<String>>,
  pub envs: Option<HashMap<String, String>>,
  pub dir: Option<String>,
  pub size: Option<Size>,
  pub cgroup_path: Option<String>,
  pub new_cgroup_namespace: Option<bool>,
  pub apparmor_profile: Option<String>,
  pub interactive: Option<bool>,
  pub sandbox: Option<SandboxOptions>,
  #[napi(ts_type = "(err: null | Error, exitCode: number) => void")]
  pub on_exit: JsFunction,
}

/// A size struct to pass to resize.
#[napi(object)]
struct Size {
  pub cols: u16,
  pub rows: u16,
}

#[napi]
pub const MAX_U16_VALUE: u16 = u16::MAX;
#[napi]
pub const MIN_U16_VALUE: u16 = u16::MIN;

const SYNTHETIC_EOF: &[u8] = b"\x1B]7878\x1B\\";

#[napi]
pub fn get_synthetic_eof_sequence() -> Buffer {
  SYNTHETIC_EOF.into()
}

fn cast_to_napi_error(err: Errno) -> napi::Error {
  napi::Error::new(GenericFailure, err)
}

#[napi]
impl Pty {
  #[napi(constructor)]
  #[allow(dead_code)]
  pub fn new(_env: Env, opts: PtyOptions) -> Result<Self, napi::Error> {
    #[cfg(not(target_os = "linux"))]
    if opts.cgroup_path.is_some() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "cgroup_path is only supported on Linux",
      ));
    }

    #[cfg(not(target_os = "linux"))]
    if opts.sandbox.is_some() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "sandbox is only supported on Linux",
      ));
    }

    #[cfg(all(target_os = "linux", not(target_arch = "x86_64")))]
    if opts.sandbox.is_some() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "sandbox is only supported on Linux x86_64",
      ));
    }

    #[cfg(not(target_os = "linux"))]
    if opts.apparmor_profile.is_some() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "apparmor is only supported on Linux",
      ));
    }

    #[cfg(not(target_os = "linux"))]
    if opts.new_cgroup_namespace.unwrap_or(false) {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "new_cgroup_namespace is only supported on Linux",
      ));
    }

    #[cfg(target_os = "linux")]
    if opts.new_cgroup_namespace.unwrap_or(false) && opts.cgroup_path.is_none() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "cannot enable new_cgroup_namespace without cgroup_path",
      ));
    }

    #[cfg(target_os = "linux")]
    if opts.sandbox.is_some() && opts.cgroup_path.is_none() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "cannot enable sandbox without cgroup",
      ));
    }

    let size = opts.size.unwrap_or(Size { cols: 80, rows: 24 });
    let window_size = Winsize {
      ws_col: size.cols,
      ws_row: size.rows,
      ws_xpixel: 0,
      ws_ypixel: 0,
    };

    let mut cmd = Command::new(opts.command);
    if let Some(args) = opts.args {
      cmd.args(args);
    }

    // open pty pair, and set close-on-exec to avoid unwanted copies of the FDs from finding their
    // way into subprocesses. Also set the nonblocking flag to avoid Node from consuming a full I/O
    // thread for this.
    let pty_res = openpty(&window_size, None).map_err(cast_to_napi_error)?;
    let controller_fd = pty_res.master;
    let user_fd = pty_res.slave;
    set_close_on_exec(controller_fd.as_raw_fd(), true)?;
    set_close_on_exec(user_fd.as_raw_fd(), true)?;
    set_nonblocking(controller_fd.as_raw_fd())?;

    // duplicate pty user_fd to be the child's stdin, stdout, and stderr
    if opts.interactive.unwrap_or(true) {
      cmd.stdin(Stdio::from(user_fd.try_clone()?));
    } else {
      cmd.stdin(Stdio::null());
    }
    cmd.stderr(Stdio::from(user_fd.try_clone()?));
    cmd.stdout(Stdio::from(user_fd.try_clone()?));

    // we want the env to be clean, we can always pass in `process.env` if we want to.
    cmd.env_clear();
    if let Some(envs) = opts.envs {
      cmd.envs(envs);
    }

    // set working dir if applicable
    if let Some(dir) = opts.dir {
      cmd.current_dir(dir);
    }

    let raw_user_fd = user_fd.as_raw_fd();
    let raw_controller_fd = controller_fd.as_raw_fd();
    unsafe {
      // right before we spawn the child, we should do a bunch of setup
      // this is all run in the context of the child process
      cmd.pre_exec(move || {
        // set the cgroup if specified
        #[cfg(target_os = "linux")]
        if let Some(cgroup_path) = &opts.cgroup_path {
          let pid = libc::getpid();
          let cgroup_procs = format!("{}/cgroup.procs", cgroup_path);
          let mut cgroup_file = File::create(cgroup_procs)?;
          cgroup_file.write_all(format!("{}", pid).as_bytes())?;

          // Unshare the cgroup namespace, rooting it at the scope we just joined.
          // This prevents the child from seeing or writing to any cgroup outside its own subtree.
          if opts.new_cgroup_namespace.unwrap_or(false) {
            let ret = libc::unshare(libc::CLONE_NEWCGROUP);
            if ret != 0 {
              return Err(Error::last_os_error());
            }
          }

          // also set the sandbox if specified. It's important for it to be in a cgroup so that we don't
          // accidentally leak processes if something went wrong.
          #[cfg(target_arch = "x86_64")]
          if let Some(sandbox_opts) = &opts.sandbox {
            if let Err(err) = sandbox::install_sandbox(sandbox::Options {
              rules: sandbox_opts
                .rules
                .iter()
                .map(|rule| sandbox::Rule {
                  operation: match rule.operation {
                    Operation::Modify => sandbox::Operation::Modify,
                    Operation::Delete => sandbox::Operation::Delete,
                  },
                  prefixes: rule.prefixes.clone(),
                  exclude_prefixes: rule.exclude_prefixes.clone(),
                  message: rule.message.clone(),
                })
                .collect(),
            }) {
              return Err(Error::new(
                ErrorKind::Other,
                format!("install_sandbox: {:#?}", err),
              ));
            }
          }
        }

        // start a new session
        let err = libc::setsid();
        if err == -1 {
          return Err(Error::new(ErrorKind::Other, "setsid"));
        }

        // become the controlling tty for the program.
        // Note that TIOCSCTTY is not the same size in all platforms.
        #[allow(clippy::useless_conversion)]
        let err = libc::ioctl(raw_user_fd, TIOCSCTTY.into(), 0);
        if err == -1 {
          return Err(Error::new(ErrorKind::Other, "ioctl-TIOCSCTTY"));
        }

        // we need to drop the controller fd, since we don't need it in the child
        // and it's not safe to keep it open
        libc::close(raw_controller_fd);

        // just to be safe, mark every single file descriptor as close-on-exec.
        // needs to use the raw syscall to avoid dependencies on newer versions of glibc.
        #[cfg(target_os = "linux")]
        libc::syscall(
          libc::SYS_close_range,
          3,
          libc::c_uint::MAX,
          libc::CLOSE_RANGE_CLOEXEC as c_int,
        );

        // Set the AppArmor profile.
        #[cfg(target_os = "linux")]
        if let Some(apparmor_profile) = &opts.apparmor_profile {
          // TODO: Make this fail once we're sure we're never going back.
          let _ = write(
            "/proc/self/attr/apparmor/exec",
            format!("exec {apparmor_profile}"),
          );
        }

        // set input modes
        let user_fd = OwnedFd::from_raw_fd(raw_user_fd);
        if let Ok(mut termios) = termios::tcgetattr(&user_fd) {
          termios.input_flags |= termios::InputFlags::IUTF8;
          termios::tcsetattr(&user_fd, SetArg::TCSANOW, &termios)?;
        }

        // reset signal handlers
        libc::signal(libc::SIGCHLD, libc::SIG_DFL);
        libc::signal(libc::SIGHUP, libc::SIG_DFL);
        libc::signal(libc::SIGINT, libc::SIG_DFL);
        libc::signal(libc::SIGQUIT, libc::SIG_DFL);
        libc::signal(libc::SIGTERM, libc::SIG_DFL);
        libc::signal(libc::SIGALRM, libc::SIG_DFL);

        Ok(())
      });
    }

    // actually spawn the child
    let mut child = cmd.spawn()?;
    let pid = child.id();

    // We're creating a new thread for every child, this uses a bit more system resources compared
    // to alternatives (below), trading off simplicity of implementation.
    //
    // The alternatives:
    // - Mandate that every single `wait` goes through a central process-wide loop that knows
    //   about all processes (this is what `pid1` does), but needs a bit of care and some static
    //   analysis to ensure that every single call goes through the wrapper to avoid double `wait`'s
    //   on a child.
    // - Have a single thread loop where other entities can register children (by sending the pid
    //   over a channel) and this loop can use `poll` to listen for each child's `pidfd` for when
    //   they are ready to be `wait`'ed. This has the inconvenience that it consumes one FD per child.
    //
    // For discussion check out: https://github.com/replit/ruspty/pull/1#discussion_r1463672548
    let ts_on_exit: ThreadsafeFunction<i32, ErrorStrategy::CalleeHandled> = opts
      .on_exit
      .create_threadsafe_function(0, |ctx| ctx.env.create_int32(ctx.value).map(|v| vec![v]))?;

    thread::spawn(move || {
      let wait_result = child.wait();

      // by this point, child has closed its copy of the user_fd
      // lets inject our synthetic EOF OSC into the user_fd
      // its ok to ignore the result here as we have a timeout on the nodejs side to handle if this write fails
      let _ = write_syn_eof_to_fd(raw_user_fd);

      match wait_result {
        Ok(status) => {
          if status.success() {
            ts_on_exit.call(Ok(0), ThreadsafeFunctionCallMode::Blocking);
          } else {
            ts_on_exit.call(
              Ok(status.code().unwrap_or(-1)),
              ThreadsafeFunctionCallMode::Blocking,
            );
          }
        }
        Err(err) => {
          ts_on_exit.call(
            Err(napi::Error::new(
              GenericFailure,
              format!(
                "OS error when waiting for child process to exit: {}",
                err.raw_os_error().unwrap_or(-1)
              ),
            )),
            ThreadsafeFunctionCallMode::Blocking,
          );
        }
      }
    });

    Ok(Pty {
      controller_fd: Some(controller_fd),
      user_fd: Some(user_fd),
      pid,
    })
  }

  /// Transfers ownership of the file descriptor for the PTY controller. This can only be called
  /// once (it will error the second time). The caller is responsible for closing the file
  /// descriptor.
  #[napi]
  #[allow(dead_code)]
  pub fn take_controller_fd(&mut self) -> Result<c_int, napi::Error> {
    if let Some(fd) = self.controller_fd.take() {
      Ok(fd.into_raw_fd())
    } else {
      Err(napi::Error::new(
        napi::Status::GenericFailure,
        "fd failed: bad file descriptor (os error 9)",
      ))
    }
  }

  /// Closes the owned file descriptor for the PTY controller. The Nodejs side must call this
  /// when it is done with the file descriptor to avoid leaking FDs.
  #[napi]
  #[allow(dead_code)]
  pub fn drop_user_fd(&mut self) -> Result<(), napi::Error> {
    self.user_fd.take();
    Ok(())
  }
}

/// Resize the terminal.
#[napi]
#[allow(dead_code)]
fn pty_resize(fd: i32, size: Size) -> Result<(), napi::Error> {
  let window_size = Winsize {
    ws_col: size.cols,
    ws_row: size.rows,
    ws_xpixel: 0,
    ws_ypixel: 0,
  };

  let res = unsafe { libc::ioctl(fd, TIOCSWINSZ, &window_size as *const _) };
  if res == -1 {
    return Err(napi::Error::new(
      napi::Status::GenericFailure,
      format!("ioctl TIOCSWINSZ failed: {}", Error::last_os_error()),
    ));
  }

  Ok(())
}

/// Set the close-on-exec flag on a file descriptor. This is `fcntl(fd, F_SETFD, FD_CLOEXEC)` under
/// the covers.
#[napi]
#[allow(dead_code)]
fn set_close_on_exec(fd: i32, close_on_exec: bool) -> Result<(), napi::Error> {
  let old_flags = match fcntl(fd as RawFd, FcntlArg::F_GETFD) {
    Ok(flags) => FdFlag::from_bits_truncate(flags),
    Err(err) => {
      return Err(napi::Error::new(
        GenericFailure,
        format!("fcntl F_GETFD: {}", err,),
      ));
    }
  };
  let mut new_flags = old_flags;
  new_flags.set(FdFlag::FD_CLOEXEC, close_on_exec);
  if old_flags == new_flags {
    // It's already in the correct state!
    return Ok(());
  }

  if let Err(err) = fcntl(fd as RawFd, FcntlArg::F_SETFD(new_flags)) {
    return Err(napi::Error::new(
      GenericFailure,
      format!("fcntl F_SETFD: {}", err,),
    ));
  };

  Ok(())
}

/// Get the close-on-exec flag on a file descriptor. This is `fcntl(fd, F_GETFD) & FD_CLOEXEC ==
///_CLOEXEC` under the covers.
#[napi]
#[allow(dead_code)]
fn get_close_on_exec(fd: i32) -> Result<bool, napi::Error> {
  match fcntl(fd as RawFd, FcntlArg::F_GETFD) {
    Ok(flags) => Ok(FdFlag::from_bits_truncate(flags).contains(FdFlag::FD_CLOEXEC)),
    Err(err) => Err(napi::Error::new(
      GenericFailure,
      format!("fcntl F_GETFD: {}", err,),
    )),
  }
}

/// Set the file descriptor to be non-blocking.
#[allow(dead_code)]
fn set_nonblocking(fd: i32) -> Result<(), napi::Error> {
  let old_flags = match fcntl(fd, FcntlArg::F_GETFL) {
    Ok(flags) => OFlag::from_bits_truncate(flags),
    Err(err) => {
      return Err(napi::Error::new(
        GenericFailure,
        format!("fcntl F_GETFL: {}", err),
      ));
    }
  };

  let mut new_flags = old_flags;
  new_flags.set(OFlag::O_NONBLOCK, true);
  if old_flags != new_flags {
    if let Err(err) = fcntl(fd, FcntlArg::F_SETFL(new_flags)) {
      return Err(napi::Error::new(
        GenericFailure,
        format!("fcntl F_SETFL: {}", err),
      ));
    }
  }
  Ok(())
}

fn write_syn_eof_to_fd(fd: libc::c_int) -> std::io::Result<()> {
  let mut remaining = SYNTHETIC_EOF;
  while !remaining.is_empty() {
    match unsafe {
      libc::write(
        fd,
        remaining.as_ptr() as *const libc::c_void,
        remaining.len(),
      )
    } {
      -1 => {
        let err = std::io::Error::last_os_error();
        if err.kind() == std::io::ErrorKind::Interrupted {
          continue;
        }

        return Err(err);
      }
      0 => {
        return Err(std::io::Error::new(
          std::io::ErrorKind::WriteZero,
          "write returned 0",
        ));
      }
      n => {
        remaining = &remaining[n as usize..];
      }
    }
  }
  Ok(())
}
