#!/bin/sh
set -eu

fo_app_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fo_export_output=$(mktemp -d "${TMPDIR:-/tmp}/dadamjang-fo-android-export.XXXXXX")

cleanup_fo_export() {
  rm -rf -- "$fo_export_output"
}

trap cleanup_fo_export EXIT HUP INT TERM

cd "$fo_app_root"
EXPO_NO_TELEMETRY=1 pnpm exec expo export --platform android --source-maps --clear --output-dir "$fo_export_output"

node - "$fo_export_output" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const exportRoot = process.argv[2];
const mapFiles = [];
const pending = [exportRoot];

while (pending.length) {
  const current = pending.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const filePath = path.join(current, entry.name);
    if (entry.isDirectory()) pending.push(filePath);
    else if (entry.name.endsWith(".map")) mapFiles.push(filePath);
  }
}

if (!mapFiles.length) throw new Error("Android export emitted no source map");

const sources = mapFiles.flatMap((filePath) => {
  const sourceMap = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const maps = sourceMap.sections?.map((section) => section.map) ?? [sourceMap];
  return maps.flatMap((map) => map.sources ?? []);
});

for (const requiredSource of [
  "packages/mobile/src/action-button/action-button.android.tsx",
  "packages/mobile/src/action-button-group/action-button-group.android.tsx",
]) {
  if (!sources.some((source) => source.includes(requiredSource))) {
    throw new Error(`Android source map omitted ${requiredSource}`);
  }
}

const leakedIosSources = sources.filter(
  (source) => source.includes("packages/mobile/src/") && source.includes(".ios."),
);

if (leakedIosSources.length) {
  throw new Error(`Android source map includes iOS mobile sources:\n${leakedIosSources.join("\n")}`);
}

if (sources.some((source) => source.includes("material-symbol-source.android."))) {
  throw new Error("Android source map includes the removed async symbol shim");
}
NODE
