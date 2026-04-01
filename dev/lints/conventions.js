/**
 * oxlint JS plugin — project conventions.
 *
 * Rules:
 *   - no-barrel-file: index.ts(x) files that only re-export are prohibited
 *   - colocated-tests: test files must sit next to their source, not in __tests__/
 *   - module-boundaries: enforce frontend/backend import boundaries
 */

const RE_REEXPORT = /^\s*export\s+(?:\{[^}]*\}\s+from|type\s+\{[^}]*\}\s+from|\*\s+from)\s/;

const noBarrelFile = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const base = filename.split(/[\\/]/).pop();

    if (base !== "index.ts" && base !== "index.tsx") {
      return {};
    }

    return {
      Program(node) {
        const text = context.sourceCode.getText(node);
        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "" && !line.startsWith("//"));

        if (lines.length === 0) {
          return;
        }

        const allReexports = lines.every((line) => RE_REEXPORT.test(line));

        if (allReexports) {
          context.report({
            node,
            message:
              "Barrel files (index.ts(x) with only re-exports) are prohibited. Import directly from source modules.",
          });
        }
      },
    };
  },
};

const RE_TEST_DIR = /(?:^|[/\\])__tests?__(?:[/\\]|$)/;

const colocatedTests = {
  create(context) {
    const filename = context.filename ?? context.getFilename();

    if (!RE_TEST_DIR.test(filename)) {
      return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          message:
            "Test files must be colocated with their source files, not placed in __tests__/ directories.",
        });
      },
    };
  },
};

const RE_FRONTEND_FILE = /[/\\]src[/\\](app|components|hooks|routes)[/\\]/;
const RE_BACKEND_FILE = /[/\\]src[/\\]server[/\\]/;

const resolveTargetDomain = (source) => {
  if (typeof source !== "string") {
    return null;
  }

  // Absolute project alias (tsconfig paths: @/* -> src/*)
  if (/^@\/server(?:[/\\]|$)/.test(source)) {
    return "backend";
  }

  if (/^@\/(app|components|hooks|routes)(?:[/\\]|$)/.test(source)) {
    return "frontend";
  }

  // Relative paths crossing boundaries
  if (/(?:^|[/\\])server[/\\]/.test(source)) {
    return "backend";
  }

  if (/(?:^|[/\\])(app|components|hooks|routes)[/\\]/.test(source)) {
    return "frontend";
  }

  return null;
};

const getSourceDomain = (filename) => {
  if (RE_BACKEND_FILE.test(filename)) {
    return "backend";
  }

  if (RE_FRONTEND_FILE.test(filename)) {
    return "frontend";
  }

  return null;
};

const moduleBoundaries = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const fromDomain = getSourceDomain(filename);

    if (!fromDomain) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const sourceValue = node.source.value;
        const toDomain = resolveTargetDomain(sourceValue);

        if (!toDomain || fromDomain === toDomain) {
          return;
        }

        const typeOnly = node.importKind === "type";

        // Frontend can import backend only as type-only (Hono RPC shared types)
        if (fromDomain === "frontend" && toDomain === "backend" && typeOnly) {
          return;
        }

        const hint =
          fromDomain === "frontend" && toDomain === "backend"
            ? " Use `import type` when you need shared API types."
            : "";

        context.report({
          node,
          message: `Module boundary violation: ${fromDomain} code must not import ${toDomain} code.${hint}`,
        });
      },
    };
  },
};

const plugin = {
  meta: {
    name: "conventions",
  },
  rules: {
    "no-barrel-file": noBarrelFile,
    "colocated-tests": colocatedTests,
    "module-boundaries": moduleBoundaries,
  },
};

export default plugin;
