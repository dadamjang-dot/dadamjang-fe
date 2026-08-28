import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "prettier";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const supportedExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);
const ignoredDirectories = new Set([
  ".expo",
  ".next",
  "android",
  "build",
  "coverage",
  "dist",
  "ios",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const collectFiles = async (directory) => {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (
      entry.isFile() &&
      entry.name !== "next-env.d.ts" &&
      supportedExtensions.has(extname(entry.name))
    )
      files.push(path);
  }
  return files;
};

const formattingViolations = async (files) => {
  const violations = [];
  for (const file of files.sort()) {
    const source = await readFile(file, "utf8");
    if (!(await check(source, { filepath: file })))
      violations.push({
        path: relative(workspace, file),
        source,
      });
  }
  return violations;
};

const ownedFiles = (
  await Promise.all(
    ["apps/dadamjang-bo", "apps/dadamjang-partner", "packages"].map((path) =>
      collectFiles(join(workspace, path)),
    ),
  )
).flat();
ownedFiles.push(
  join(workspace, "package.json"),
  join(workspace, "scripts/verify-format.mjs"),
  join(workspace, "scripts/verify-web-release-policy.mjs"),
);
const foFiles = await collectFiles(join(workspace, "apps/dadamjang-fo/src"));
const [ownedViolations, foViolations] = await Promise.all([
  formattingViolations(ownedFiles),
  formattingViolations(foFiles),
]);
const failures = [];

if (ownedViolations.length > 0)
  failures.push(
    `Formatting violations:\n${ownedViolations.map(({ path }) => path).join("\n")}`,
  );
if (foViolations.length > 0)
  failures.push(
    `Formatting violations:\n${foViolations.map(({ path }) => path).join("\n")}`,
  );
if (failures.length > 0) throw new Error(failures.join("\n"));

console.log("Formatting verified; 0 violations");
