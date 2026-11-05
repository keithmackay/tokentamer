#!/usr/bin/env bash
# ABOUTME: verifies the root and Codex/Gemini-mirror copies of shared tokentamer
# ABOUTME: files stay identical (every shipped file, including SKILL.md and help.md)
set -euo pipefail
cd "$(dirname "$0")/.."

CANONICAL_DIR="."
MIRROR_DIR="skills/tokentamer"

FILES=(
  "SKILL.md"
  "help.md"
  "references/categories.md"
  "references/fix-mode.md"
  "references/platform-limitations.md"
  "references/report-template.md"
  "references/split-guide.md"
  "references/version-check.md"
  "scripts/scan-transcripts.js"
)

status=0
for f in "${FILES[@]}"; do
  canonical="$CANONICAL_DIR/$f"
  mirror="$MIRROR_DIR/$f"
  if [ ! -f "$mirror" ]; then
    echo "MISSING: $mirror does not exist"
    status=1
    continue
  fi
  if ! diff -q "$canonical" "$mirror" > /dev/null; then
    echo "DRIFT: $mirror does not match $canonical"
    diff "$canonical" "$mirror" || true
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "OK: ${FILES[*]} are in sync between $CANONICAL_DIR and $MIRROR_DIR"
fi

exit "$status"
