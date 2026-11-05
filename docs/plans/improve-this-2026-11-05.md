# Implementation Plan — improve-this findings (2026-11-05)

Source: `docs/reviews/2026-11-04-improve-this.md`, findings #1–#10 (all selected).

Convention: every shared file is mirrored to `skills/tokentamer/`, and `npm test` (node tests + `check-sync.sh`) must pass at the end of each phase. Tests come before code for scanner changes.

**Implementation status (2026-11-05):** Phases 1–7 are done in v1.6.0. Phase 5.5 (the mackayi marketplace description) is left to the user. Added along the way: `version-check.md` now resolves manifests from the plugin root when the skill runs from `skills/tokentamer/`; the scanner field reference moved from SKILL.md step 2 into `categories.md` to keep SKILL.md at 477 words.

## Phase 1 — Realistic fixtures first (Finding #6)

1. Add `test/fixtures/realistic.jsonl` (its own fake project, `/Users/test/real`) built from entry types seen in real transcripts:
   - an `isCompactSummary: true` user entry ("This session is being continued…")
   - a `<local-command-caveat>` entry and a `<local-command-stdout>` entry
   - a `[Request interrupted by user]` entry
   - a human turn answered first by a `<synthetic>` assistant entry, then by a real model
   - a subagent (under `realistic-session/subagents/`) that calls an MCP tool and a `Skill`
   - a session file inside a nested worktree project folder (`-Users-test-real--worktrees-feat`) and one inside `-Users-test-real--claude-worktrees-x`
2. Write failing tests for Phases 2–3 against it.

## Phase 2 — Scanner accuracy (Findings #1, #3, #4)

1. **#1 Non-human turns.** Skip user entries with `isCompactSummary` and record `compactions: [{ timestamp, length }]` instead. Skip turns whose cleaned text is only local-command output (`<local-command-stdout|stderr|caveat>`) or the interrupt marker `[Request interrupted by user…]`; count the interrupts as `interruptions`.
2. **#4 `<synthetic>`.** Ignore `<synthetic>` (and any model starting with `<`) for `modelsUsed`, `tokensByModel` and per-turn attribution, so a turn takes the first real model that replies.
3. **#3 Subagent MCP.** Emit `mcpToolCalls` and `skillInvocations` per subagent. Compute `mcpToolUsage.used` from main-thread *and* subagent calls.

## Phase 3 — Worktrees (Finding #7)

1. Also scan sibling transcript folders for worktrees nested in the project: `<encoded>--worktrees-*` (`.worktrees/<name>`) and `<encoded>--claude-worktrees-*` (`.claude/worktrees/<name>`). Tag those sessions with `worktree: "<name>"` (null for the main checkout).
2. SKILL step 1: say that nested worktrees are included automatically, and that a worktree living *outside* the project (a sibling directory) needs its own scan.

## Phase 4 — Streaming reader (Finding #9)

1. Replace `readFileSync` + `split` with `readline` over `fs.createReadStream`, so memory stays at about one line rather than the whole file. Output is unchanged; the tests prove it.

## Phase 5 — One platform-aware skill body (Findings #2, #5)

1. **#2** Make `SKILL.md` and `skills/tokentamer/SKILL.md` identical and platform-aware, so whichever copy a platform loads (the Claude Code marketplace loads `skills/tokentamer/`) behaves correctly:
   - Step 4: delegate where subagents are available, otherwise analyze in the main session.
   - Step 6: offer Artifact publishing only where the platform can publish, otherwise hand back the markdown file.
   - Point to `references/platform-limitations.md` for the per-platform table.
2. Move `platform-limitations.md` to the root `references/` too (rewritten as a per-platform table, not "this platform"). Add `SKILL.md`, `help.md` and `platform-limitations.md` to `check-sync.sh`.
3. Add `.claude-plugin/plugin.json` (name, version, description, author, repository), so a Claude Code marketplace install has a manifest and `--version` reads the right file. Add it to the release version bump.
4. **#5** Rewrite `help.md` once (both copies identical): the current category list, platform-neutral optional-skill wording, and the scanner's new output.
5. Out of repo: update the stale "v1.3.0" description in the `keithmackay/mackayi` marketplace entry. Flag it for the user, because it's a separate repo.

## Phase 6 — Redaction, README (Findings #8, #10)

1. **#8** SKILL step 5 and `report-template.md`: mask anything that looks like a credential (API keys, tokens, passwords, private URLs with secrets) in quoted evidence before writing or publishing the report.
2. **#10** README: move Compatibility up to straight after Highlights, so it's read before Installation. Turn the plugin-namespacing rows into one plain "optional Claude Code skills" row, and update the Development section for the new sync coverage. Targeted edits; `make-readme` isn't needed.

## Phase 7 — Release prep

1. Bump the manifests (Codex, Gemini, new Claude) to 1.6.0, add a CHANGELOG `[1.6.0]` entry, and keep both SKILL.md copies under ~500 words.
2. Verify against real data: findsafeskills session `f9fbe855` has no "being continued" turns and a non-empty `compactions`; session `28833cf1`'s first turn is not `<synthetic>`.
3. Commit and push to `main`.
