const CHUNK_RULES = [
  {
    chunkName: "syntax-highlighter-vendor",
    patterns: ["/react-syntax-highlighter/"],
  },
  {
    chunkName: "prismjs-vendor",
    patterns: ["/prismjs/"],
  },
  {
    chunkName: "refractor-vendor",
    patterns: ["/refractor/"],
  },
  {
    chunkName: "markdown-parser-vendor",
    patterns: [
      "/react-markdown/",
      "/remark-gfm/",
      "/mdast-util-",
      "/micromark-",
      "/hast-util-",
      "/unist-util-",
    ],
  },
  {
    chunkName: "xterm-vendor",
    patterns: ["/@xterm/"],
  },
] as const;

export const getManualChunkName = (moduleId: string): string | undefined => {
  if (!moduleId.includes("/node_modules/")) {
    return undefined;
  }

  for (const rule of CHUNK_RULES) {
    if (rule.patterns.some((pattern) => moduleId.includes(pattern))) {
      return rule.chunkName;
    }
  }

  return undefined;
};
