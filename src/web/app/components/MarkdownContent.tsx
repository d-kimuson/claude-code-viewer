import { type FC, useMemo } from "react";
import Markdown, { type Components } from "react-markdown";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../hooks/useTheme";
import { CodeBlock } from "./CodeBlock";
import { MarkdownLink } from "./MarkdownLink";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);

export const MarkdownContent: FC<MarkdownContentProps> = ({ content, className = "" }) => {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;

  const markdownComponents = useMemo<Components>(
    () => ({
      h1({ children, ...props }) {
        return (
          <h1
            className="text-3xl font-bold mb-6 mt-8 pb-3 border-b border-border text-foreground"
            {...props}
          >
            {children}
          </h1>
        );
      },
      h2({ children, ...props }) {
        return (
          <h2
            className="text-2xl font-semibold mb-4 mt-8 pb-2 border-b border-border/50 text-foreground"
            {...props}
          >
            {children}
          </h2>
        );
      },
      h3({ children, ...props }) {
        return (
          <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props}>
            {children}
          </h3>
        );
      },
      h4({ children, ...props }) {
        return (
          <h4 className="text-lg font-medium mb-2 mt-4 text-foreground" {...props}>
            {children}
          </h4>
        );
      },
      h5({ children, ...props }) {
        return (
          <h5 className="text-base font-medium mb-2 mt-4 text-foreground" {...props}>
            {children}
          </h5>
        );
      },
      h6({ children, ...props }) {
        return (
          <h6 className="text-sm font-medium mb-2 mt-4 text-muted-foreground" {...props}>
            {children}
          </h6>
        );
      },
      p({ children, ...props }) {
        return (
          <p className="mb-4 leading-7 text-foreground break-all" {...props}>
            {children}
          </p>
        );
      },
      ul({ children, ...props }) {
        return (
          <ul className="mb-4 ml-6 list-disc space-y-2" {...props}>
            {children}
          </ul>
        );
      },
      ol({ children, ...props }) {
        return (
          <ol className="mb-4 ml-6 list-decimal space-y-2" {...props}>
            {children}
          </ol>
        );
      },
      li({ children, ...props }) {
        return (
          <li className="leading-7 text-foreground" {...props}>
            {children}
          </li>
        );
      },
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className ?? "");
        const isInline = !match;

        if (isInline) {
          return (
            <code
              className="inline-block max-w-full align-middle overflow-hidden rounded-md border bg-muted/70 px-2 py-1 font-mono text-sm text-foreground whitespace-break-spaces break-words [overflow-wrap:anywhere]"
              {...props}
            >
              {children}
            </code>
          );
        }

        const codeContent =
          typeof children === "string"
            ? children
            : Array.isArray(children)
              ? children.filter((child) => typeof child === "string").join("")
              : "";

        const language = match[1] ?? "";

        return <CodeBlock language={language} code={codeContent} syntaxTheme={syntaxTheme} />;
      },
      pre({ children, ...props }) {
        return <pre {...props}>{children}</pre>;
      },
      blockquote({ children, ...props }) {
        return (
          <blockquote
            className="border-l-4 border-primary/30 bg-muted/30 pl-6 pr-4 py-4 my-6 italic rounded-r-lg"
            {...props}
          >
            <div className="text-muted-foreground">{children}</div>
          </blockquote>
        );
      },
      a({ children, href, ...props }) {
        return (
          <MarkdownLink href={href} {...props}>
            {children}
          </MarkdownLink>
        );
      },
      // テーブルの改善
      table({ children, ...props }) {
        return (
          <div className="overflow-x-auto my-6 rounded-lg border border-border max-w-full">
            <table className="w-full border-collapse" {...props}>
              {children}
            </table>
          </div>
        );
      },
      thead({ children, ...props }) {
        return (
          <thead className="bg-muted/50" {...props}>
            {children}
          </thead>
        );
      },
      th({ children, ...props }) {
        return (
          <th
            className="border-b border-border px-4 py-3 text-left font-semibold text-foreground"
            {...props}
          >
            {children}
          </th>
        );
      },
      td({ children, ...props }) {
        return (
          <td className="border-b border-border px-4 py-3 text-foreground" {...props}>
            {children}
          </td>
        );
      },
      hr({ ...props }) {
        return <hr className="my-8 border-t border-border" {...props} />;
      },
      strong({ children, ...props }) {
        return (
          <strong className="font-semibold text-foreground" {...props}>
            {children}
          </strong>
        );
      },
      em({ children, ...props }) {
        return (
          <em className="italic text-foreground" {...props}>
            {children}
          </em>
        );
      },
    }),
    [syntaxTheme],
  );

  return (
    <div className={`prose prose-neutral dark:prose-invert max-w-none ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  );
};
