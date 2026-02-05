/**
 * Language detection mapping from file extension to syntax highlighter language
 * Based on react-syntax-highlighter supported languages
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  ps1: "powershell",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  rb: "ruby",
  php: "php",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  swift: "swift",
  m: "objectivec",
  mm: "objectivec",
  r: "r",
  lua: "lua",
  vim: "vim",
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmake: "cmake",
  tf: "hcl",
  hcl: "hcl",
  proto: "protobuf",
  prisma: "prisma",
  vue: "javascript",
  svelte: "javascript",
  astro: "javascript",
  zig: "zig",
  elm: "elm",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  clj: "clojure",
  cljs: "clojure",
  cljc: "clojure",
  hs: "haskell",
  lhs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  fs: "fsharp",
  fsx: "fsharp",
  fsi: "fsharp",
  pl: "perl",
  pm: "perl",
  nim: "nim",
  d: "d",
  dart: "dart",
  v: "v",
  sol: "solidity",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  env: "bash",
  gitignore: "text",
  editorconfig: "ini",
  txt: "text",
};

/**
 * Detects the programming language from a file path for syntax highlighting
 *
 * @param filePath - The file path to detect language from
 * @returns The language identifier for react-syntax-highlighter
 */
export const detectLanguage = (filePath: string): string => {
  // Handle special filenames without extension
  const basename = filePath.split("/").pop() ?? "";
  const lowerBasename = basename.toLowerCase();

  if (lowerBasename === "dockerfile") return "dockerfile";
  if (lowerBasename === "makefile") return "makefile";
  if (lowerBasename.startsWith(".env")) return "bash";

  // Extract extension
  const lastDot = basename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === basename.length - 1) {
    return "text";
  }

  const ext = basename.slice(lastDot + 1).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] ?? "text";
};
