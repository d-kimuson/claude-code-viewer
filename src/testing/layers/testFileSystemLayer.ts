import { FileSystem } from "@effect/platform";
import { Option } from "effect";

export const testFileSystemLayer = (
  overrides?: Partial<FileSystem.FileSystem>,
) => {
  return FileSystem.layerNoop(overrides ?? {});
};

export const createFileInfo = (
  overrides: Partial<FileSystem.File.Info>,
): FileSystem.File.Info => ({
  type: "File",
  mtime: Option.some(new Date()),
  atime: Option.none(),
  birthtime: Option.none(),
  dev: 0,
  ino: Option.none(),
  mode: 0o755,
  nlink: Option.none(),
  uid: Option.none(),
  gid: Option.none(),
  rdev: Option.none(),
  size: FileSystem.Size(0n),
  blksize: Option.none(),
  blocks: Option.none(),
  ...overrides,
});
