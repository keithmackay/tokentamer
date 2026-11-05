# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.6.0] - 2026-11-05

- Scanner: compaction summaries, local-command/shell output and interrupt markers are no longer counted as human turns; they're reported as `compactions` (a context-pressure signal) and `interruptions`
- Scanner: `<synthetic>` placeholder replies are ignored for `modelsUsed`, `tokensByModel` and per-turn `model`
- Scanner: subagent MCP calls count toward `mcpToolUsage`; subagents also report `mcpToolCalls` and `skillInvocations`
- Scanner: sessions from nested worktrees (`.worktrees/<name>`, `.claude/worktrees/<name>`) are included and tagged with `worktree`
- Scanner: streams transcripts line by line (about 45% lower peak memory on 50 MB files)
- Slash commands with arguments and `!` shell commands are kept as turns in readable form
- One platform-aware `SKILL.md` and `help.md` for every platform; Claude Code marketplace installs no longer get the Codex/Gemini wording. `check-sync.sh` now covers them and the shared `platform-limitations.md`
- Add `.claude-plugin/plugin.json`; `--version` now finds the manifest from a plugin's `skills/tokentamer/` folder
- Reports mask credential-like strings in quoted evidence
- README: compatibility table moved before installation

## [1.5.0] - 2026-11-04

- Scanner: read subagent transcripts (`<session>/subagents/*.jsonl` + `.meta.json`) and emit `subagents` (type, requested model, brief length, tokens, tool calls, read targets) and `subagentTokens`; main-thread `tokens` are unchanged
- Scanner: tag each human turn with the `model` that answered it, so "Wrong model" findings are turn-level
- Scanner: emit `mcpToolUsage` (per MCP server, tools available vs used) and `mcpServers` from Claude Code's tool-listing attachments
- Scanner: emit `skillListing` (count and size of the always-loaded skill catalog)
- Categories: MCP row is now "MCP servers connected but unused"; new "Always-on listing overhead" and "Subagent delegation" categories
- Add consolidated plan `docs/plans/improve-this-2026-11-04.md`

## [1.4.0] - 2026-10-05

- Add `--fix` mode: offers to apply fixable findings (split verbose harness/skill files, save missed memories) after the report, with per-item confirmation
- Scanner: stop counting injected skill bodies and subagent prompts as user turns; report them as `skillLoads` instead
- Scanner: record slash-command skill invocations (`source: "slash"`) alongside `Skill` tool calls
- Scanner: add per-session and per-model token totals (deduplicated by message id) and `readTargets` for repeated reads/fetches
- Scanner: `--full` output is now one line per session (valid NDJSON); path encoding matches Claude Code for paths with spaces/underscores; stricter argument parsing
- Add fixture-based tests (`npm test`) covering the scanner and sync check
- Move Fix Mode into `references/fix-mode.md`; SKILL.md back under ~500 words
- GEMINI.md now points to the skill on demand instead of importing it into every Gemini session
- Missed memories are saved to the audited project's memory directory; Claude Code memory location included in harness-file review
- Stop tracking `.sessionstats/`; fix README placeholders and `--version` repo detection; `check-sync.sh` covers all shared references

## [1.3.0] - 2026-09-20

- Version bump only

## [1.2.0] - 2026-09-17

- Document mackayi marketplace installation in README
- Add --version flag support, reporting installed version and a best-effort GitHub update check
- Add Changelog section to README linking CHANGELOG.md
- Fix version drift, add sync check, harden truncation, extract platform limitations
- Fix scanner dropping user turns with array-shaped content (tool-result follow-ups)
- Document --version in help.md
- Extract --version procedure out of SKILL.md into references/version-check.md for progressive disclosure

## [1.1.0] - 2026-08-20

- Add --help mechanism (help.md) for both SKILL.md copies

## [1.0.0] - 2026-08-20

- Initial commit: tokentamer skill
- Add .gitignore

