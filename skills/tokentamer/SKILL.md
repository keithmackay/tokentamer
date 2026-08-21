---
name: tokentamer
description: Use when the user wants to audit a project's Claude Code usage for wasted tokens or cost — e.g. "review our sessions for token waste", "how could we have saved tokens on this project", "audit our prompts/context usage", "find where we polluted context", "check if we're using the right model/MCPs/skills efficiently". Analyzes transcript history, not the codebase itself.
---

# Tokentamer

## Flags

### `--help`

If the user invokes this skill with a `--help` flag (e.g. `/tokentamer --help`), do not run the workflow. Instead, read and display the contents of `help.md` (in this skill's folder) verbatim, then stop.

### `--version`

If the user invokes this skill with a `--version` flag (e.g. `/tokentamer --version`), do not run the workflow. Instead:

1. Read the installed version from this skill's own manifest: `.claude-plugin/plugin.json` if present, else `.codex-plugin/plugin.json`, else `gemini-extension.json` — whichever exists for this platform install. If none exist (a bare Claude Code skill with only SKILL.md), read the topmost version heading in `CHANGELOG.md` instead.
2. Print: `tokentamer v<installed-version>`
3. Best-effort update check — determine this skill's GitHub source repo:
   a. If `.git` exists here and `git remote get-url origin` resolves to a `github.com` URL, use that `owner/repo`.
   b. Otherwise, search this skill's own `README.md` for the first `https://github.com/<owner>/<repo>` URL and use that.
   c. If neither yields a repo, or the `gh` CLI isn't installed/authenticated: stop here. Print nothing further — no status line, no error.
4. If a repo was found: run `gh api repos/<owner>/<repo>/releases/latest -q .tag_name` (strip a leading `v`). Compare to the installed version:
   - Equal → append: `Status: up to date`
   - Installed is older → append: `Status: newer version available (v<latest>). To update: if you installed this via a Claude Code marketplace, run /plugin marketplace update <marketplace-name> then reinstall; otherwise, git pull in your install directory if it's a git checkout, or re-copy from https://github.com/<owner>/<repo> per this README's Installation section.`
   - Installed is newer → append: `Status: ahead of latest release (development checkout)`
   - If the API call fails for any reason (network, auth, rate limit, malformed tag): print nothing further — no status line, no error shown to the user.
5. Stop — do not proceed to run the skill's actual workflow.

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

4. **Analyze per category** — see `references/categories.md` for the full list and what to look for in the scan data. The NDJSON shape lets you delegate per session (or a batch of sessions) to a subagent, passing just the relevant lines rather than the whole file — where subagent dispatch isn't available (see `references/platform-limitations.md`), analyze the NDJSON directly in the main session instead.

5. **Every finding needs evidence**: session id, timestamp, and a short quote or tool-call sequence — not a generic "you could have saved tokens by...". If a category has no evidence in this project, omit it from the report rather than padding with hypotheticals.

6. **Write the report** using the structure in `references/report-template.md`, as a markdown file. Then ask the user whether they'd also like it published for easier reading (on Claude Code this uses the artifact-design skill; no equivalent exists here — just hand back the markdown file).

## Platform Limitations

See `references/platform-limitations.md` for the features from the original (Claude Code) skill that this platform doesn't support and their documented fallbacks.
