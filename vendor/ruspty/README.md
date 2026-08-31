# `@replit/ruspty` - PTY for JavaScript through Rust FFI

A very thin wrapper around PTYs and processes.

```ts
const { Pty } = require('@replit/ruspty');

const pty = new Pty({
  command: '/bin/sh',
  args: [],
  envs: {},
  size: { rows: 24, cols: 80 },
  onExit: (...result) => {
    // TODO: Handle process exit.
  },
});

const read = pty.read;
const write = pty.write;

read.on('data', (chunk) => {
  // TODO: Handle data.
});
write.write('echo hello\n');
```

## Local Development

- `npm install`
- `npm run build`
- `npm run test`

## Publishing

Following ["Publish It" section from `napi-rs` docs](https://napi.rs/docs/introduction/simple-package#publish-it):

1. `git clean -f && npm install && npm run build`
2. `npm version [major|minor|patch]`
3. Send that as a Pull Request to GitHub. Ensure that the commit message consisting **only** of `x.y.z` - this is how the CI decides to publish to `npm`!

Configure npm trusted publishing for `replit/ruspty` with the workflow filename `CI.yml` before merging a version bump PR. The publish job now uses GitHub OIDC, so `NPM_TOKEN` is no longer required.
