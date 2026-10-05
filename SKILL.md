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

1. **Locate transcripts.** They live at `~/.claude/projects/<encoded>/*.jsonl`, where `<encoded>` is the project's absolute path with every non-alphanumeric character replaced by `-`. Confirm the target project's absolute path with the user if it's ambiguous; the scanner never infers it from cwd.

2. **Extract raw data** with the bundled scanner. Run it by its path inside this skill's own folder (not the user's project), and write the output to the session scratchpad or a temp directory:
   ```
   node <this-skill-dir>/scripts/scan-transcripts.js <absoluteProjectDir> > <scratch>/scan.ndjson
   ```
   Output is one JSON line per session: human-typed `turns` (truncated to 400 chars), `tokens` and `tokensByModel` (input / cacheCreation / cacheRead / output), `modelsUsed`, `toolCalls`, `mcpToolCalls` with timestamps, `readTargets` (file/URL → read count), `skillInvocations` (`source`: `slash` or `tool`), and `skillLoads` (injected skill bodies with their size). Add `--full` for untruncated prompts, or `--session <id>` for one session. Reuse this output for every category instead of re-deriving it from raw JSONL.

3. **Read the harness files** if present: `CLAUDE.md`, `AGENTS.md`, and any `.claude/skills/*/SKILL.md` in the project, plus the project's memory in `~/.claude/projects/<encoded>/memory/` (`MEMORY.md` and its entries). Note word counts and whether occasionally-needed content is inline rather than in a referenced file.

4. **Analyze per category** using `references/categories.md`. For a large project, delegate a session (or batch of sessions) per subagent, passing only the relevant NDJSON lines.

5. **Back every finding with evidence**: session id, timestamp, and a short quote or tool-call sequence, plus token figures where the scan has them. Omit categories with no evidence rather than padding with hypotheticals.

6. **Write the report** as a markdown file using `references/report-template.md`. Then ask whether to also publish it as an Artifact. If yes, read the `artifact-design` skill first when it's installed, otherwise publish with sensible default formatting. If the platform can't publish Artifacts, hand back the markdown file.
