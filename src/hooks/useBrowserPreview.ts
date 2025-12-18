import { createContext, useContext } from "react";

interface BrowserPreviewContextValue {
  previewUrl: string | null;
  previewWidth: number; // percentage
  openPreview: (url: string) => void;
  closePreview: () => void;
  reloadPreview: () => void;
}

export const BrowserPreviewContext = createContext<
  BrowserPreviewContextValue | undefined
>(undefined);

export function useBrowserPreview(): BrowserPreviewContextValue {
  const context = useContext(BrowserPreviewContext);
  if (!context) {
    throw new Error(
      "useBrowserPreview must be used within a BrowserPreviewProvider",
    );
  }
  return context;
}
