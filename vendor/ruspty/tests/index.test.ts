import { Pty, getCloseOnExec, setCloseOnExec, Operation } from '../wrapper';
import { type Writable } from 'stream';
import { readdirSync, readlinkSync } from 'fs';
import { mkdir, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  type Mock,
  assert,
} from 'vitest';
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execAsync);

const EOT = '\x04';
const procSelfFd = '/proc/self/fd/';
const IS_DARWIN = process.platform === 'darwin';

const testSkipOnDarwin = IS_DARWIN ? test.skip : test;
const testOnlyOnDarwin = IS_DARWIN ? test : test.skip;

type FdRecord = Record<string, string>;
function getOpenFds(): FdRecord {
  const fds: FdRecord = {};
  if (process.platform !== 'linux') {
    return fds;
  }

  for (const filename of readdirSync(procSelfFd)) {
    try {
      const linkTarget = readlinkSync(procSelfFd + filename);
      if (
        linkTarget.startsWith('anon_inode:[') ||
        linkTarget.startsWith('socket:[') ||
        // node likes to asynchronously read stuff mid-test.
        linkTarget.includes('/ruspty/') ||
        linkTarget === '/dev/null'
      ) {
        continue;
      }

      fds[filename] = linkTarget;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        continue;
      }
      throw err;
    }
  }

  return fds;
}

describe('PTY', { repeats: 500 }, () => {
  test('spawns and exits', async () => {
    const oldFds = getOpenFds();
    const message = 'hello from a pty';
    let buffer = '';

    const onExit = vi.fn();
    const pty = new Pty({
      command: 'echo',
      args: [message],
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (chunk) => {
      buffer = chunk.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.trim()).toBe(message);
    expect(pty.write.writable).toBe(false);
    expect(pty.read.readable).toBe(false);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('captures an exit code', async () => {
    const oldFds = getOpenFds();
    const onExit = vi.fn();
    const pty = new Pty({
      command: 'sh',
      args: ['-c', 'exit 17'],
      onExit,
    });

    // set a pty reader so it can flow
    pty.read.on('data', () => {});

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 17);
    expect(getOpenFds()).toStrictEqual(oldFds);
  });

  test('can be written to', async () => {
    const oldFds = getOpenFds();
    const message = 'hello cat\n';
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'cat',
      onExit,
    });

    const writeStream = pty.write;
    const readStream = pty.read;

    readStream.on('data', (data) => {
      buffer += data.toString();
    });

    writeStream.write(message);
    writeStream.end(EOT);

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(pty.write.writable).toBe(false);

    let result = buffer.toString();
    if (IS_DARWIN) {
      // Darwin adds the visible EOT to the stream.
      result = result.replace('^D\b\b', '');
    }

    const expectedResult = 'hello cat\r\nhello cat\r\n';
    expect(result.trim()).toStrictEqual(expectedResult.trim());
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('can be started in non-interactive fashion', async () => {
    const oldFds = getOpenFds();
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'cat',
      interactive: false,
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer += data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);

    let result = buffer.toString();
    const expectedResult = '\r\n';
    expect(result.trim()).toStrictEqual(expectedResult.trim());
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('can be resized', async () => {
    const oldFds = getOpenFds();
    let buffer = '';
    let state: 'expectPrompt' | 'expectDone1' | 'expectDone2' | 'done' =
      'expectPrompt';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'sh',
      size: { rows: 24, cols: 80 },
      onExit,
    });

    const writeStream = pty.write;
    const readStream = pty.read;

    const statePromise = new Promise<void>((resolve) => {
      readStream.on('data', (data) => {
        buffer += data.toString();
        // If the test is running in a container with privileged access, the prompt is #
        if (
          state === 'expectPrompt' &&
          (buffer.endsWith('$ ') || buffer.endsWith('# '))
        ) {
          writeStream.write("stty size; echo 'done1'\n");
          state = 'expectDone1';
          return;
        }

        if (state === 'expectDone1' && buffer.includes('done1\r\n')) {
          state = 'expectDone2';
          expect(buffer).toContain('24 80');
          pty.resize({ rows: 60, cols: 100 });

          writeStream.write("stty size; echo 'done2'\n");
          return;
        }

        if (state === 'expectDone2' && buffer.includes('done2\r\n')) {
          expect(buffer).toContain('60 100');
          state = 'done';
          writeStream.write(EOT);
          resolve();
        }
      });
    });

    await statePromise;
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(state).toBe('done');
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('respects working directory', async () => {
    const oldFds = getOpenFds();
    const cwd = process.cwd();
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'pwd',
      dir: cwd,
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer += data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.trim()).toBe(cwd);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('respects env', async () => {
    const oldFds = getOpenFds();
    const message = 'hello from env';
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'sh',
      args: ['-c', 'echo $ENV_VARIABLE && exit'],
      envs: {
        ENV_VARIABLE: message,
      },
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer += data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.trim()).toBe(message);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test("resize after exit shouldn't throw", async () => {
    const onExit = vi.fn();
    const pty = new Pty({
      command: 'echo',
      args: ['hello'],
      onExit,
    });

    pty.read.on('data', () => {});

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(() => {
      pty.resize({ rows: 60, cols: 100 });
    }).not.toThrow();
  });

  test("resize after close shouldn't throw", async () => {
    const onExit = vi.fn();
    const pty = new Pty({
      command: 'sh',
      onExit,
    });

    pty.read.on('data', () => {});

    pty.close();
    expect(() => {
      pty.resize({ rows: 60, cols: 100 });
    }).not.toThrow();

    process.kill(pty.pid, 'SIGKILL');
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, -1);
    expect(pty.write.writable).toBe(false);
    expect(pty.read.readable).toBe(false);
  });

  test('ordering is correct', async () => {
    const oldFds = getOpenFds();
    let buffer = Buffer.from('');
    const n = 1024;
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'sh',
      args: ['-c', `seq 0 ${n}`],
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);

    const lines = buffer.toString().trim().split('\n');
    expect(lines.length).toBe(n + 1);
    for (let i = 0; i < n + 1; i++) {
      expect(
        Number(lines[i]),
        `expected line ${i} to contain ${i} but got ${lines[i]}`,
      ).toBe(i);
    }

    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('doesnt miss large output from fast commands', async () => {
    const payload = `hello`.repeat(4096);
    let buffer = Buffer.from('');
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'echo',
      args: ['-n', payload],
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.toString().length).toBe(payload.length);
  });

  test('doesnt miss lots of lines from bash', async () => {
    const payload = Array.from({ length: 5000 }, (_, i) => i).join('\n');
    let buffer = Buffer.from('');
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'bash',
      args: ['-c', `echo -n "${payload}"`],
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.toString().trim().replace(/\r/g, '').length).toBe(
      payload.length,
    );
  });

  testSkipOnDarwin('does not leak files', async () => {
    const oldFds = getOpenFds();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      const onExit = vi.fn();
      let buffer = Buffer.from('');

      const pty = new Pty({
        command: 'sh',
        args: ['-c', 'sleep 0.1 ; ls /proc/$$/fd'],
        onExit,
      });

      const readStream = pty.read;
      readStream.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
      });

      promises.push(
        vi
          .waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
          .then(() => {
            expect(onExit).toHaveBeenCalledWith(null, 0);
            expect(
              buffer
                .toString()
                .trim()
                .split(/\s+/)
                .filter((fd) => {
                  // Some shells dup stdio to fd 255 for reasons.
                  return fd !== '255';
                })
                .toSorted(),
            ).toStrictEqual(['0', '1', '2']);
          }),
      );
    }

    await Promise.all(promises);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('can run concurrent shells', async () => {
    const oldFds = getOpenFds();
    const writeStreams: Array<Writable> = [];
    const buffers: Array<Buffer> = [];
    const onExits: Array<Mock> = [];
    const expectedResult = 'hello cat\r\nhello cat\r\n';

    // Create 10 concurrent shells
    for (let i = 0; i < 10; i++) {
      const onExit = vi.fn();
      onExits.push(onExit);
      buffers[i] = Buffer.from('');

      const pty = new Pty({
        command: 'cat',
        onExit,
      });

      const readStream = pty.read;
      readStream.on('data', (data) => {
        buffers[i] = Buffer.concat([buffers[i], data]);
      });

      writeStreams.push(pty.write);
      pty.write.write('hello cat\n');
    }

    // Wait for initial output
    await vi.waitFor(() =>
      buffers.every((buffer) => buffer.toString().includes('hello cat\r\n')),
    );

    // Send EOT to all shells
    for (const writeStream of writeStreams) {
      writeStream.end(EOT);
    }

    // Wait for all shells to exit
    await Promise.all(
      onExits.map((onExit) =>
        vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1)),
      ),
    );

    // Verify results
    for (let i = 0; i < 10; i++) {
      expect(onExits[i]).toHaveBeenCalledWith(null, 0);
      let result = buffers[i].toString();
      if (IS_DARWIN) {
        result = result.replace('^D\b\b', '');
      }
      expect(result).toStrictEqual(expectedResult);
    }

    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test("doesn't break when executing non-existing binary", async () => {
    const oldFds = getOpenFds();

    await expect(async () => {
      new Pty({
        command: 'this-does-not-exist',
        onExit: () => {},
      });
    }).rejects.toThrow('No such file or directory');

    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('cannot be written to after closing', async () => {
    const oldFds = getOpenFds();
    const onExit = vi.fn();
    const pty = new Pty({
      command: 'echo',
      args: ['hello'],
      onExit,
    });

    const readStream = pty.read;
    const writeStream = pty.write;

    readStream.on('data', () => {});

    pty.close();

    assert(!writeStream.writable);
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    let receivedError = false;
    writeStream.write('hello2', (error) => {
      if (error) {
        receivedError = true;
      }
    });
    await vi.waitFor(() => receivedError);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  test('cannot resize when out of range', async () => {
    const oldFds = getOpenFds();

    const onExit = vi.fn();
    const pty = new Pty({
      command: 'sh',
      size: { rows: 24, cols: 80 },
      onExit,
    });

    pty.read.on('data', () => {});

    expect(() => pty.resize({ rows: 1, cols: -1 })).toThrow(RangeError);
    expect(() => pty.resize({ rows: 1, cols: -1 })).toThrow(
      /Size \(1x-1\) out of range/,
    );

    expect(() => pty.resize({ rows: 1, cols: 99999 })).toThrow(RangeError);
    expect(() => pty.resize({ rows: 1, cols: 99999 })).toThrow(
      /Size \(1x99999\) out of range/,
    );

    expect(() => pty.resize({ rows: -1, cols: 1 })).toThrow(RangeError);
    expect(() => pty.resize({ rows: -1, cols: 1 })).toThrow(
      /Size \(-1x1\) out of range/,
    );

    expect(() => pty.resize({ rows: 99999, cols: 1 })).toThrow(RangeError);
    expect(() => pty.resize({ rows: 99999, cols: 1 })).toThrow(
      /Size \(99999x1\) out of range/,
    );

    process.kill(pty.pid, 'SIGKILL');

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, -1);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });
});

type CgroupState =
  | {
      version: 'v1';
      sliceDir: string; // Full path for v1 group using primary subsystem (e.g., "/sys/fs/cgroup/cpu/ruspty-xyz")
      originalCgroup?: string; // Path within each hierarchy (e.g., "/user.slice")
      sliceName: string; // Base name for the group
      moved: boolean;
      v1Subsystems: string[]; // List of subsystems to manage (e.g., ['cpu', 'memory'])
    }
  | {
      version: 'v2';
      sliceDir: string; // Full path to the slice dir (e.g., "/sys/fs/cgroup/test.slice")
      originalCgroup?: string; // Full path to original cgroup dir
      sliceName: string; // The slice file name
      moved: boolean;
    };

async function detectCgroupVersion(): Promise<'v1' | 'v2'> {
  const cgroupRaw = (await exec('grep cgroup /proc/filesystems')).stdout.trim();
  if (cgroupRaw.includes('cgroup2')) {
    return 'v2';
  }
  return 'v1';
}

async function getCgroupState(): Promise<CgroupState> {
  const version = await detectCgroupVersion();
  const CG_ROOT = '/sys/fs/cgroup';
  const sliceBaseName = `ruspty-${Math.random().toString(36).substring(2, 15)}`;

  if (version === 'v2') {
    const sliceName = `${sliceBaseName}.scope`;
    const sliceDir = join(CG_ROOT, sliceName);
    // cgroup v2 raw format: 0::/test-cgroup/test-cgroup-nested
    const cgroupRaw = (await exec(`cat /proc/self/cgroup`)).stdout.trim();
    const cgroupPath = cgroupRaw.split(':').pop() || '';
    const originalCgroup = join(CG_ROOT, cgroupPath.replace(/^\//, ''));

    return {
      version,
      sliceDir,
      originalCgroup,
      sliceName,
      moved: false,
    };
  } else {
    // Determine available subsystems to manage (common ones like cpu, memory)
    const availableSubsystems = readdirSync(CG_ROOT);
    const v1Subsystems = ['cpu', 'memory'].filter((sub) =>
      availableSubsystems.includes(sub),
    );
    let originalCgroup = '/';
    // cgroup v1 raw format: 0:cpu:/user.slice/user-1000.slice/session-c1.scope
    const cgroupRaw = (await exec(`cat /proc/self/cgroup`)).stdout.trim();
    const memoryLine = cgroupRaw
      .split('\n')
      .find((line) => line.includes(':memory:'));
    const cpuLine = cgroupRaw
      .split('\n')
      .find((line) => line.includes(':cpu:'));
    if (memoryLine) {
      originalCgroup = memoryLine.split(':').pop() || '/';
    } else if (cpuLine) {
      originalCgroup = cpuLine.split(':').pop() || '/';
    }

    return {
      version,
      sliceDir: `/sys/fs/cgroup/${v1Subsystems[0]}/${sliceBaseName}`,
      originalCgroup, // Path relative to subsystem root
      sliceName: sliceBaseName, // Base name
      moved: false,
      v1Subsystems,
    };
  }
}

async function cgroupInit(cgroupState: CgroupState) {
  if (cgroupState.version === 'v2') {
    // create the slice - this is the cgroup that will be used for testing
    await exec(`sudo mkdir -p ${cgroupState.sliceDir}`);
    await exec(`sudo chown -R $(id -u):$(id -g) ${cgroupState.sliceDir}`);

    // add the current process to the slice
    // so the spawned pty inherits the slice
    await exec(
      `echo ${process.pid} | sudo tee ${cgroupState.sliceDir}/cgroup.procs`,
    );
    cgroupState.moved = true;
  } else {
    // cgroup v1 logic
    if (!cgroupState.v1Subsystems || cgroupState.v1Subsystems.length === 0) {
      throw new Error('No cgroup v1 subsystems found or specified.');
    }
    const subsystems = cgroupState.v1Subsystems.join(',');
    const groupPath = `/${cgroupState.sliceName}`;
    await exec(`sudo cgcreate -g ${subsystems}:${groupPath}`);
    // Move the current process into the new cgroup for all specified hierarchies
    // This ensures the child process inherits it.
    await exec(`sudo cgclassify -g ${subsystems}:${groupPath} ${process.pid}`);
    cgroupState.moved = true;
  }
}

async function cgroupCleanup(cgroupState: CgroupState) {
  if (cgroupState.version === 'v2') {
    // remove the current process from the test slice and return it to its original cgroup
    if (cgroupState.moved && cgroupState.originalCgroup) {
      await exec(
        `echo ${process.pid} | sudo tee ${cgroupState.originalCgroup}/cgroup.procs`,
      );
    }
    await exec(`sudo rmdir ${cgroupState.sliceDir}`);
  } else {
    if (!cgroupState.v1Subsystems || cgroupState.v1Subsystems.length === 0) {
      // Nothing to clean up if no subsystems were managed
      return;
    }
    const subsystems = cgroupState.v1Subsystems.join(',');
    const groupPath = `/${cgroupState.sliceName}`;
    // Move the current process back to its original group before deleting the test group.
    // We determined originalCgroup path relative to subsystem root earlier.
    if (cgroupState.moved && cgroupState.originalCgroup) {
      try {
        // cgclassify might fail if the original group was removed or perms changed.
        await exec(
          `sudo cgclassify -g ${subsystems}:${cgroupState.originalCgroup} ${process.pid}`,
        );
      } catch (e) {
        console.warn(
          `Failed to move process ${process.pid} back to original cgroup v1 '${cgroupState.originalCgroup}'.`,
          e,
        );
        // Attempt to move to root as a fallback, might fail too.
        try {
          await exec(`sudo cgclassify -g ${subsystems}:/ ${process.pid}`);
        } catch {}
      }
    }

    await exec(`sudo cgdelete -g ${subsystems}:${groupPath}`);
  }
}

describe('cgroup opts', async () => {
  let cgroupState: CgroupState | null = null;
  beforeEach(async () => {
    if (IS_DARWIN) {
      return;
    }

    cgroupState = await getCgroupState();
    await cgroupInit(cgroupState);

    return async () => {
      if (cgroupState) {
        await cgroupCleanup(cgroupState);
      }
    };
  });

  testSkipOnDarwin('basic cgroup', async () => {
    if (cgroupState === null) {
      return;
    }

    const oldFds = getOpenFds();
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'cat',
      args: ['/proc/self/cgroup'],
      cgroupPath: cgroupState.sliceDir,
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    // Verify that the process was placed in the correct cgroup by
    // checking its output contains our unique slice name
    expect(buffer).toContain(cgroupState.sliceName);
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  testOnlyOnDarwin('cgroup is not supported on darwin', async () => {
    expect(() => {
      new Pty({
        command: 'cat',
        args: ['/proc/self/cgroup'],
        cgroupPath: '/sys/fs/cgroup/test.slice',
        onExit: vi.fn(),
      });
    }).toThrowError();
  });
});

describe('sandbox opts', { repeats: 10 }, async () => {
  let tempDirPath = '/inexistent/path/before';
  let cgroupState: CgroupState | null;
  beforeEach(async () => {
    if (IS_DARWIN) {
      return;
    }

    cgroupState = await getCgroupState();
    await cgroupInit(cgroupState);
    tempDirPath = await mkdtemp(join(tmpdir(), 'ruspty-'));

    return async () => {
      if (cgroupState) {
        await cgroupCleanup(cgroupState);
      }

      if (tempDirPath !== '/inexistent/path/before') {
        await rm(tempDirPath, { recursive: true });
        tempDirPath = '/inexistent/path/after';
      }
    };
  });

  testSkipOnDarwin('basic sandbox', async () => {
    if (cgroupState === null) {
      return;
    }

    const oldFds = getOpenFds();
    let buffer = '';
    const onExit = vi.fn();

    const pty = new Pty({
      command: 'sh',
      args: ['-c', 'echo hello'],
      cgroupPath: cgroupState.sliceDir,
      sandbox: {
        rules: [
          {
            operation: Operation.Modify,
            prefixes: [tempDirPath],
            message: 'Tried to modify a forbidden path',
          },
          {
            operation: Operation.Delete,
            prefixes: [tempDirPath],
            message: 'Tried to delete a forbidden path',
          },
        ],
      },
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer).toContain('hello');
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  testSkipOnDarwin('basic protection against git-yeetage', async () => {
    if (cgroupState === null) {
      return;
    }

    const oldFds = getOpenFds();
    let buffer = '';
    const onExit = vi.fn();

    const gitPath = `${tempDirPath}/.git`;
    await mkdir(gitPath);
    const pty = new Pty({
      command: 'sh',
      args: ['-c', `sh -c "rm -rf ${gitPath}"`],
      cgroupPath: cgroupState.sliceDir,
      sandbox: {
        rules: [
          {
            operation: Operation.Delete,
            prefixes: [gitPath],
            message: 'Tried to delete a forbidden path',
          },
        ],
      },
      envs: process.env.PATH
        ? {
            PATH: process.env.PATH,
          }
        : {},
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 254);
    expect(buffer.trimEnd()).toBe(
      `Tried to delete a forbidden path: ${gitPath}`,
    );
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });

  testSkipOnDarwin('can exclude prefixes', async () => {
    if (cgroupState === null) {
      return;
    }

    const oldFds = getOpenFds();
    let buffer = '';
    const onExit = vi.fn();

    const gitPath = `${tempDirPath}/.git`;
    await mkdir(gitPath);
    const indexLockPath = `${gitPath}/index.lock`;
    await writeFile(indexLockPath, 'locked');
    const pty = new Pty({
      command: 'sh',
      args: ['-c', `sh -c "rm -f ${indexLockPath}"`],
      cgroupPath: cgroupState.sliceDir,
      sandbox: {
        rules: [
          {
            operation: Operation.Delete,
            prefixes: [gitPath],
            excludePrefixes: [indexLockPath],
            message: 'Tried to delete a forbidden path',
          },
        ],
      },
      envs: process.env.PATH
        ? {
            PATH: process.env.PATH,
          }
        : {},
      onExit,
    });

    const readStream = pty.read;
    readStream.on('data', (data) => {
      buffer = data.toString();
    });

    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledWith(null, 0);
    expect(buffer.trimEnd()).toBe('');
    await vi.waitFor(() => expect(getOpenFds()).toStrictEqual(oldFds));
  });
});

describe('setCloseOnExec', () => {
  test('setCloseOnExec', () => {
    // stdio typically never has the close-on-exec flag since it's always expected to be
    // inheritable. But just to be safe, we'll keep it as it was when started.
    const originalFlag = getCloseOnExec(0);

    for (const closeOnExec of [true, false]) {
      setCloseOnExec(0, closeOnExec);
      expect(getCloseOnExec(0)).toBe(closeOnExec);
    }

    setCloseOnExec(0, originalFlag);
  });
});
