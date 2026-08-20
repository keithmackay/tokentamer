# improve-this Review — tokentamer (v1.1.0)

Scope: `/Users/Keith.MacKay/Projects/tokentamer`

## Priority List

```
#1  [Impact: High   | Confidence: High]   Accuracy & Consistency — plugin manifests still say version 1.0.0 after the v1.1.0 release
#2  [Impact: Medium | Confidence: High]   Completeness — README never mentions the new --help/help.md mechanism
#3  [Impact: Medium | Confidence: Medium] Redundancy — no automated check that the two duplicated file trees stay in sync
#4  [Impact: Medium | Confidence: Medium] Token Efficiency & Progressive Disclosure — ported SKILL.md is 687 words, well over the 500-word target
#5  [Impact: Low    | Confidence: Medium] Navigability & Structure — docs/ ships internal review/plan artifacts in the public repo with no explanation
#6  [Impact: Low    | Confidence: Medium] Edge Case Coverage — scan-transcripts.js truncates prompts by raw char-slice, risking a split multi-byte character
```

## Categorized Breakdown

### Accuracy & Consistency
`.codex-plugin/plugin.json` and `gemini-extension.json` both hardcode `"version": "1.0.0"`, but the repo has since released `v1.1.0` (adding the `--help`/`help.md` mechanism). A Codex/Gemini CLI user installing "1.0.0" gets software whose manifest doesn't match what's actually there.

### Completeness
Neither `README.md` nor its Usage section mentions `--help`, even though it's now a real, documented entry point (`/tokentamer --help`) on every platform. No way for a new user to discover it from the README.

### Redundancy
The root and `skills/tokentamer/` trees are intentionally duplicated for cross-platform packaging, and currently match (verified via diff — `references/*.md` and `scripts/scan-transcripts.js` are byte-identical). Nothing enforces that going forward, unlike `url-eval` (a sibling project in this workspace) which already has a `scripts/check-sync.sh` for exactly this.

### Token Efficiency & Progressive Disclosure
`skills/tokentamer/SKILL.md` is 687 words — past the same 500-word target this skill itself preaches — driven by the inlined Platform Limitations table and PORTER comment block. That content is only relevant when debugging a platform gap, not on every invocation; a candidate for extraction to `references/platform-limitations.md`.

### Navigability & Structure
`docs/reviews/2026-08-20-improve-this.md` and `docs/plans/improve-this-2026-08-20.md` are internal dev-history artifacts committed at the repo root next to user-facing docs, with nothing explaining what `docs/` is for to a public visitor.

### Edge Case Coverage
`scan-transcripts.js`'s truncation (`cleaned.slice(0, 400)`) operates on UTF-16 code units — a prompt with an emoji or other surrogate-pair character straddling the 400-char boundary would be split mid-codepoint, producing a lone surrogate in the JSON output. Rare, but a real correctness edge case.

### Clarity & Simplification
No new findings — README and both `help.md` files remain tight after the prior `plsfix` pass.
