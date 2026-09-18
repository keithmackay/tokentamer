# Implementation Plan — improve-this findings (2026-09-17)

Source: `docs/reviews/2026-09-17-improve-this.md`, findings #1–#4 (all selected).

## Phase 1 — scan-transcripts.js: handle array-content user turns (Finding #1)

1. In `scan-transcripts.js`, extend the user-turn extraction block (currently gated on `typeof entry.message.content === "string"`) to also handle `Array.isArray(entry.message.content)`: iterate the blocks, concatenate any `block.type === "text"` block's `.text` (skip `tool_result` blocks), run the result through the same `stripSystemTags` + `.trim()` + `truncateSafely` pipeline as the string case, and push a turn only if the cleaned text is non-empty.
2. Keep both `scan-transcripts.js` copies (root and `skills/tokentamer/scripts/`) identical — apply the same edit to both, or edit one and copy over the other.
3. Sanity-check: run `node scripts/scan-transcripts.js "$PWD" --session <a-known-session-id>` against this repo's own transcripts (per the README's Development section) and confirm turn count increases for a session known to contain tool-result-following user turns.
4. Run `scripts/check-sync.sh` to confirm the two copies still match.

## Phase 2 — help.md: document --version (Finding #2)

1. Add a `--version` line to the FLAGS section of `help.md` (root), consistent with the existing `--help`/`--full`/`--session` entries, e.g.:
   `--version       Print installed version and check for updates, then stop`
2. Apply the equivalent addition to `skills/tokentamer/help.md` (its FLAGS section wording may already differ slightly from root's per prior platform-limitations edits — match its existing style rather than copy-pasting root's line verbatim).
3. No `check-sync.sh` coverage needed here — it deliberately skips `help.md` (documented as differing by design), so just eyeball both copies for consistency.

## Phase 3 — SKILL.md: extract --version workflow to reduce always-loaded weight (Finding #3, then #4)

1. Create `references/version-check.md` containing the detailed step-by-step `--version` procedure (today's steps 1–5 under `### --version` in `SKILL.md`): manifest lookup order, print format, GitHub source repo detection, `gh api` release comparison, and the four status-line outcomes.
2. Replace that block in `SKILL.md` with a short pointer, e.g.:
   ```
   ### `--version`

   If invoked with `--version`, do not run the workflow — follow `references/version-check.md` instead, then stop.
   ```
3. Mirror the same change in `skills/tokentamer/SKILL.md`, and mirror the new file to `skills/tokentamer/references/version-check.md`.
4. Add `references/version-check.md` to the `FILES` array in `scripts/check-sync.sh` so future drift between the two copies is caught.
5. Run `scripts/check-sync.sh` to confirm sync.
6. Re-run `wc -w SKILL.md skills/tokentamer/SKILL.md` and confirm both are now under (or much closer to) the ~500-word target.
7. Since this makes Finding #4 (the README's ~500-word claim) accurate again, no separate README edit should be needed — re-check the actual word counts against the claim once this phase is done, and only touch the README line if a real gap remains.

## Verification

- `scripts/check-sync.sh` exits 0.
- `node scripts/scan-transcripts.js "$PWD"` runs without error and produces at least one session with the previously-undercounted array-content turns now present.
- Both `SKILL.md` copies are under ~500 words (or the README target is corrected to match reality if not fully achievable without losing necessary content).
- `help.md` (both copies) lists all four real flags: `--help`, `--version`, `--full`, `--session`.

## Commit

Per user's global CLAUDE.md instructions: once the above is verified, commit with an appropriate message describing the fixes (edge-case fix in scanner, help.md flag documentation, SKILL.md progressive-disclosure extraction for --version).
