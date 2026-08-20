WHAT IT DOES

Audits a project's Claude Code session transcripts (not the code) to find
concrete, evidence-backed opportunities to have used fewer tokens: repeated
or duplicated work, context pollution, MCP tools loaded but never used,
skills without progressive disclosure, oversized prompts, verbose
CLAUDE.md/memory files, wrong model choices, missed memory-save
opportunities, and places a deterministic script would have beaten an LLM
call. Produces a categorized markdown report with real quotes and
timestamps from the target project's own history.

WHAT IT NEEDS

- Node.js (v18+), to run the bundled transcript scanner
- The target project must have existing Claude Code session transcripts
  under ~/.claude/projects/<encoded-project-path>/*.jsonl — there is
  nothing to audit for a project with no prior sessions
- Optional: the superpowers:writing-skills and artifact-design skills
  sharpen two specific steps (skill word-count guidance, Artifact
  publishing) but are not required — the workflow falls back gracefully
  if either is absent

USAGE

  /tokentamer review ~/Projects/my-app for token waste

Or run the scanner directly to inspect the raw data yourself:

  node scripts/scan-transcripts.js /absolute/path/to/project > /tmp/scan.ndjson

FLAGS

  --help          Show this help text and stop (this file)
  --full          (scanner only) untruncated prompt text in scan output
  --session <id>  (scanner only) restrict scan output to one session
