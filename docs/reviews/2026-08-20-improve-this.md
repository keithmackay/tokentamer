# improve-this Review — tokentamer

Scope: `/Users/Keith.MacKay/Projects/tokentamer` (SKILL.md + scripts/scan-transcripts.js)

## Priority List

```
#1  [Impact: High | Confidence: High]     Token Efficiency & Progressive Disclosure — SKILL.md violates its own <500-word guidance
#2  [Impact: High | Confidence: High]     Edge Case Coverage — default JSON output is one unbroken line, unreadable via paged Read
#3  [Impact: Medium | Confidence: High]   Completeness — cwd-relative projectDir resolution is a known footgun, undocumented
#4  [Impact: Medium | Confidence: Medium] Accuracy & Consistency — "MCP tools loaded but idle" category is unverifiable with current scan data
#5  [Impact: Medium | Confidence: Medium] Accuracy & Consistency — "Wrong model for task" needs per-turn model correlation the scan doesn't produce
#6  [Impact: Medium | Confidence: Medium] Navigability & Structure — no README for a project now living outside ~/.claude/skills
#7  [Impact: Low | Confidence: Medium]    Code Efficiency — full-file read+split rather than streaming
#8  [Impact: Low | Confidence: Medium]    Clarity & Simplification — "delegate per category" guidance doesn't fit the monolithic JSON shape
```

## Categorized Breakdown

### Token Efficiency & Progressive Disclosure
- SKILL.md is 881 words (`wc -w`), well past the <500-word target this skill itself cites from `superpowers:writing-skills`. The 10-row categories table and the report-structure template are reference material only needed during step 4/6, not on every invocation. Move them to `references/categories.md` and `references/report-template.md`, pulled in on demand.

### Edge Case Coverage
- `scan-transcripts.js` only pretty-prints with `--full`; default mode emits the entire multi-session JSON as one unbroken line, which can't be paged with Read's offset/limit — undercutting step 4's advice to avoid loading everything into context. Confirmed: even a 3-session scan on this machine was 3.4KB on one line.

### Completeness
- During development, `node scripts/scan-transcripts.js .` failed because the Bash tool's cwd didn't match the intended project path. SKILL.md doesn't warn about this; it should explicitly instruct passing an absolute project path.

### Accuracy & Consistency
- "MCP tools loaded but idle" implies detecting an MCP tool that was *available but unused*, but the scanner only records `tool_use` calls that happened — no record of which MCP servers/tools were connected. As written the category can only ever catch "used late," never "never used despite being loaded."
- "Wrong model for the task" needs per-turn model attribution, but `modelsUsed` only aggregates counts per session — can't tell which turns each model actually handled.

### Navigability & Structure
- Project now stands alone outside `~/.claude/skills` with no README covering what it is, how to install as a personal skill, or how to run the script directly.

### Code Efficiency
- Script reads each JSONL file fully into memory and splits on `\n` rather than streaming. Fine at normal scale; would degrade on very large histories.

### Clarity & Simplification
- Step 4's "delegate per category" guidance doesn't map onto the current output shape — every category reads the same single JSON blob, so a subagent assigned one category still ingests the whole scan. Only fully resolved once the output format changes (see #2).
