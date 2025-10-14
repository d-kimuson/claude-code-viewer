import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { claudeCodeViewerCacheDirPath } from "../../service/paths";

const saveSchema = z.array(z.tuple([z.string(), z.unknown()]));

export class FileCacheStorage<const T> {
  private storage = new Map<string, T>();

  private constructor(private readonly key: string) {}

  public static load<const LoadSchema>(
    key: string,
    schema: z.ZodType<LoadSchema>,
  ) {
    const instance = new FileCacheStorage<LoadSchema>(key);

    if (!existsSync(claudeCodeViewerCacheDirPath)) {
      mkdirSync(claudeCodeViewerCacheDirPath, { recursive: true });
    }

    if (!existsSync(instance.cacheFilePath)) {
      writeFileSync(instance.cacheFilePath, "[]");
    } else {
      const content = readFileSync(instance.cacheFilePath, "utf-8");
      const parsed = saveSchema.safeParse(JSON.parse(content));

      if (!parsed.success) {
        writeFileSync(instance.cacheFilePath, "[]");
      } else {
        for (const [key, value] of parsed.data) {
          const parsedValue = schema.safeParse(value);
          if (!parsedValue.success) {
            continue;
          }

          instance.storage.set(key, parsedValue.data);
        }
      }
    }

    return instance;
  }

  private get cacheFilePath() {
    return resolve(claudeCodeViewerCacheDirPath, `${this.key}.json`);
  }

  private asSaveFormat() {
    return JSON.stringify(Array.from(this.storage.entries()));
  }

  private async syncToFile() {
    await writeFile(this.cacheFilePath, this.asSaveFormat());
  }

  public get(key: string) {
    return this.storage.get(key);
  }

  public save(key: string, value: T) {
    const previous = this.asSaveFormat();
    this.storage.set(key, value);

    if (previous === this.asSaveFormat()) {
      return;
    }

    void this.syncToFile();
  }

  public invalidate(key: string) {
    if (!this.storage.has(key)) {
      return;
    }

    this.storage.delete(key);
    void this.syncToFile();
  }
}
