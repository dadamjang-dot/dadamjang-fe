#!/bin/sh
set -eu

fo_app_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fo_export_output=$(mktemp -d "${TMPDIR:-/tmp}/dadamjang-fo-android-export.XXXXXX")

cleanup_fo_export() {
  rm -rf -- "$fo_export_output"
}

trap cleanup_fo_export EXIT HUP INT TERM

cd "$fo_app_root"
EXPO_NO_TELEMETRY=1 pnpm exec expo export --platform android --output-dir "$fo_export_output"
