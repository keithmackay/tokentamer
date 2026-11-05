---
name: tokentamer
description: Use when the user wants to audit a project's Claude Code usage for wasted tokens or cost — e.g. "review our sessions for token waste", "how could we have saved tokens on this project", "audit our prompts/context usage", "find where we polluted context", "check if we're using the right model/MCPs/skills efficiently". Analyzes transcript history, not the codebase itself.
---

# Tokentamer

## Flags

- `--help` — don't run the workflow; display `help.md` (in this skill's folder) verbatim, then stop.
- `--version` — don't run the workflow; follow `references/version-check.md`, then stop.
- `--fix` — run the workflow, then follow `references/fix-mode.md` instead of stopping after the report.

## Overview

Audits a project's Claude Code session transcripts (not its code) for concrete, evidence-backed ways it could have used fewer tokens, and writes a categorized report with real quotes, timestamps, and token figures — not generic advice.

## Workflow

1. **Locate transcripts.** They live at `~/.claude/projects/<encoded>/*.jsonl`, where `<encoded>` is the project's absolute path with every non-alphanumeric character replaced by `-`. Confirm the target project's absolute path with the user if it's ambiguous; the scanner never infers it from cwd. Worktrees nested in the project (`.worktrees/`, `.claude/worktrees/`) are included automatically; a worktree checked out elsewhere needs its own scan.

2. **Extract raw data** with the bundled scanner. Run it by its path inside this skill's own folder (not the user's project), and write the output to the session scratchpad or a temp directory:
   ```
   node <this-skill-dir>/scripts/scan-transcripts.js <absoluteProjectDir> > <scratch>/scan.ndjson
   ```
   Output is one JSON line per session (main-thread human `turns` with the answering `model`, token totals, tool/MCP/skill usage, subagents, compactions); each field is explained in `references/categories.md` where it is used. Add `--full` for untruncated prompts, or `--session <id>` for one session. Reuse this output for every category instead of re-deriving it from raw JSONL.

3. **Read the harness files** if present: `CLAUDE.md`, `AGENTS.md`, and any `.claude/skills/*/SKILL.md` in the project, plus the project's memory in `~/.claude/projects/<encoded>/memory/` (`MEMORY.md` and its entries). Note word counts and whether occasionally-needed content is inline rather than in a referenced file.

4. **Analyze per category** using `references/categories.md`. For a large project, delegate a session (or batch of sessions) per subagent where the platform supports it, passing only the relevant NDJSON lines; otherwise analyze the NDJSON in the main session.

5. **Back every finding with evidence**: session id, timestamp, and a short quote or tool-call sequence, plus token figures where the scan has them. Mask anything in a quote that looks like a credential (API keys, tokens, passwords) before writing it. Omit categories with no evidence rather than padding with hypotheticals.

6. **Write the report** as a markdown file using `references/report-template.md`. If the platform can publish Artifacts (Claude Code), ask whether to also publish it; if yes, read the `artifact-design` skill first when it's installed. Otherwise hand back the markdown file.

Per-platform fallbacks are in `references/platform-limitations.md`.
