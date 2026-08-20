# Implementation Plan — tokentamer improve-this findings

Source review: `docs/reviews/2026-08-20-improve-this.md`

## Phase 1 — Fix the scanner output shape (findings #2, #8)
1. Change `scan-transcripts.js` default output to always be readable: either always pretty-print, or (preferred) emit one JSON object per line (newline-delimited, one per session) so a caller/subagent can page through or grep by session without loading the whole blob.
2. Update SKILL.md step 4 to describe delegation in terms of the new shape (e.g. "pass the subagent the path plus a session-id filter" rather than "per category").

## Phase 2 — Fix the projectDir footgun (finding #3)
3. Add a line to SKILL.md step 1/2 instructing to pass an absolute project path explicitly, not rely on cwd, with a one-line note of the failure mode (cwd mismatch → "No transcripts found").
4. Optionally have the script fall back to checking `git rev-parse --show-toplevel` or reject silently-wrong resolutions — evaluate during implementation, not required.

## Phase 3 — Narrow or caveat unverifiable categories (findings #4, #5)
5. Either: (a) extend the scanner to record available/connected MCP tools per session if that data exists in the transcript format, or (b) reword the "MCP tools loaded but idle" category in SKILL.md to state its actual limitation (can detect late-first-use, not never-used).
6. Reword "Wrong model for the task" to note it works at session granularity only, or extend the scan to tag each user turn with the model of the assistant response that followed it.

## Phase 4 — Token efficiency & clarity pass on SKILL.md (findings #1, #6)
7. Use the `readme` skill to generate a proper `README.md` for the standalone project copy — covering what it is, install-as-personal-skill instructions, and how to run `scripts/scan-transcripts.js` directly. This also gives step 1/setup content a home outside SKILL.md.
8. Use the `plsfix` skill to do the clarity/token-efficiency pass on the remaining SKILL.md content once the categories table and report template are extracted to `references/categories.md` and `references/report-template.md` (per finding #1) — tighten wording, confirm it lands under the ~500-word target.

## Phase 5 — Optional hardening (finding #7)
9. If/when transcript sizes in practice get large, switch `scan-transcripts.js` to a streaming line reader (e.g. Node's `readline` over a `fs.createReadStream`) instead of `readFileSync` + `split`. Low priority — defer until it's actually a problem.
