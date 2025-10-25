import { Effect, Layer, Ref } from "effect";
import { z } from "zod";
import { testFileSystemLayer } from "../../../testing/layers/testFileSystemLayer";
import { testPersistentServiceLayer } from "../../../testing/layers/testPersistentServiceLayer";
import { FileCacheStorage, makeFileCacheStorageLayer } from "./index";

// Schema for testing
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

describe("FileCacheStorage", () => {
  describe("basic operations", () => {
    it("can save and retrieve data with set and get", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // Save data
        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
        });

        // Retrieve data
        const user = yield* cache.get("user-1");
        return user;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(testPersistentServiceLayer()),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      expect(result).toEqual({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      });
    });

    it("returns undefined when retrieving non-existent key", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();
        return yield* cache.get("non-existent");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(testPersistentServiceLayer()),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      expect(result).toBeUndefined();
    });

    it("can delete data with invalidate", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // Save data
        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
        });

        // Delete data
        yield* cache.invalidate("user-1");

        // Returns undefined after deletion
        return yield* cache.get("user-1");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(testPersistentServiceLayer()),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      expect(result).toBeUndefined();
    });

    it("getAll ですべてのデータを取得できる", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // 複数のデータを保存
        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
        });
        yield* cache.set("user-2", {
          id: "user-2",
          name: "Bob",
          email: "bob@example.com",
        });

        // すべてのデータを取得
        return yield* cache.getAll();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(testPersistentServiceLayer()),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      expect(result.size).toBe(2);
      expect(result.get("user-1")).toEqual({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      });
      expect(result.get("user-2")).toEqual({
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
      });
    });
  });

  describe("永続化データの読み込み", () => {
    it("初期化時に永続化データを読み込む", async () => {
      // 永続化データを返すモック
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();
        return yield* cache.getAll();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  savedEntries: [
                    [
                      "user-1",
                      {
                        id: "user-1",
                        name: "Alice",
                        email: "alice@example.com",
                      },
                    ],
                    [
                      "user-2",
                      {
                        id: "user-2",
                        name: "Bob",
                        email: "bob@example.com",
                      },
                    ],
                  ],
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      expect(result.size).toBe(2);
      expect(result.get("user-1")?.name).toBe("Alice");
      expect(result.get("user-2")?.name).toBe("Bob");
    });

    it("スキーマバリデーションに失敗したデータは無視される", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();
        return yield* cache.getAll();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  savedEntries: [
                    [
                      "user-1",
                      {
                        id: "user-1",
                        name: "Alice",
                        email: "alice@example.com",
                      },
                    ],
                    [
                      "user-invalid",
                      {
                        id: "invalid",
                        name: "Invalid",
                        // email が無い（バリデーションエラー）
                      },
                    ],
                    [
                      "user-2",
                      {
                        id: "user-2",
                        name: "Bob",
                        email: "invalid-email", // 不正なメールアドレス
                      },
                    ],
                  ],
                }),
              ),

              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      // 有効なデータのみ読み込まれる
      expect(result.size).toBe(1);
      expect(result.get("user-1")?.name).toBe("Alice");
      expect(result.get("user-invalid")).toBeUndefined();
      expect(result.get("user-2")).toBeUndefined();
    });
  });

  describe("永続化への同期", () => {
    it("set でデータを保存すると save が呼ばれる", async () => {
      const saveCallsRef = await Effect.runPromise(Ref.make<number>(0));

      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
        });

        // バックグラウンド実行を待つために少し待機
        yield* Effect.sleep("10 millis");
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  save: () =>
                    Effect.gen(function* () {
                      yield* Ref.update(saveCallsRef, (n) => n + 1);
                    }),
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      const saveCalls = await Effect.runPromise(Ref.get(saveCallsRef));
      expect(saveCalls).toBeGreaterThan(0);
    });

    it("同じ値を set しても save は呼ばれない（差分検出）", async () => {
      const saveCallsRef = await Effect.runPromise(Ref.make<number>(0));

      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // 既に存在する同じ値を set
        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
        });

        // バックグラウンド実行を待つために少し待機
        yield* Effect.sleep("10 millis");
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  savedEntries: [
                    [
                      "user-1",
                      {
                        id: "user-1",
                        name: "Alice",
                        email: "alice@example.com",
                      },
                    ],
                  ],
                  save: () =>
                    Effect.gen(function* () {
                      yield* Ref.update(saveCallsRef, (n) => n + 1);
                    }),
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      const saveCalls = await Effect.runPromise(Ref.get(saveCallsRef));
      // 差分がないので save は呼ばれない
      expect(saveCalls).toBe(0);
    });

    it("invalidate でデータを削除すると save が呼ばれる", async () => {
      const saveCallsRef = await Effect.runPromise(Ref.make<number>(0));

      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        yield* cache.invalidate("user-1");

        // バックグラウンド実行を待つために少し待機
        yield* Effect.sleep("10 millis");
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  savedEntries: [
                    [
                      "user-1",
                      {
                        id: "user-1",
                        name: "Alice",
                        email: "alice@example.com",
                      },
                    ],
                  ],
                  save: () =>
                    Effect.gen(function* () {
                      yield* Ref.update(saveCallsRef, (n) => n + 1);
                    }),
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      const saveCalls = await Effect.runPromise(Ref.get(saveCallsRef));
      expect(saveCalls).toBeGreaterThan(0);
    });

    it("存在しないキーを invalidate しても save は呼ばれない", async () => {
      const saveCallsRef = await Effect.runPromise(Ref.make<number>(0));

      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // 存在しないキーを invalidate
        yield* cache.invalidate("non-existent");

        // バックグラウンド実行を待つために少し待機
        yield* Effect.sleep("10 millis");
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  save: () =>
                    Effect.gen(function* () {
                      yield* Ref.update(saveCallsRef, (n) => n + 1);
                    }),
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );

      const saveCalls = await Effect.runPromise(Ref.get(saveCallsRef));
      // 存在しないキーなので save は呼ばれない
      expect(saveCalls).toBe(0);
    });
  });

  describe("複雑なシナリオ", () => {
    it("複数の操作を順次実行できる", async () => {
      const program = Effect.gen(function* () {
        const cache = yield* FileCacheStorage<User>();

        // 初期データの確認
        const initial = yield* cache.getAll();
        expect(initial.size).toBe(1);

        // 新しいユーザーを追加
        yield* cache.set("user-2", {
          id: "user-2",
          name: "Bob",
          email: "bob@example.com",
        });

        // 既存のユーザーを更新
        yield* cache.set("user-1", {
          id: "user-1",
          name: "Alice Updated",
          email: "alice.updated@example.com",
        });

        // すべてのデータを取得
        const afterUpdate = yield* cache.getAll();
        expect(afterUpdate.size).toBe(2);
        expect(afterUpdate.get("user-1")?.name).toBe("Alice Updated");
        expect(afterUpdate.get("user-2")?.name).toBe("Bob");

        // ユーザーを削除
        yield* cache.invalidate("user-1");

        // 削除後の確認
        const afterDelete = yield* cache.getAll();
        expect(afterDelete.size).toBe(1);
        expect(afterDelete.get("user-1")).toBeUndefined();
        expect(afterDelete.get("user-2")?.name).toBe("Bob");
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeFileCacheStorageLayer("test-users", UserSchema).pipe(
              Layer.provide(
                testPersistentServiceLayer({
                  savedEntries: [
                    [
                      "user-1",
                      {
                        id: "user-1",
                        name: "Alice",
                        email: "alice@example.com",
                      },
                    ],
                  ],
                }),
              ),
              Layer.provide(testFileSystemLayer()),
            ),
          ),
        ),
      );
    });
  });
});
