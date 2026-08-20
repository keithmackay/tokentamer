#!/usr/bin/env bash
# ABOUTME: verifies the root and Codex/Gemini-mirror copies of shared tokentamer
# ABOUTME: files stay identical (SKILL.md and help.md differ intentionally — skip those)
set -euo pipefail
cd "$(dirname "$0")/.."

CANONICAL_DIR="."
MIRROR_DIR="skills/tokentamer"

FILES=(
  "references/categories.md"
  "references/report-template.md"
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
