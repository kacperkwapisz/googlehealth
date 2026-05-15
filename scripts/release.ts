#!/usr/bin/env bun
/**
 * Lockstep release script for googlehealth + googlehealth-cli.
 *
 * Usage:
 *   bun scripts/release.ts <patch|minor|major>
 *   bun scripts/release.ts <semver>          # e.g. 0.1.0
 *   bun scripts/release.ts ... --dry-run
 *
 * What it does:
 *   1. Sanity-checks: on `main`, working tree clean, up-to-date with origin/main.
 *   2. Bumps root + every publishable package to the same version.
 *   3. Promotes `## [Unreleased]` → `## [<version>] - <date>` in every package CHANGELOG
 *      and prepends a fresh empty `## [Unreleased]` block.
 *   4. Single commit `release: v<version>`, annotated tag `v<version>`, push branch + tag.
 *
 * The tag push triggers `.github/workflows/release.yml`, which publishes to npm.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = new URL("..", import.meta.url).pathname;
const PUBLISHABLE_PACKAGES = ["packages/sdk", "packages/cli"] as const;

const UNRELEASED_TEMPLATE = `## [Unreleased]
### Breaking Changes
### Added
### Changed
### Fixed
### Removed
`;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const positional = rawArgs.filter((a) => !a.startsWith("--"));
const bumpArg = positional[0];

if (!bumpArg) {
  die(
    "Missing version argument. Use one of: patch | minor | major | <semver> (e.g. 0.1.0). Add --dry-run to preview.",
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(msg: string): never {
  console.error(`\x1b[31merror\x1b[0m ${msg}`);
  process.exit(1);
}

function info(msg: string): void {
  console.log(`\x1b[36m${dryRun ? "[dry-run] " : ""}\x1b[0m${msg}`);
}

function sh(cmd: string, opts: { allowFail?: boolean } = {}): string {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch (err) {
    if (opts.allowFail) return "";
    throw err;
  }
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function writeJson(path: string, data: Record<string, unknown>): void {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (dryRun) {
    info(`would write ${path}`);
    return;
  }
  writeFileSync(path, text);
}

function isSemver(v: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(v);
}

function bumpSemver(current: string, kind: "patch" | "minor" | "major"): string {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) die(`Cannot parse current version: ${current}`);
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (kind === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") {
  die(`Not on main (currently on ${branch}). Refuse to release from a non-main branch.`);
}

const dirty = sh("git status --porcelain");
if (dirty) {
  die(`Working tree is not clean:\n${dirty}`);
}

sh("git fetch origin main --quiet", { allowFail: true });
const local = sh("git rev-parse HEAD");
const remote = sh("git rev-parse origin/main", { allowFail: true });
if (remote && local !== remote) {
  die("Local main is not in sync with origin/main. Pull or push first.");
}

// ---------------------------------------------------------------------------
// Determine new version
// ---------------------------------------------------------------------------

const rootPkgPath = join(REPO_ROOT, "package.json");
const rootPkg = readJson(rootPkgPath);
const currentVersion = String(rootPkg.version ?? "0.0.0");

let newVersion: string;
if (bumpArg === "patch" || bumpArg === "minor" || bumpArg === "major") {
  newVersion = bumpSemver(currentVersion, bumpArg);
} else if (bumpArg && isSemver(bumpArg)) {
  newVersion = bumpArg;
} else {
  die(`Invalid version argument: ${bumpArg}. Use patch | minor | major | <semver>.`);
}

if (compareSemver(newVersion, currentVersion) <= 0) {
  die(`New version ${newVersion} is not greater than current ${currentVersion}.`);
}

const tag = `v${newVersion}`;
const existingTag = sh(`git tag --list ${tag}`, { allowFail: true });
if (existingTag) {
  die(`Tag ${tag} already exists.`);
}

info(`Current version: ${currentVersion}`);
info(`New version:     ${newVersion}`);
info(`Tag:             ${tag}`);

// ---------------------------------------------------------------------------
// Bump package.json versions (root + every publishable package)
// ---------------------------------------------------------------------------

rootPkg.version = newVersion;
writeJson(rootPkgPath, rootPkg);

for (const pkgDir of PUBLISHABLE_PACKAGES) {
  const pkgPath = join(REPO_ROOT, pkgDir, "package.json");
  const pkg = readJson(pkgPath);
  pkg.version = newVersion;
  writeJson(pkgPath, pkg);
  info(`bumped ${pkgDir}/package.json → ${newVersion}`);
}

// ---------------------------------------------------------------------------
// Promote CHANGELOGs: [Unreleased] → [<version>] - <date>
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);

for (const pkgDir of PUBLISHABLE_PACKAGES) {
  const clPath = join(REPO_ROOT, pkgDir, "CHANGELOG.md");
  let text: string;
  try {
    text = readFileSync(clPath, "utf8");
  } catch {
    die(`Missing CHANGELOG: ${clPath}`);
  }

  const unreleasedIdx = text.indexOf("## [Unreleased]");
  if (unreleasedIdx === -1) {
    die(`No \`## [Unreleased]\` section in ${clPath}`);
  }

  // Find the next `## [` heading after Unreleased; everything between is the Unreleased body.
  const afterUnreleased = unreleasedIdx + "## [Unreleased]".length;
  const nextHeadingRel = text.slice(afterUnreleased).search(/^## \[/m);
  const bodyEnd = nextHeadingRel === -1 ? text.length : afterUnreleased + nextHeadingRel;

  const before = text.slice(0, unreleasedIdx);
  const unreleasedBody = text
    .slice(afterUnreleased, bodyEnd)
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "");
  const rest = text.slice(bodyEnd);

  const promoted = `${UNRELEASED_TEMPLATE}\n## [${newVersion}] - ${today}\n${unreleasedBody}\n\n`;
  const next = `${before}${promoted}${rest}`;

  if (dryRun) {
    info(`would update ${clPath}`);
  } else {
    writeFileSync(clPath, next);
    info(`updated ${pkgDir}/CHANGELOG.md`);
  }
}

// ---------------------------------------------------------------------------
// Commit, tag, push
// ---------------------------------------------------------------------------

const filesToStage = [
  "package.json",
  ...PUBLISHABLE_PACKAGES.flatMap((p) => [`${p}/package.json`, `${p}/CHANGELOG.md`]),
];

if (dryRun) {
  info(`would: git add ${filesToStage.join(" ")}`);
  info(`would: git commit -m "release: ${tag}"`);
  info(`would: git tag -a ${tag} -m "${tag}"`);
  info(`would: git push origin main && git push origin ${tag}`);
  info("Dry run complete. No changes committed.");
  process.exit(0);
}

sh(`git add ${filesToStage.map((f) => `"${f}"`).join(" ")}`);
sh(`git commit -m "release: ${tag}"`);
sh(`git tag -a ${tag} -m "${tag}"`);
info(`committed and tagged ${tag}`);

sh("git push origin main");
sh(`git push origin ${tag}`);
info(`pushed main + ${tag}. CI will publish to npm.`);
