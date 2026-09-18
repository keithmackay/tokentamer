# improve-this Review — tokentamer

Scope: `/Users/keith.mackay/Projects/tokentamer` (full project)

Categories reviewed: Token Efficiency & Progressive Disclosure, Clarity & Simplification, Accuracy & Consistency, Edge Case Coverage.

## Priority List

```
#1  [Impact: Medium | Confidence: High]   Edge Case Coverage — scan-transcripts.js only reads user turns where content is a string; array-content user entries are silently dropped
#2  [Impact: Medium | Confidence: High]   Completeness/Accuracy — help.md's FLAGS section omits --version entirely
#3  [Impact: Medium | Confidence: Medium] Token Efficiency & Progressive Disclosure — the --version workflow (~200 words) is inlined in the always-loaded SKILL.md, pushing both copies (737/765 words) well past the project's own 500-word target
#4  [Impact: Low    | Confidence: Medium] Clarity/Accuracy — README's Development section states a ~500-word target that neither SKILL.md copy currently meets
```

## Categorized Breakdown

### Edge Case Coverage
`scripts/scan-transcripts.js:96` only extracts a turn when `entry.message.content` is `typeof === "string"`. Real transcripts also contain user entries whose `content` is an array of blocks (confirmed against this project's own transcript, e.g. `.claude/projects/.../1c671858-....jsonl`) — this shape appears for turns that follow a tool result. Those turns are silently skipped, so `session.turns` undercounts real user activity in any session with tool-call back-and-forth (i.e. almost all of them), which weakens findings in categories like "context pollution" and "oversized prompts" that key off `turns`. The array case typically holds a mix of `tool_result` blocks and plain text — worth extracting any text blocks the same way `content` arrays are already handled for assistant messages.

### Completeness / Accuracy
`help.md` (both root and `skills/tokentamer/`) lists a FLAGS section with `--help`, `--full`, `--session`, but not `--version` — even though `--version` is a fully-specified, real flag (`SKILL.md` lines 14–29). Since `/tokentamer --help` is the documented way for a user to discover what flags exist, this is the one place that actively misleads a user into thinking `--version` doesn't exist.

### Token Efficiency & Progressive Disclosure
The `--version` block (steps 1–5, roughly 200 of the file's ~737/765 words) is loaded on every single invocation of the skill, but only matters when a user actually passes `--version` — a small fraction of invocations. This is exactly the pattern the skill's own `categories.md` flags under "Skills without progressive disclosure": heavy, occasionally-needed material inlined instead of pulled in on demand. Candidate: move the manifest-lookup/GitHub-release-check steps into a `references/version-check.md` (or a small companion script), leaving only "on `--version`, follow `references/version-check.md`" inline — mirrored in both `SKILL.md` copies per existing convention.

### Clarity & Simplification
`README.md`'s Development section still asserts "keep it under ~500 words" as SKILL.md's target, but `wc -w` shows 737 (root) and 765 (mirror) — the documentation describing the codebase's own convention no longer matches the codebase. This would self-resolve if #3 is implemented; otherwise the README line should be corrected or the target explicitly revised.
