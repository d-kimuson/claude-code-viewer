import type { FC } from "react";
import { useState } from "react";
import { useBrowserPreview } from "../../hooks/useBrowserPreview";

interface MarkdownLinkProps {
  href?: string;
  children: React.ReactNode;
}

function isValidUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const MarkdownLink: FC<MarkdownLinkProps> = ({ href, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { openPreview } = useBrowserPreview();

  const showPreviewButton = isValidUrl(href);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (href) {
      openPreview(href);
    }
  };

  if (!showPreviewButton) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors"
      >
        {children}
      </a>
    );
  }

  return (
    <span
      className="relative inline-block pr-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors"
      >
        {children}
      </a>
      {isHovered && (
        <button
          type="button"
          onClick={handlePreviewClick}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors shadow-md z-10"
          aria-label="Preview in browser"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-labelledby="preview-icon-title"
          >
            <title id="preview-icon-title">Preview</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      )}
    </span>
  );
};
