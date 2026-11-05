WHAT IT DOES

Audits a project's Claude Code session transcripts (not the code) to find
concrete, evidence-backed opportunities to have used fewer tokens: context
pollution (including sessions that hit compaction), duplicated work, LLM
calls a script could have replaced, MCP servers connected but unused,
always-loaded skill listings, skills without progressive disclosure,
oversized prompts, verbose CLAUDE.md/memory files, wrong model choices,
costly subagent delegation, missed memory-save opportunities, and
redundant reads. Produces a categorized markdown report with real quotes,
timestamps and token figures from the target project's own history.

WHAT IT NEEDS

- Node.js (v18+), to run the bundled transcript scanner
- The target project must have existing Claude Code session transcripts
  under ~/.claude/projects/<encoded-project-path>/*.jsonl — there is
  nothing to audit for a project with no prior sessions
- Optional, Claude Code only: the superpowers:writing-skills and
  artifact-design skills sharpen two steps (skill word-count guidance,
  Artifact publishing). Without them, or on Codex, Antigravity or Gemini
  CLI, the workflow uses the fallbacks in references/platform-limitations.md

USAGE

  /tokentamer review ~/Projects/my-app for token waste

Or run the scanner directly to inspect the raw data yourself:

  node <skill-dir>/scripts/scan-transcripts.js /absolute/path/to/project > scan.ndjson

FLAGS

  --help          Show this help text and stop (this file)
  --version       Print installed version and check for updates, then stop
  --fix           Run the audit, then offer to apply the fixable findings
                  (split verbose files, save missed memories) — you pick
                  which; nothing is applied without confirmation
  --full          (scanner only) untruncated prompt text in scan output
  --session <id>  (scanner only) restrict scan output to one session
