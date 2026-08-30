#!/usr/bin/env bash
set -euo pipefail

platform="${1:-}"

case "$platform" in
  ios|android) ;;
  *)
    printf 'usage: %s <ios|android>\n' "$0" >&2
    exit 64
    ;;
esac

: "${E2E_PRODUCT_ID:?E2E_PRODUCT_ID is required}"
command -v maestro >/dev/null || {
  printf 'Maestro CLI is required. Install Maestro 2.9.0 before running this smoke test.\n' >&2
  exit 127
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir/../apps/dadamjang-fo"
exec maestro test ".maestro/${platform}-smoke.yaml"
