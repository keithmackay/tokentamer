# improve-this Review — tokentamer (2026-11-04)

Scope: full project, a cross-platform skill package plus a Node transcript scanner (v1.5.0). The scanner was tested against 44 real local transcripts (23 sessions), including two 53 MB files.

Categories reviewed: Skill Effectiveness, Token Efficiency & Progressive Disclosure, Calculation Accuracy, Scalability, Accuracy & Consistency, Test Coverage & Quality, README Quality, Agent Instructions (GEMINI.md), Security & Privacy. GEMINI.md (49 words) had no findings.

## Priority List

```
#1  [Impact: High   | Confidence: High]   Calculation Accuracy — Compaction summaries, slash-command output and interrupt markers count as human turns
#2  [Impact: High   | Confidence: Medium] Skill Effectiveness — The recommended Claude Code marketplace install probably loads the Codex/Gemini port
#3  [Impact: Medium | Confidence: High]   Calculation Accuracy — mcpToolUsage ignores subagent MCP calls, so used servers get reported as unused
#4  [Impact: Medium | Confidence: High]   Calculation Accuracy — "<synthetic>" placeholder entries count as a model, including on per-turn attribution
#5  [Impact: Medium | Confidence: High]   Accuracy & Consistency — help.md wasn't updated for v1.5.0
#6  [Impact: Medium | Confidence: Medium] Test Coverage — Fixtures contain only entry types the scanner was built for, not the ones real transcripts have
#7  [Impact: Medium | Confidence: Medium] Completeness — Sessions run in git worktrees are never scanned
#8  [Impact: Low    | Confidence: High]   Security & Privacy — No guidance to redact credentials before quoting prompts or publishing the report
#9  [Impact: Low    | Confidence: Medium] Scalability — Whole-file reads use about 4× the transcript size in memory
#10 [Impact: Low    | Confidence: Medium] README Quality — The compatibility table is buried and shows maintainer-only detail
```

## Categorized Breakdown

### Calculation Accuracy (scanner)

**#1: Text the user didn't type counts as human turns.** `scripts/scan-transcripts.js` filters only `isMeta` and `isSidechain`. These still get through as `turns`:
- **Compaction summaries**, which carry `isCompactSummary: true` and start with "This session is being continued from a previous conversation…". There are 6 of them, at 11,477–22,642 characters. In session `f9fbe855` (findsafeskills), three of them are probably that session's longest "prompts".
- `<local-command-stdout>` output, such as "Set model to `Sonnet 5`…" and "Login successful".
- `[Request interrupted by user]` markers.

**Why it matters:** this is the same false-evidence problem as the 2026-10-05 review's #1. The "Oversized prompts" category will quote 20k-character summaries the user never wrote.

**Opportunity:** a compaction is the clearest sign there is that a session's context got too big. The scanner could record a `compactions` count with timestamps for the "Context pollution" category, rather than throwing them away. 9 of the 44 transcripts contain at least one.

**#3: Subagent MCP calls never count as usage.** `summarizeMcpUsage(stats.toolsAvailable, stats.mcpToolCalls)` uses only the main thread's calls, and the subagent stats don't record MCP calls at all.

**Why it matters:** if a subagent did all of a server's work, the report would tell the user to disconnect a server they actually rely on. The new v1.5.0 category would then produce a confidently wrong finding.

**#4: The `<synthetic>` placeholder counts as a model.** Claude Code writes `model: "<synthetic>"` on placeholder entries (14 times locally). The scanner treats it like any other model, so it shows up:
- **In per-turn attribution:** the first turn of session `28833cf1`, "check nightly process. How'd it go?", is tagged `model: "<synthetic>"`.
- **In model totals:** it appears in `modelsUsed` for at least two sessions, e.g. `{"claude-opus-5-5":868,"<synthetic>":1}`.

**Why it matters:** this is a bug in the per-turn model logic shipped in v1.5.0. A turn should take the first *real* model that replied to it.

### Skill Effectiveness / Platform parity

**#2: The recommended Claude Code install probably gets the degraded port.**
- The marketplace entry in mackayi points at the repo with `"source": "github"`, and the repo has no `.claude-plugin/plugin.json`.
- Claude Code finds plugin skills under `skills/<name>/SKILL.md`. That is the Codex/Gemini copy, which tells Claude:
  - Artifact publishing "is Claude Code-only" and to just hand back the markdown file.
  - To use numbered lists instead of AskUserQuestion, via `platform-limitations.md`.
- A symlink install of the repo root loads the root `SKILL.md`, which hides the problem.

**Related drift:**
- The mackayi entry's description still says "v1.3.0".
- `version-check.md:5` looks first for a `.claude-plugin/plugin.json` that doesn't exist. Marketplace installs only get a version because the Codex manifest happens to be there.

Confidence is Medium because no fresh marketplace install was done to confirm which file loads.

### Accuracy & Consistency

**#5: help.md is stale.**
- Both copies still say "MCP tools loaded but never used", the wording dropped in v1.5.0.
- They list the old 9-category summary, with no subagent delegation, listing overhead or connected-but-unused MCP servers.
- README line 3 and `categories.md` now disagree with what `--help` prints.

### Test Coverage & Quality

**#6: Fixtures cover only expected entry types.** `test/fixtures/*.jsonl` contain only the entry types the scanner was written to handle. Bugs #1, #3 and #4 all slipped through for that reason. A fixture built from what real transcripts actually contain would have caught all three: compaction summaries, `<local-command-stdout>`, interrupt markers, `<synthetic>` entries, and a subagent that makes an MCP call.

### Completeness

**#7: Worktree sessions are missed.** Claude Code names transcript folders after the session's working directory. Sessions run inside `project/.worktrees/x` therefore land in a separate folder, which the scanner (exact path match) and SKILL step 1 never look at.
- The author's global CLAUDE.md explicitly uses `.worktrees/`.
- There are sibling worktree folders (`budget-wt-1..3`), but none still hold transcripts, so this isn't confirmed with live data.

### Security & Privacy

**#8: No redaction step.** The report quotes prompts verbatim, and step 6 offers to publish it.
- Neither `SKILL.md` nor `report-template.md` mentions redacting credentials.
- A strict scan of local prompts found no real API keys, so the current risk is low.

### Scalability

**#9: Whole-file reads.** The two findsafeskills transcripts (106 MB together) scan in 0.47 s but peak at 443 MB of memory, and `--full` lines reach 125 KB. Fine for now; worth revisiting if transcripts approach 0.5–1 GB.

### README Quality

**#10: Compatibility table placement.**
- `README.md:154` puts Compatibility after License and Changelog, even though it decides which install a user picks.
- The rows about `superpowers:writing-skills (plugin namespacing)` are maintainer detail.
