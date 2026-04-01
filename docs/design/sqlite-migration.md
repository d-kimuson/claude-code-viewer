# SQLite マイグレーション設計書

## 概要

ファイルベースのキャッシュ（JSON ファイル + インメモリ `Ref<Map>`）とインメモリ全文検索（MiniSearch）を、SQLite（`node:sqlite` + Drizzle ORM）+ FTS5 trigram に移行する。

### ゴール

1. **キャッシュ層の簡素化**: 2 層キャッシュ（FileCacheStorage JSON + Ref\<Map>）を SQLite 1 本に統合
2. **永続的な全文検索**: MiniSearch（インメモリ、TTL 切れで毎回全件再構築）を FTS5（永続、差分更新）に置換
3. **効率的な差分同期**: ディレクトリ全スキャンではなく、前回同期以降に変更されたファイルのみ処理
4. **invalidation の改善**: TTL ベースのキャッシュ期限管理 → イベント駆動の行単位更新

### スコープ外

- データソースの変更（JSONL ファイルが引き続き source of truth）
- フロントエンド API コントラクトの変更
- Effect-TS パターンの置換

## 現行アーキテクチャ

```
データソース (JSONL ファイル)
  ├─→ FileCacheStorage (JSON ファイル) ─→ firstUserMessage, projectPath
  ├─→ Ref<Map> (インメモリ) ─→ SessionMeta, ProjectMeta, AgentMapping
  └─→ MiniSearch (インメモリ, TTL=60秒) ─→ 全文検索インデックス

Invalidation: FileWatcher → EventBus → Ref<Map> エントリ削除 (FileCacheStorage は invalidation されない)
検索: TTL ベースで期限切れ → 全 JSONL を再スキャンしてインデックス再構築
```

### 現行の課題

| 課題 | 影響 |
|------|------|
| 2 層キャッシュの invalidation セマンティクスが異なる | 複雑さ、微妙なバグ（stale 検知ハック） |
| MiniSearch の TTL 切れで毎回全ファイル再スキャン | アクティブな検索で 60 秒ごとに O(全ファイル) |
| FileCacheStorage のバックグラウンド書き込み (`Runtime.runFork`) | サーバー停止時にデータロスト |
| 検索インデックスがファイルイベントで invalidation されない | 最大 60 秒の stale 結果 |
| `getSessions()` が毎回全ファイルに `stat()` を実行 | 未変更ファイルへの不要な I/O |
| projectId フィルタがメモリ上のポストフィルタ | 大規模データセットで非効率 |

## 提案アーキテクチャ

```
データソース (JSONL ファイル)
  └─→ SQLite DB (~/.claude-code-viewer/cache.db)
        ├── projects テーブル
        ├── sessions テーブル (メタデータキャッシュ)
        ├── session_messages_fts (FTS5 trigram 仮想テーブル)
        └── sync_state テーブル (最終同期タイムスタンプ)

同期トリガー:
  1. サーバー起動時: 差分同期 (mtime 比較)
  2. FileWatcher イベント: 対象行の更新
```

## 技術スタック

- **`node:sqlite`**: Node.js 22.5+ 組み込み SQLite（ネイティブアドオン不要）
- **Drizzle ORM**: スキーマ定義、型安全なクエリ、マイグレーション管理
  - 参考: https://orm.drizzle.team/docs/connect-node-sqlite
- **FTS5 trigram**: SQLite 組み込みの全文検索。trigram トークナイザで日本語の部分一致検索に対応

## データベーススキーマ

### テーブル定義

```sql
-- プロジェクトメタデータキャッシュ
CREATE TABLE projects (
  id TEXT PRIMARY KEY,              -- base64url エンコードされたパス
  name TEXT,                        -- ディレクトリのベース名
  path TEXT,                        -- フルファイルシステムパス
  session_count INTEGER NOT NULL DEFAULT 0,
  dir_mtime_ms INTEGER NOT NULL,    -- ディレクトリの mtime (エポックミリ秒)
  synced_at INTEGER NOT NULL        -- 最終同期タイムスタンプ (エポックミリ秒)
);

-- セッションメタデータキャッシュ
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- base64url エンコードされたパス
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL UNIQUE,   -- .jsonl ファイルの絶対パス
  message_count INTEGER NOT NULL DEFAULT 0,
  first_user_message_json TEXT,     -- JSON: ParsedUserMessage | null
  custom_title TEXT,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  cost_breakdown_json TEXT,         -- JSON: { inputTokensUsd, outputTokensUsd, ... }
  token_usage_json TEXT,            -- JSON: { inputTokens, outputTokens, ... }
  model_name TEXT,
  pr_links_json TEXT,               -- JSON: Array<{ prNumber, prUrl, prRepository }>
  file_mtime_ms INTEGER NOT NULL,   -- ファイルの mtime (エポックミリ秒)
  last_modified_at TEXT NOT NULL,    -- ISO 8601 (API レスポンス用)
  synced_at INTEGER NOT NULL        -- 最終同期タイムスタンプ (エポックミリ秒)
);

CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_file_mtime ON sessions(file_mtime_ms);

-- 全文検索用の FTS5 仮想テーブル
CREATE VIRTUAL TABLE session_messages_fts USING fts5(
  session_id,           -- sessions テーブルへの JOIN 用
  project_id,           -- 検索時のプロジェクトフィルタ用 (非正規化)
  role,                 -- 'user' | 'assistant' | 'custom-title'
  content,              -- 検索対象テキスト
  conversation_index,   -- セッション内のメッセージインデックス
  tokenize='trigram'    -- CJK 対応の trigram トークナイザ
);

-- 同期状態の追跡
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- key: 'last_full_sync_at' → エポックミリ秒
-- key: 'schema_version' → マイグレーションバージョン
```

### 設計判断

**ネストデータは JSON カラム**: `cost_breakdown_json`, `token_usage_json`, `pr_links_json`, `first_user_message_json` は JSON 文字列として保存する。常に一括で読み書きされ、個別にクエリされないため、不要な正規化を避けてスキーマをシンプルに保つ。

**FTS テーブルに `project_id` を非正規化**: 検索クエリで `WHERE project_id = ?` を JOIN なしで直接フィルタするため。

**`file_mtime_ms` による変更検知**: DB に保存した mtime とファイルシステムの mtime を比較することが、stale 検知の主要メカニズム。

## 差分同期の設計

### 起動時同期

サーバー起動時にデータベースとファイルシステムの状態を整合させる。課題: サーバーが数時間〜数日間停止していた場合、ファイルの作成・変更・削除が発生している可能性がある。

```
startup_sync():
  1. 全プロジェクトディレクトリをスキャン
  2. 各プロジェクトについて:
     a. stat(projectDir) → dirMtime
     b. dirMtime が変化 or 新規プロジェクトの場合:
        - readDirectory() → 新規ファイルの検出
        - 新規ファイル → パース & INSERT
        - 削除されたファイルの検出 → DELETE
     c. DB に既知の全セッション (このプロジェクト内) について:
        - stat(filePath) → fileMtime
        - fileMtime > sessions.file_mtime_ms → 再パース & UPDATE
     d. プロジェクト行を更新
  3. 削除されたプロジェクトの検出 → DELETE (CASCADE でセッション + FTS も削除)
  4. sync_state を更新
```

**最適化のポイント**:
- **ディレクトリ mtime 未変更** → 新規/削除ファイルなし、`readDirectory()` をスキップ可能
- ただし JSONL は追記型なので、ファイル変更時にディレクトリ mtime は変わらない → 既知ファイルの mtime は常にチェックする必要あり
- **ファイル mtime 未変更** → 内容は同一、スキップして OK

### 実行時同期 (FileWatcher イベント)

サーバー稼働中は `FileWatcherService` が `node:fs.watch()` で変更を検知する。

```
on sessionChanged({ projectId, sessionId }):
  1. sessionId からファイルパスを解決
  2. stat(filePath) → fileMtime
  3. JSONL を読み込み & パース
  4. セッション行を UPSERT (メタデータ更新、file_mtime_ms = fileMtime)
  5. 該当セッションの旧 FTS エントリを削除
  6. 新しい FTS エントリを挿入
  7. (既存動作) フロントエンドへ SSE を emit

on sessionListChanged({ projectId }):
  1. readDirectory(projectDir) → 現在のファイル一覧
  2. DB 内の該当プロジェクトのセッションと比較
  3. 新規ファイル → パース & INSERT
  4. 削除されたファイル → DELETE
  5. project.session_count を更新
```

### 整合性保証

- **同期単位ごとのトランザクション**: セッション更新（メタデータ + FTS）は単一の SQLite トランザクションでラップ
- **クラッシュリカバリ**: 同期途中でクラッシュした場合、`file_mtime_ms` が更新されないため、次回起動時に再処理される
- **データロストなし**: `Runtime.runFork` によるバックグラウンド書き込みと違い、SQLite トランザクションはアトミック

## サービス層の変更

### 新規サービス

#### `DrizzleService`

`~/.claude-code-viewer/cache.db` に接続された Drizzle インスタンスを提供する。

```typescript
class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  { readonly db: DrizzleSqliteDatabase }
>() {
  static Live = Layer.scoped(/* ... */)
}
```

- 起動時に Drizzle マイグレーションを実行
- コネクションのライフサイクル管理（サーバー終了時に close）
- DB パス: `claudeCodeViewerCacheDirPath/cache.db`

#### `SyncService`

JSONL ファイルと SQLite の差分同期を統括する。

```typescript
class SyncService extends Context.Tag("SyncService")<
  SyncService,
  {
    readonly fullSync: () => Effect.Effect<SyncResult>
    readonly syncSession: (projectId: string, sessionId: string) => Effect.Effect<void>
    readonly syncProjectList: (projectId: string) => Effect.Effect<void>
  }
>() {}
```

- `fullSync()`: 起動時に呼ばれる。上述の起動時同期アルゴリズムを実装
- `syncSession()`: `sessionChanged` イベントで呼ばれる
- `syncProjectList()`: `sessionListChanged` イベントで呼ばれる

### 変更されるサービス

#### `SessionMetaService` → 簡素化

現行: `Ref<Map<string, SessionMeta>>` + `FileCacheStorage<ParsedUserMessage>` + 複雑な stale 検知を管理。

移行後: SQLite から直接読み取り。`SyncService` が DB を最新に保つため、stale 検知は不要に。

```typescript
// Before: 複雑な多段キャッシュルックアップ
getSessionMeta(sessionId) → Ref チェック → FileCacheStorage チェック → JSONL パース → 両キャッシュ更新

// After: シンプルな DB 読み取り
getSessionMeta(sessionId) → SELECT from sessions → SessionMeta にマッピング
```

#### `ProjectMetaService` → 簡素化

SessionMetaService と同じパターン。`Ref<Map>` + `FileCacheStorage` を SQLite 読み取りに置換。

#### `SearchService` → 書き直し

現行: MiniSearch インメモリ + TTL キャッシュ + 全 JSONL 再スキャン。

移行後: SQLite に対する FTS5 クエリ。

```typescript
// Before
search(query) → TTL チェック → 全 JSONL からインデックス再構築 → miniSearch.search()

// After
search(query, projectId?) →
  SELECT session_id, snippet(session_messages_fts, 3, '<b>', '</b>', '...', 20)
  FROM session_messages_fts
  WHERE session_messages_fts MATCH ?
  AND project_id = ?  -- オプショナルフィルタ
  ORDER BY rank
  LIMIT ?
```

- FTS5 `MATCH` + trigram トークナイザで日本語の部分一致検索がネイティブに動作
- `snippet()` 関数でコンテキストスニペットを生成（カスタムスニペットロジック不要に）
- `rank` カラムで BM25 ベースの関連性スコアリング
- TTL なし、全件再スキャンなし、MiniSearch 依存なし

#### `SessionRepository` → 最適化

現行: `getSessions()` が毎回 `readDirectory()` + 全ファイルの `stat()` を実行。

移行後: sessions テーブルへのクエリ。ファイルシステムアクセスは同期時のみ。

```typescript
// Before
getSessions(projectId) → readDirectory → 各ファイル stat → 各 getSessionMeta

// After
getSessions(projectId) → SELECT from sessions WHERE project_id = ? ORDER BY last_modified_at DESC
```

#### `ProjectRepository` → 最適化

同じパターン。`readDirectory()` + `stat()` の代わりに projects テーブルへのクエリ。

#### `InitializeService` → 更新

```typescript
// Before
startInitialization():
  1. startWatching()
  2. 全プロジェクト + セッションのキャッシュウォームアップ (逐次読み込み)
  3. sessionChanged → Ref<Map> を invalidate

// After
startInitialization():
  1. Drizzle マイグレーション実行
  2. SyncService.fullSync() (差分、mtime ベース)
  3. startWatching()
  4. sessionChanged → SyncService.syncSession()
  5. sessionListChanged → SyncService.syncProjectList()
```

### 削除されるサービス / 依存関係

| コンポーネント | 理由 |
|---------------|------|
| `FileCacheStorage` | SQLite に置換 |
| `PersistentService` | DrizzleService に置換 |
| `minisearch` パッケージ | FTS5 に置換 |
| `first-user-message-cache.json` | sessions テーブルにデータ移行 |
| `project-path-cache.json` | projects テーブルにデータ移行 |

## 実装フェーズ

### Phase 1: インフラ

1. `drizzle-orm` 依存関係を追加
2. Drizzle スキーマ定義（上記テーブル）を実装
3. マイグレーションサポート付きの `DrizzleService` を作成
4. 初回マイグレーションを作成

### Phase 2: 同期エンジン

1. `SyncService` を差分同期アルゴリズムで実装
2. `InitializeService` に接続（起動時同期）
3. `FileWatcherService` イベントに接続（実行時同期）
4. テストレイヤーを使ったユニットテストを追加

### Phase 3: 読み取りパスの移行

1. `SessionMetaService` を SQLite 読み取りに移行
2. `ProjectMetaService` を SQLite 読み取りに移行
3. `SessionRepository.getSessions()` を SQLite クエリに移行
4. `ProjectRepository.getProjects()` を SQLite クエリに移行
5. API レスポンスが同一であることを検証

### Phase 4: 検索の移行

1. FTS5 ベースの `SearchService` を実装
2. 同期時に FTS エントリを投入
3. 検索 API を FTS5 クエリに更新
4. MiniSearch 依存関係を削除

### Phase 5: クリーンアップ

1. `FileCacheStorage/` ディレクトリを削除
2. `PersistentService` を削除
3. `minisearch` を依存関係から削除
4. 起動時に旧キャッシュ JSON ファイルを削除（マイグレーションクリーンアップ）
5. テストを更新

## ファイル影響範囲

### 新規ファイル

| ファイル | 目的 |
|---------|------|
| `src/server/lib/db/schema.ts` | Drizzle テーブル定義 |
| `src/server/lib/db/DrizzleService.ts` | DB 接続 + マイグレーションサービス |
| `src/server/lib/db/migrations/` | Drizzle マイグレーションファイル |
| `src/server/core/sync/services/SyncService.ts` | 差分同期エンジン |
| `src/server/core/sync/functions/` | 純粋な同期ヘルパー関数 |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/server/core/session/services/SessionMetaService.ts` | Ref+FileCache → SQLite 読み取り |
| `src/server/core/project/services/ProjectMetaService.ts` | Ref+FileCache → SQLite 読み取り |
| `src/server/core/search/services/SearchService.ts` | MiniSearch → FTS5 クエリ |
| `src/server/core/session/infrastructure/SessionRepository.ts` | SQLite クエリでセッション一覧取得 |
| `src/server/core/project/infrastructure/ProjectRepository.ts` | SQLite クエリでプロジェクト一覧取得 |
| `src/server/hono/initialize.ts` | マイグレーション + 同期を起動フローに追加 |
| `package.json` | drizzle-orm 追加、minisearch 削除 |

### 削除ファイル

| ファイル | 理由 |
|---------|------|
| `src/server/lib/storage/FileCacheStorage/index.ts` | SQLite に置換 |
| `src/server/lib/storage/FileCacheStorage/PersistentService.ts` | DrizzleService に置換 |
| `src/server/core/search/functions/extractSearchableText.ts` | SyncService にインライン化（または純粋関数として維持） |

## リスクと対策

| リスク | 対策 |
|--------|------|
| `node:sqlite` が experimental (22.5+) | プロジェクトは既に Node 22.13+ を要求。`node:sqlite` は実用上安定している |
| 空 DB での初回起動が遅い (全件同期) | 現行の起動時ウォームアップと同等。進捗をログ出力可能。2 回目以降は差分のみ |
| DB 破損 | DB はキャッシュなので安全に削除 & 再構築可能。`--reset-cache` CLI フラグを追加 |
| Drizzle + node:sqlite の互換性 | Drizzle が node:sqlite を公式サポート |
| FTS5 trigram のインデックスサイズ | trigram はワードベースより大きい。サイズを監視し、必要に応じてインデックス対象のテキスト長を制限 |

## 決定事項

1. **インメモリキャッシュ層**: `Ref<Map>` は廃止。SQLite のインデックス付き検索で十分高速なため、不要な複雑さを排除する。
2. **検索スコープ**: 現行と同じ（user/assistant テキストのみ）。`tool_use` の検索対象化は将来の拡張として別タスクで対応。
3. **エージェントセッション**: 現行の `AgentSessionMappingService`（ファイルシステムベース）を維持。DB 管理は今回のスコープ外。
