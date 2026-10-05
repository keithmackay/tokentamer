# Implementation Plan — improve-this findings (2026-10-05)

Source: `docs/reviews/2026-10-05-improve-this.md`, findings #1–#16 (all selected).

Convention throughout: every shared file edited at the root (`references/*`, `scripts/scan-transcripts.js`) is mirrored to `skills/tokentamer/`, and `scripts/check-sync.sh` must pass at the end of each phase.

## Phase 1 — Privacy (Finding #2)

1. `git rm -r --cached .sessionstats` and add `.sessionstats/` to `.gitignore`. Keep the local files.
2. History rewrite (purging the data from past commits and force-pushing a public repo) is destructive and outward-facing — **ask the user before doing it**; do not do it as part of this plan by default.

## Phase 2 — Scanner correctness (Findings #1, #3, #4, #8, #13, #15)

1. **#1 / #4 — meta entries and skill loads.** User entries with `isMeta: true` are not user turns: skip them from `turns`. When such an entry starts with `Base directory for this skill: <path>`, record a `skillLoads` entry `{ skill, timestamp, length }` (skill = basename of the path). Also skip `isSidechain` user entries (subagent prompts, not the human).
2. **#4 — slash commands.** Before stripping tags, detect `<command-name>/name</command-name>` in user content and push `{ skill: name, timestamp, source: "slash" }` to `skillInvocations`; tag `Skill`-tool entries with `source: "tool"`.
3. **#3 — token usage.** Assistant entries repeat once per content block with the same `message.id` (verified: 107 entries / 59 messages in a sample). Deduplicate by `message.id` and sum `message.usage` into `session.tokens` `{ input, cacheCreation, cacheRead, output }` and into per-model totals. Make `modelsUsed` count unique messages, not entries.
4. **#3 — read/fetch targets.** Record `readTargets` as `{ "<Tool>:<path-or-url>": count }` for `Read` (`file_path`), `WebFetch` (`url`), and any tool input with a `file_path`/`url`/`path` that's a read-type tool (`Read`, `NotebookRead`, `WebFetch`).
5. **#8 — NDJSON.** Always emit one line per session (`JSON.stringify(session)`), with or without `--full`.
6. **#13 — path encoding.** Encode with `replace(/[^a-zA-Z0-9]/g, "-")` to match Claude Code.
7. **#15 — arguments.** Parse argv properly: the project dir is the first positional argument that is not the value of `--session`; `--session` with no id is a usage error (exit 1).
8. Update the header usage comment and mirror the file.

## Phase 3 — Tests (Finding #12)

1. Add `test/fixtures/` with a synthetic `~/.claude/projects/<encoded>/` tree containing one JSONL that exercises: a plain user turn, an array-content user turn, an `isMeta` skill body, a slash-command entry, an `isSidechain` user entry, a duplicated assistant message with `usage`, `Read`/`WebFetch`/MCP/`Skill` tool calls, and a project path containing an underscore and space.
2. Add `test/scan-transcripts.test.js` using `node:test`, running the scanner with `HOME` pointed at the fixture root, asserting the fields from Phase 2 and that `--full` output is exactly one line per session, and that the arg-parsing errors fire.
3. Add a minimal `package.json` (`"type": "module"`, `"private": true`, `"scripts": { "test": "node --test test/ && bash scripts/check-sync.sh" }`).
4. Update README Development section: replace "no test suite" with `npm test`.

## Phase 4 — Skill body: progressive disclosure, clarity, paths, memory (Findings #6, #10, #11, #16-part)

1. **#6** — Move the Fix Mode section verbatim into `references/fix-mode.md` (platform-neutral wording for the multi-select step: "AskUserQuestion with `multiSelect: true` if available, else a plain numbered list"), mirror it, and leave a one-line pointer under `### --fix` in both `SKILL.md` copies.
2. **#10** — Step 2: run the scanner by its path inside this skill's directory (`<skill-dir>/scripts/scan-transcripts.js`), writing output to the session scratchpad / a temp dir rather than a fixed `/tmp/scan.ndjson`. Describe the new output fields (`tokens`, `readTargets`, `skillLoads`).
3. **#11** — Step 3: look for memory in `~/.claude/projects/<encoded-target>/memory/` (MEMORY.md + entries) as well as project-root harness files. Fix Mode: save missed-memory items into the **audited project's** memory directory (one file per fact, indexed in its MEMORY.md), not the current session's project, unless they're the same. `split-guide.md`: for MEMORY.md, split into individual memory files rather than a `references/` dir.
4. **#16** — Root `SKILL.md` step 6: if Artifact publishing isn't available on the platform (e.g. Antigravity), just hand back the markdown file.
5. **Clarity pass** — use the `plsfix` skill on the remaining always-loaded body of `SKILL.md` (scoped to tightening, keeping the structure and every behavioral rule), then re-apply the platform-specific differences to `skills/tokentamer/SKILL.md`. Target: both copies under ~500 words.
6. Update `categories.md`: "Oversized prompts" no longer confounded by skill bodies; "Redundant reads" uses `readTargets`; "Skills without progressive disclosure" uses `skillLoads` sizes; MCP row renamed to "MCP tools used late or rarely" with the existing caveat. Update `report-template.md` Cost line to cite `tokens` figures where available. Fix the "step 4" reference in `platform-limitations.md`.

## Phase 5 — Gemini context file (Finding #5)

Replace the `@`-imports in `GEMINI.md` with a short pointer: when the user asks for a token-waste / Claude Code usage audit, read `skills/tokentamer/SKILL.md` from this extension's directory and follow it (reference files are loaded on demand from the same folder). This drops ~2,000 always-loaded words to ~50.

## Phase 6 — Docs, sync, versioning (Findings #7, #9, #14, #16-rest)

1. **#14** — Add `references/split-guide.md` and `references/fix-mode.md` to `check-sync.sh`'s `FILES`.
2. **#7** — Add `--fix` to both `help.md` files and to the README Usage section. Bump manifests to `1.4.0`; add a `[1.4.0]` CHANGELOG entry listing `--fix` and this round's fixes; remove the duplicate "Initial commit" line. (Creating the GitHub tag/release is left to the user / `git-release`.)
3. **#9** — README: replace `https://github.com/<owner>/tokentamer` and `git clone <repo>` with `keithmackay/tokentamer`. `version-check.md` step 3b: use the first GitHub URL whose repo name is `tokentamer`, ignoring placeholders and unrelated repos.
4. **#16** — README install: `mkdir -p ~/.claude/skills` before `cp`; update the scanner-output description to include the new fields. These are targeted fixes, so `make-readme` (which generates/restructures whole READMEs) isn't needed here.

## Verification

- `npm test` passes (node tests + `check-sync.sh`).
- `node scripts/scan-transcripts.js "$PWD" --session 1c671858-eed2-4bd7-996b-e2afc04f17d8` shows real user turns only, two `skillLoads`, two slash `skillInvocations`, non-zero `tokens`, and `--full` output is one line.
- `wc -w SKILL.md skills/tokentamer/SKILL.md` both ≤ ~500.
- `grep -- --fix help.md skills/tokentamer/help.md README.md` finds each.

## Commit

Commit and push to `main` per the user's global CLAUDE.md once tests pass.
