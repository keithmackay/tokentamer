# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

