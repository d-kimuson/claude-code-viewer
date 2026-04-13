import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import inquirer from "inquirer";

const root = join(import.meta.dirname, "..");

const run = (cmd: string): string => execSync(cmd, { cwd: root, encoding: "utf-8" }).trim();

const runOrFail = (cmd: string, label: string): void => {
  try {
    execSync(cmd, { cwd: root, stdio: "inherit" });
  } catch {
    console.error(`\n✗ ${label} failed. Aborting release.`);
    process.exit(1);
  }
};

// -- Read current version --

const pkgPath = join(root, "package.json");
const pkg: Record<string, unknown> = JSON.parse(readFileSync(pkgPath, "utf-8"));
const current = pkg.version;

if (typeof current !== "string") {
  console.error("✗ version field not found in package.json");
  process.exit(1);
}

console.log(`Current version: ${current}\n`);

// -- Check clean working tree --

const status = run("git status --porcelain");
if (status !== "") {
  console.error("✗ Working tree is not clean. Commit or stash changes first.");
  process.exit(1);
}

// -- Check signing config --

const gpgFormat = run("git config --get gpg.format").toLowerCase();
const commitSign = run("git config --get commit.gpgsign").toLowerCase();
const tagSign = run("git config --get tag.gpgsign").toLowerCase();

if (gpgFormat !== "ssh" || commitSign !== "true" || tagSign !== "true") {
  console.error("✗ Git signing is not configured. Required:");
  console.error("  git config --global gpg.format ssh");
  console.error("  git config --global commit.gpgsign true");
  console.error("  git config --global tag.gpgsign true");
  process.exit(1);
}

// -- Prompt version --

const parseVersion = (
  v: string,
): { major: number; minor: number; patch: number; pre: string | undefined } => {
  const [base, pre] = v.split("-");
  const segments = (base ?? "").split(".").map(Number);
  return {
    major: segments[0] ?? 0,
    minor: segments[1] ?? 0,
    patch: segments[2] ?? 0,
    pre,
  };
};

const bumpChoices = (v: string): { name: string; value: string }[] => {
  const { major, minor, patch, pre } = parseVersion(v);

  if (pre !== undefined) {
    const preParts = pre.split(".");
    const preTag = preParts[0] ?? "beta";
    const preNum = Number(preParts[1] ?? 0);
    const nextPre = `${major}.${minor}.${patch}-${preTag}.${preNum + 1}`;
    return [
      { name: `${preTag} (${nextPre})`, value: nextPre },
      {
        name: `patch (${major}.${minor}.${patch})`,
        value: `${major}.${minor}.${patch}`,
      },
      {
        name: `minor (${major}.${minor + 1}.0)`,
        value: `${major}.${minor + 1}.0`,
      },
      { name: `major (${major + 1}.0.0)`, value: `${major + 1}.0.0` },
    ];
  }

  const nextPatch = `${major}.${minor}.${patch + 1}`;
  return [
    { name: `patch (${nextPatch})`, value: nextPatch },
    {
      name: `minor (${major}.${minor + 1}.0)`,
      value: `${major}.${minor + 1}.0`,
    },
    { name: `major (${major + 1}.0.0)`, value: `${major + 1}.0.0` },
    { name: `beta (${nextPatch}-beta.0)`, value: `${nextPatch}-beta.0` },
  ];
};

const { version } = await inquirer.prompt<{ version: string }>([
  {
    type: "rawlist",
    name: "version",
    message: "Select release version:",
    choices: [...bumpChoices(current), { name: "Custom", value: "custom" }],
  },
]);

const nextVersion =
  version === "custom"
    ? (
        await inquirer.prompt<{ custom: string }>([
          { type: "input", name: "custom", message: "Enter version:" },
        ])
      ).custom
    : version;

const tag = `v${nextVersion}`;

// -- Confirm --

const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
  {
    type: "confirm",
    name: "confirmed",
    message: `Release ${tag}? This will commit, tag (signed), and push.`,
    default: false,
  },
]);

if (!confirmed) {
  console.log("Aborted.");
  process.exit(0);
}

// -- Pre-release checks --

console.log("\nRunning checks...\n");
runOrFail("pnpm lint", "Lint");
runOrFail("pnpm typecheck", "Typecheck");
runOrFail("pnpm test", "Test");
runOrFail("./scripts/lingui-check.sh", "Lingui check");
console.log("\n✓ All checks passed.\n");

// -- Update package.json --

pkg.version = nextVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`\nUpdated package.json to ${nextVersion}`);

// -- Signed commit + signed tag --

run("git add package.json");
runOrFail(`git commit -S -m "chore: release ${tag}"`, "Signed commit");
runOrFail(`git tag -s ${tag} -m ${tag}`, "Signed tag");

console.log(`\nCreated signed commit and tag ${tag}`);

// -- Push --

runOrFail("git push", "Push commits");
runOrFail("git push --tags", "Push tags");

console.log(`\n✓ Released ${tag} — GitHub Actions will publish to npm.`);
