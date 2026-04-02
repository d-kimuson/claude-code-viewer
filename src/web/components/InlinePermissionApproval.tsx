import { Check, ChevronDown, ChevronRight, Copy, ShieldAlert, X } from "lucide-react";
import { type FC, useState } from "react";
import { formatLocaleDate } from "@/lib/date/formatLocaleDate";
import type { PermissionRequest, PermissionResponse } from "@/types/permissions";
import { useConfig } from "@/web/app/hooks/useConfig";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/web/components/ui/collapsible";

type InlinePermissionApprovalProps = {
  permissionRequest: PermissionRequest | null;
  onResponse: (response: PermissionResponse) => Promise<void>;
};

const basename = (filePath: string): string => filePath.split("/").at(-1) ?? filePath;

const describeGitSubcommand = (args: readonly string[]): string => {
  switch (args[0]?.toLowerCase() ?? "") {
    case "commit":
      return "コミットしようとしています";
    case "push":
      return "プッシュしようとしています";
    case "pull":
      return "プルしようとしています";
    case "clone":
      return "リポジトリをクローンしようとしています";
    case "checkout":
    case "switch":
      return "ブランチを切り替えようとしています";
    case "branch":
      return "ブランチを操作しようとしています";
    case "merge":
      return "マージしようとしています";
    case "rebase":
      return "リベースしようとしています";
    case "add":
      return "変更をステージしようとしています";
    case "status":
      return "git の状態を確認しようとしています";
    case "log":
      return "git ログを確認しようとしています";
    case "diff":
      return "差分を確認しようとしています";
    case "reset":
      return "変更をリセットしようとしています";
    case "stash":
      return "変更を一時保存しようとしています";
    case "fetch":
      return "リモートの情報を取得しようとしています";
    default:
      return "git を操作しようとしています";
  }
};

const describePackageManagerSubcommand = (args: readonly string[]): string => {
  switch (args[0]?.toLowerCase() ?? "") {
    case "install":
    case "add":
    case "i":
      return "パッケージをインストールしようとしています";
    case "uninstall":
    case "remove":
    case "rm":
      return "パッケージを削除しようとしています";
    case "update":
    case "upgrade":
      return "パッケージを更新しようとしています";
    case "run":
      return args[1] !== undefined
        ? `${args[1]} スクリプトを実行しようとしています`
        : "スクリプトを実行しようとしています";
    case "build":
      return "ビルドしようとしています";
    case "test":
      return "テストを実行しようとしています";
    case "lint":
      return "Lint を実行しようとしています";
    default:
      return "パッケージを管理しようとしています";
  }
};

const describeBashCommand = (command: string): string => {
  const firstSegment = command.split(/\s*(?:&&|\|\||;)\s*/)[0]?.trim() ?? command;
  const tokens = firstSegment.trim().split(/\s+/);

  // Skip sudo and env var assignments (VAR=value)
  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx] ?? "";
    if (token === "sudo" || token === "env" || token.includes("=")) {
      idx++;
    } else {
      break;
    }
  }

  const baseCmd = tokens[idx]?.toLowerCase() ?? "";
  const args = tokens.slice(idx + 1).filter((t) => !t.startsWith("-"));
  const firstArg = args[0];

  switch (baseCmd) {
    case "rm":
    case "rmdir":
      return firstArg !== undefined
        ? `${firstArg} を削除しようとしています`
        : "ファイルを削除しようとしています";
    case "ls":
      return firstArg !== undefined
        ? `${firstArg} フォルダを確認しようとしています`
        : "フォルダを確認しようとしています";
    case "mkdir":
      return firstArg !== undefined
        ? `${firstArg} フォルダを作成しようとしています`
        : "フォルダを作成しようとしています";
    case "cp":
      return "ファイルをコピーしようとしています";
    case "mv":
      return "ファイルを移動しようとしています";
    case "cat":
      return firstArg !== undefined
        ? `${firstArg} を確認しようとしています`
        : "ファイルを確認しようとしています";
    case "touch":
      return firstArg !== undefined
        ? `${firstArg} を作成しようとしています`
        : "ファイルを作成しようとしています";
    case "find":
      return "ファイルを検索しようとしています";
    case "grep":
    case "rg":
      return "ファイル内を検索しようとしています";
    case "git":
      return describeGitSubcommand(args);
    case "npm":
    case "pnpm":
    case "yarn":
    case "bun":
      return describePackageManagerSubcommand(args);
    case "curl":
    case "wget":
      return "ファイルをダウンロードしようとしています";
    case "chmod":
    case "chown":
      return "ファイルの権限を変更しようとしています";
    case "kill":
    case "killall":
    case "pkill":
      return "プロセスを終了しようとしています";
    case "ps":
      return "プロセスを確認しようとしています";
    case "docker":
      return "Docker を操作しようとしています";
    case "ssh":
      return "リモートサーバーに接続しようとしています";
    case "make":
      return "ビルドしようとしています";
    case "python":
    case "python3":
      return "Python スクリプトを実行しようとしています";
    case "node":
    case "npx":
    case "tsx":
    case "ts-node":
      return "スクリプトを実行しようとしています";
    case "echo":
      return "テキストを出力しようとしています";
    case "cd":
      return firstArg !== undefined
        ? `${firstArg} に移動しようとしています`
        : "ディレクトリを移動しようとしています";
    case "tar":
    case "zip":
    case "unzip":
    case "gzip":
      return "アーカイブを操作しようとしています";
    case "open":
      return firstArg !== undefined
        ? `${firstArg} を開こうとしています`
        : "ファイルを開こうとしています";
    default:
      return "コマンドを実行しようとしています";
  }
};

const describePermissionRequest = (
  toolName: string,
  toolInput: Record<string, unknown>,
): string => {
  switch (toolName.toLowerCase()) {
    case "read": {
      if (typeof toolInput["file_path"] === "string") {
        return `${basename(toolInput["file_path"])} を読もうとしています`;
      }
      return "ファイルを読もうとしています";
    }
    case "write": {
      if (typeof toolInput["file_path"] === "string") {
        return `${basename(toolInput["file_path"])} を書き込もうとしています`;
      }
      return "ファイルを書き込もうとしています";
    }
    case "edit":
    case "multiedit": {
      if (typeof toolInput["file_path"] === "string") {
        return `${basename(toolInput["file_path"])} を編集しようとしています`;
      }
      return "ファイルを編集しようとしています";
    }
    case "bash": {
      if (typeof toolInput["command"] === "string") {
        return describeBashCommand(toolInput["command"]);
      }
      return "コマンドを実行しようとしています";
    }
    case "glob": {
      if (typeof toolInput["pattern"] === "string") {
        return `${toolInput["pattern"]} に一致するファイルを検索しようとしています`;
      }
      return "ファイルを検索しようとしています";
    }
    case "grep": {
      if (typeof toolInput["pattern"] === "string") {
        return `「${toolInput["pattern"]}」をファイル内で検索しようとしています`;
      }
      return "ファイル内を検索しようとしています";
    }
    case "ls": {
      if (typeof toolInput["path"] === "string") {
        return `${toolInput["path"]} フォルダを確認しようとしています`;
      }
      return "フォルダを確認しようとしています";
    }
    case "webfetch": {
      return "Web ページを取得しようとしています";
    }
    case "websearch": {
      if (typeof toolInput["query"] === "string") {
        return `「${toolInput["query"]}」を検索しようとしています`;
      }
      return "Web を検索しようとしています";
    }
    case "notebookread": {
      if (typeof toolInput["notebook_path"] === "string") {
        return `${basename(toolInput["notebook_path"])} を読もうとしています`;
      }
      return "ノートブックを読もうとしています";
    }
    case "notebookedit": {
      if (typeof toolInput["notebook_path"] === "string") {
        return `${basename(toolInput["notebook_path"])} を編集しようとしています`;
      }
      return "ノートブックを編集しようとしています";
    }
    case "todowrite": {
      return "タスクリストを更新しようとしています";
    }
    case "agent": {
      if (typeof toolInput["description"] === "string") {
        return `サブエージェント（${toolInput["description"]}）を起動しようとしています`;
      }
      return "サブエージェントを起動しようとしています";
    }
    default: {
      // MCP tools: mcp__serverName__toolName
      if (toolName.toLowerCase().startsWith("mcp__")) {
        const parts = toolName.split("__");
        const serverName = parts[1] ?? "";
        const toolPart = parts.slice(2).join("__");
        return `${serverName} の ${toolPart} を実行しようとしています`;
      }
      return `${toolName} を実行しようとしています`;
    }
  }
};

const formatValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const ParameterEntry: FC<{ paramKey: string; value: unknown }> = ({ paramKey, value }) => {
  const [copied, setCopied] = useState(false);
  const formattedValue = formatValue(value);
  const isLong = formattedValue.length > 100;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {paramKey}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void copyToClipboard(formattedValue)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <div
        className={`rounded-md bg-muted/60 border border-border/40 px-3 py-2 ${isLong ? "max-h-32 overflow-y-auto" : ""}`}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/80">
          {formattedValue}
        </pre>
      </div>
    </div>
  );
};

export const InlinePermissionApproval: FC<InlinePermissionApprovalProps> = ({
  permissionRequest,
  onResponse,
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [isParametersExpanded, setIsParametersExpanded] = useState(false);
  const { config } = useConfig();

  if (!permissionRequest) return null;

  const handleResponse = async (decision: "allow" | "deny") => {
    setIsResponding(true);

    const response: PermissionResponse = {
      permissionRequestId: permissionRequest.id,
      decision,
    };

    try {
      await onResponse(response);
    } finally {
      setIsResponding(false);
    }
  };

  const parameterEntries = Object.entries(permissionRequest.toolInput);
  const hasParameters = parameterEntries.length > 0;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 lg:mx-12 xl:mx-16 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-orange-500/25 bg-card shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-2.5 border-b border-border/60 bg-orange-500/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <ShieldAlert className="size-3.5" />
              </div>
              <span className="text-sm font-semibold">Permission Request</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatLocaleDate(permissionRequest.timestamp, {
                locale: config.locale,
                target: "time",
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 ml-[2.125rem]">
            {describePermissionRequest(permissionRequest.toolName, permissionRequest.toolInput)}
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Tool name */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs tracking-tight">
              {permissionRequest.toolName}
            </Badge>
          </div>

          {/* Parameters Section */}
          {hasParameters && (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Collapsible open={isParametersExpanded} onOpenChange={setIsParametersExpanded}>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Parameters</span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {parameterEntries.length}
                    </Badge>
                  </div>
                  {isParametersExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3.5 pb-3.5 pt-0.5 space-y-3 max-h-48 overflow-y-auto border-t border-border/40">
                    {parameterEntries.map(([key, value]) => (
                      <ParameterEntry key={key} paramKey={key} value={value} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {!hasParameters && (
            <div className="rounded-lg border border-border/60 px-3.5 py-2.5 text-center text-sm text-muted-foreground">
              No parameters
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleResponse("deny")}
              disabled={isResponding}
              className="min-w-[4.5rem] gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="size-3.5" />
              Deny
            </Button>
            <Button
              size="sm"
              onClick={() => void handleResponse("allow")}
              disabled={isResponding}
              className="min-w-[4.5rem] gap-1.5"
            >
              <Check className="size-3.5" />
              Allow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
