import { createHash } from "node:crypto";
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
const foBaselineDigest =
  "2c7e463269788884bacd814d184b0f9744423a5a90a13dec56d5f227461f5d1c";

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

const digestViolations = (violations) => {
  const digest = createHash("sha256");
  for (const violation of violations) {
    digest.update(violation.path);
    digest.update("\0");
    digest.update(violation.source);
    digest.update("\0");
  }
  return digest.digest("hex");
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
const foDigest = digestViolations(foViolations);
const failures = [];

if (ownedViolations.length > 0)
  failures.push(
    `Formatting violations:\n${ownedViolations.map(({ path }) => path).join("\n")}`,
  );
if (foViolations.length > 0 && foDigest !== foBaselineDigest)
  failures.push(
    `FO formatting baseline changed: ${foDigest}\n${foViolations.map(({ path }) => path).join("\n")}`,
  );
if (failures.length > 0) throw new Error(failures.join("\n"));

console.log(
  `Formatting verified; ${foViolations.length} unchanged FO baseline files remain`,
);
