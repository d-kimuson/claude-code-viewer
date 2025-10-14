import { type FSWatcher, watch } from "node:fs";
import z from "zod";
import { claudeProjectsDirPath } from "../paths";
import { eventBus } from "./EventBus";

const fileRegExp = /(?<projectId>.*?)\/(?<sessionId>.*?)\.jsonl/;
const fileRegExpGroupSchema = z.object({
  projectId: z.string(),
  sessionId: z.string(),
});

export class FileWatcherService {
  private isWatching = false;
  private watcher: FSWatcher | null = null;
  private projectWatchers: Map<string, FSWatcher> = new Map();

  public startWatching(): void {
    if (this.isWatching) return;
    this.isWatching = true;

    try {
      console.log("Starting file watcher on:", claudeProjectsDirPath);
      // メインプロジェクトディレクトリを監視
      this.watcher = watch(
        claudeProjectsDirPath,
        { persistent: false, recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          const groups = fileRegExpGroupSchema.safeParse(
            filename.match(fileRegExp)?.groups,
          );

          if (!groups.success) return;

          const { projectId, sessionId } = groups.data;

          if (eventType === "change") {
            // セッションファイルの中身が変更されている
            eventBus.emit("sessionChanged", {
              projectId,
              sessionId,
            });
          } else if (eventType === "rename") {
            // セッションファイルの追加/削除
            eventBus.emit("sessionListChanged", {
              projectId,
            });
          } else {
            eventType satisfies never;
          }
        },
      );
      console.log("File watcher initialization completed");
    } catch (error) {
      console.error("Failed to start file watching:", error);
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    for (const [, watcher] of this.projectWatchers) {
      watcher.close();
    }
    this.projectWatchers.clear();
  }
}

export const fileWatcher = new FileWatcherService();
