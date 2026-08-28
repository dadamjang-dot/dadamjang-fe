import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = join(root, "apps/dadamjang-fo");
const expectedVersion = "57.0.16";

for (const platform of ["android", "apple"]) {
  const result = spawnSync(
    "pnpm",
    [
      "--dir",
      app,
      "exec",
      "expo-modules-autolinking",
      "search",
      "--platform",
      platform,
      "--json",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || `Autolinking failed for ${platform}`);
  }

  const constants = JSON.parse(result.stdout)["expo-constants"];
  const versions = [
    constants?.version,
    ...(constants?.duplicates ?? []).map(({ version }) => version),
  ].filter(Boolean);
  if (
    constants?.version !== expectedVersion ||
    constants.duplicates.length > 0 ||
    new Set(versions).size !== 1
  ) {
    throw new Error(
      `${platform} expo-constants autolinking mismatch: ${versions.join(", ")}`,
    );
  }
}

console.log(
  `Android/iOS autolink expo-constants ${expectedVersion} exactly once.`,
);
