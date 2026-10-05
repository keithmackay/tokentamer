# Fix Mode (`--fix`)

Followed only after the report has been generated, when the skill was invoked with `--fix`.

Not every finding is something this skill can act on directly — several categories (context pollution, duplicated work, oversized prompts, wrong model choice, redundant fetches) describe past session behavior and have no artifact in the current repo to change; they stay advisory-only. Others correspond to a concrete file or piece of state that can be edited now.

1. **Classify each finding** against `categories.md`'s "Fixable via --fix" column into one of: `fixable` (an automatable change exists) or `advisory-only` (no direct fix, report stands as-is).
2. **Present the fixable list** to the user as a set of independently selectable items — via AskUserQuestion with `multiSelect: true` where that tool exists, otherwise a plain numbered list the user answers with any combination of numbers — one per finding, not grouped by category. Include a one-line description of what applying it would do. Never auto-apply anything without this confirmation step, because every fix edits the user's files or memory.
3. **Apply only the items the user selected**, one at a time:
   - **Verbose/unsplit harness files** or **skills without progressive disclosure**: split the flagged file per `split-guide.md`.
   - **Missed memory opportunities**: save each selected fact/preference as a memory for the **audited** project — not the project this session happens to run in, unless they're the same. For Claude Code, that is one file per fact in `~/.claude/projects/<encoded-audited-project>/memory/` (same frontmatter format as the existing entries there), plus a one-line pointer in that directory's `MEMORY.md`. If the current session's memory system already targets the audited project, use it directly. If no memory location is available, tell the user and skip.
   - **MCP tools used late or rarely**: don't remove server config automatically (that's a connectivity change outside this repo's files, and the evidence only proves "not called early," not "never used" — see the caveat in `categories.md`); instead surface it as a recommendation the user can act on themselves.
4. **Confirm what changed**: after applying, list exactly which fixes were applied, which were skipped (and why, if advisory-only or declined), and remind the user to re-run without `--fix` later to verify the fixes actually reduced the flagged patterns.
