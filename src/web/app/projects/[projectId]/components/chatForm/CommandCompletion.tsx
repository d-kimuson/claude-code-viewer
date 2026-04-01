import { useLingui } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, TerminalIcon } from "lucide-react";
import {
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { claudeCommandsQuery } from "@/web/lib/api/queries";
import { cn } from "@/web/utils";
import { Button } from "../../../../../components/ui/button";
import { Collapsible, CollapsibleContent } from "../../../../../components/ui/collapsible";

type CommandInfo = {
  name: string;
  description: string | null;
  argumentHint: string | null;
};

type CommandCompletionProps = {
  projectId: string;
  inputValue: string;
  onCommandSelect: (command: string) => void;
  className?: string;
};

export type CommandCompletionRef = {
  handleKeyDown: (e: KeyboardEvent) => boolean;
};

export const CommandCompletion = forwardRef<CommandCompletionRef, CommandCompletionProps>(
  ({ projectId, inputValue, onCommandSelect, className }, ref) => {
    const { i18n } = useLingui();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // コマンドリストを取得
    const { data: commandData } = useQuery({
      queryKey: claudeCommandsQuery(projectId).queryKey,
      queryFn: claudeCommandsQuery(projectId).queryFn,
      staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    });

    // メモ化されたコマンドフィルタリング
    const { shouldShowCompletion, filteredCommands } = useMemo(() => {
      const allCommands: CommandInfo[] = [
        ...(commandData?.defaultCommands ?? []),
        ...(commandData?.globalCommands ?? []),
        ...(commandData?.projectCommands ?? []),
        ...(commandData?.globalSkills ?? []),
        ...(commandData?.projectSkills ?? []),
      ];

      const shouldShow = inputValue.startsWith("/");
      const searchTerm = shouldShow ? inputValue.slice(1).toLowerCase() : "";

      const filtered = shouldShow
        ? allCommands.filter(
            (cmd) =>
              cmd.name.toLowerCase().includes(searchTerm) ||
              (cmd.description !== null && cmd.description !== ""
                ? cmd.description.toLowerCase()
                : ""
              ).includes(searchTerm),
          )
        : [];

      return { shouldShowCompletion: shouldShow, filteredCommands: filtered };
    }, [commandData, inputValue]);

    // 表示状態の導出（useEffectを削除）
    const shouldBeOpen = shouldShowCompletion && filteredCommands.length > 0;

    // 状態が変更された時のリセット処理
    if (isOpen !== shouldBeOpen) {
      setIsOpen(shouldBeOpen);
      setSelectedIndex(-1);
    }

    // メモ化されたコマンド選択処理
    const handleCommandSelect = useCallback(
      (command: CommandInfo) => {
        // Append argumentHint as placeholder if exists
        const hint =
          command.argumentHint !== null && command.argumentHint !== ""
            ? ` ${command.argumentHint}`
            : "";
        onCommandSelect(`/${command.name}${hint} `);
        setIsOpen(false);
        setSelectedIndex(-1);
      },
      [onCommandSelect],
    );

    // スクロール処理
    const scrollToSelected = useCallback((index: number) => {
      if (index >= 0 && listRef.current) {
        // ボタン要素を直接検索
        const buttons = listRef.current.querySelectorAll('button[role="option"]');
        const selectedButton = buttons[index];
        if (selectedButton instanceof HTMLElement) {
          selectedButton.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
        }
      }
    }, []);

    // メモ化されたキーボードナビゲーション処理
    const handleKeyboardNavigation = useCallback(
      (e: KeyboardEvent): boolean => {
        if (!isOpen || filteredCommands.length === 0) return false;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => {
              const newIndex = prev < filteredCommands.length - 1 ? prev + 1 : 0;
              // スクロールを次のフレームで実行
              requestAnimationFrame(() => scrollToSelected(newIndex));
              return newIndex;
            });
            return true;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => {
              const newIndex = prev > 0 ? prev - 1 : filteredCommands.length - 1;
              // スクロールを次のフレームで実行
              requestAnimationFrame(() => scrollToSelected(newIndex));
              return newIndex;
            });
            return true;
          case "Enter":
          case "Tab":
            if (selectedIndex >= 0 && selectedIndex < filteredCommands.length) {
              e.preventDefault();
              const selectedCommand = filteredCommands[selectedIndex];
              if (selectedCommand) {
                handleCommandSelect(selectedCommand);
              }
              return true;
            }
            return false;
          case "Escape":
            e.preventDefault();
            setIsOpen(false);
            setSelectedIndex(-1);
            return true;
          default:
            return false;
        }
      },
      [isOpen, selectedIndex, handleCommandSelect, scrollToSelected, filteredCommands],
    );

    // 外部クリック処理をuseEffectで設定
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          event.target instanceof Node &&
          !containerRef.current.contains(event.target)
        ) {
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // useImperativeHandleでキーボードハンドラーを公開
    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown: handleKeyboardNavigation,
      }),
      [handleKeyboardNavigation],
    );

    if (!shouldShowCompletion || filteredCommands.length === 0) {
      return null;
    }

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <div
              ref={listRef}
              className="absolute z-50 w-full bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
              style={{ height: "15rem" }}
              role="listbox"
              aria-label={i18n._("Available commands")}
            >
              <div className="h-full overflow-y-auto">
                {filteredCommands.length > 0 && (
                  <div className="p-1.5">
                    <div
                      className="px-3 py-2 text-xs font-semibold text-muted-foreground/80 border-b border-border/50 mb-1 flex items-center gap-2"
                      role="presentation"
                    >
                      <TerminalIcon className="w-3.5 h-3.5" />
                      Available Commands / Skills ({filteredCommands.length})
                    </div>
                    {filteredCommands.map((command, index) => (
                      <Button
                        key={command.name}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-mono text-sm h-auto min-h-9 px-3 py-2 min-w-0 transition-colors duration-150",
                          index === selectedIndex
                            ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-foreground border border-blue-500/20"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => handleCommandSelect(command)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        role="option"
                        aria-selected={index === selectedIndex}
                        aria-label={`Command: /${command.name}`}
                        title={command.description ?? `/${command.name}`}
                      >
                        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 w-full">
                            <span className="text-muted-foreground flex-shrink-0">/</span>
                            <span className="font-medium truncate">{command.name}</span>
                            {command.argumentHint !== null && command.argumentHint !== "" ? (
                              <span className="text-muted-foreground/60 text-xs truncate">
                                {command.argumentHint}
                              </span>
                            ) : null}
                          </div>
                          {command.description !== null && command.description !== "" ? (
                            <span className="text-muted-foreground/70 text-xs pl-0 truncate w-full">
                              {command.description}
                            </span>
                          ) : null}
                        </div>
                        {index === selectedIndex && (
                          <CheckIcon className="w-3.5 h-3.5 ml-auto text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  },
);
