---
name: tokentamer
description: Use when the user wants to audit a project's Claude Code usage for wasted tokens or cost — e.g. "review our sessions for token waste", "how could we have saved tokens on this project", "audit our prompts/context usage", "find where we polluted context", "check if we're using the right model/MCPs/skills efficiently". Analyzes transcript history, not the codebase itself.
---

<!-- PORTER: this skill's body references plugin-namespaced Claude Code skills
     (superpowers:writing-skills, artifact-design) that have no equivalent on
     Codex or Gemini CLI — see Platform Limitations below. This same file is
     loaded by both Codex and Gemini CLI (identical skills/<name>/SKILL.md
     path per each platform's spec), so its content must hold for both. -->

# Tokentamer

## Overview

Audits a project's actual Claude Code session transcripts (not the code) to find concrete, evidence-backed opportunities to have used fewer tokens: repeated/duplicated work, context pollution, unused MCP tools, poorly-disclosed skills, bloated prompts, verbose CLAUDE.md/memory files, wrong model choices, missed memory-save opportunities, and places a deterministic script would have beaten an LLM call. Produces a categorized report with real quotes and timestamps, not generic advice.

## Workflow

1. **Locate transcripts.** Project transcripts live at `~/.claude/projects/<projectDir-with-slashes-and-dots-as-dashes>/*.jsonl`. Confirm the target project's absolute directory with the user if ambiguous — the scan script requires an absolute path and does not infer it from cwd (a relative or ambient path silently looks in the wrong place).

2. **Extract raw data** with the bundled script, and reuse its output for every category below rather than re-deriving prompt/tool data by hand:
   ```
   node scripts/scan-transcripts.js <absoluteProjectDir> > /tmp/scan.ndjson
   ```
   Output is newline-delimited JSON, one object per session, with: user turns (truncated), models used per session, all tool-call counts, MCP tool-call names + timestamps, and Skill invocations + timestamps. Add `--full` for untruncated prompt text, or `--session <id>` to scope to one session.

3. **Also read harness files** if present: `CLAUDE.md`, `AGENTS.md`, `MEMORY.md`, and any `.claude/skills/*/SKILL.md` used in the project. Note line/word counts and whether content that's only needed occasionally is inline vs. split into a referenced file.

4. **Analyze per category** — see `references/categories.md` for the full list and what to look for in the scan data. The NDJSON shape lets you delegate per session (or a batch of sessions) to a subagent, passing just the relevant lines rather than the whole file — where subagent dispatch isn't available (see Platform Limitations), analyze the NDJSON directly in the main session instead.

5. **Every finding needs evidence**: session id, timestamp, and a short quote or tool-call sequence — not a generic "you could have saved tokens by...". If a category has no evidence in this project, omit it from the report rather than padding with hypotheticals.

6. **Write the report** using the structure in `references/report-template.md`, as a markdown file. Then ask the user whether they'd also like it published for easier reading (on Claude Code this uses the artifact-design skill; no equivalent exists here — just hand back the markdown file).

## Platform Limitations

The following features from the original skill are not supported on this platform:

| Feature | Reason |
|---------|--------|
| Reference to `superpowers:writing-skills` (step 4, categories.md) | Plugin-namespaced Claude Code skill; not installed/resolvable on Codex or Gemini CLI. If word-count guidance is needed, apply the general rule directly: keep the always-loaded SKILL.md under ~500 words, move heavy reference material to separate files. |
| Reference to the `artifact-design` skill (step 6) | Claude Code-specific Artifact publishing skill; has no equivalent on Codex or Gemini CLI. Skip that step — just deliver the markdown report file directly. |
| Subagent dispatch (step 4) | Supported on Codex; **not** supported on Gemini CLI (no `Task`-style dispatch). On Gemini CLI, analyze the NDJSON scan output directly in the main session rather than delegating per session/batch. |

The transcript source data itself (`~/.claude/projects/*.jsonl`) is Claude Code-specific. This skill only analyzes Claude Code session history, regardless of which platform runs it.
