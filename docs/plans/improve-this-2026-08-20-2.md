# Implementation Plan — tokentamer improve-this findings (v1.1.0 review)

Source review: `docs/reviews/2026-08-20-improve-this-2.md`

## Phase 1 — Fix manifest version drift (finding #1)
1. Bump `"version"` in `.codex-plugin/plugin.json` and `gemini-extension.json` from `1.0.0` to `1.1.0` to match the actual GitHub release tag.
2. Going forward, bump these two files as part of every `/git-release` version tag, not as an afterthought — consider adding a note to this effect near the version fields or in CONTRIBUTING guidance.

## Phase 2 — Document the --help mechanism (finding #2)
3. Use the `make-readme` skill to add a short mention of `--help` to the README's Usage section (e.g. `/tokentamer --help` shows this help text without running the workflow) — this is a Completeness gap, and make-readme already owns README generation/improvement so it should make this edit rather than a one-off hand edit.

## Phase 3 — Add a sync check between the duplicated trees (finding #3)
4. Add a `scripts/check-sync.sh` (mirroring the pattern already used by the sibling `url-eval` project) that diffs `references/*.md` and `scripts/scan-transcripts.js` against their `skills/tokentamer/` counterparts and exits non-zero on drift.
5. Mention the check in the Development section of the README (already owned by make-readme — fold into the same pass as Phase 2 if convenient).

## Phase 4 — Token efficiency pass on the ported SKILL.md (finding #4)
6. Extract the **Platform Limitations** table and PORTER comment block out of `skills/tokentamer/SKILL.md` into `skills/tokentamer/references/platform-limitations.md` (or a shared `references/platform-limitations.md` if content ends up identical enough to link from both copies), referenced on demand rather than always loaded.
7. Use the `plsfix` skill to do a clarity/token-efficiency pass on the remaining `skills/tokentamer/SKILL.md` content once the table is extracted, confirming it lands under (or much closer to) the ~500-word target.

## Phase 5 — Clarify docs/ purpose (finding #5)
8. Either add a one-line note in the README (or a `docs/README.md`) explaining that `docs/reviews/` and `docs/plans/` are internal dev-history artifacts from `improve-this` passes, not user-facing documentation — or move them out of the publicly-shipped tree (e.g. into a `.github/` subfolder or a private history location) if they're not meant to be part of the public release surface. Low priority — decide intent first, implement after.

## Phase 6 — Harden truncation for multi-byte characters (finding #6)
9. In `scan-transcripts.js`, replace the raw `cleaned.slice(0, 400)` with a codepoint-aware truncation (e.g. `Array.from(cleaned).slice(0, 400).join('')`, or a regex-based grapheme-safe truncate) so a surrogate pair straddling the boundary isn't split. Low priority — defer until it's actually observed with real transcript data.
