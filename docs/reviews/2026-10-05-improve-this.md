# improve-this Review — tokentamer (2026-10-05)

Scope: full project. Type: cross-platform skill package + Node transcript scanner.

Categories reviewed: Skill Effectiveness, Token Efficiency & Progressive Disclosure, README Quality, Agent Instructions (GEMINI.md), Accuracy & Consistency, Calculation Accuracy (scanner), Test Coverage & Quality, Security & Privacy.

## Priority List

```
#1  [Impact: High   | Confidence: High]   Calculation Accuracy — Injected skill bodies are counted as user prompts
#2  [Impact: High   | Confidence: High]   Security & Privacy — .sessionstats/ (work email, machine ID, cost) is committed to a PUBLIC repo
#3  [Impact: High   | Confidence: High]   Calculation Accuracy — Scanner records no token counts and no file/URL inputs
#4  [Impact: High   | Confidence: High]   Calculation Accuracy — Slash-command skill invocations are never recorded
#5  [Impact: High   | Confidence: Medium] Agent Instructions — GEMINI.md @-imports ~2,000 words into every Gemini session
#6  [Impact: Medium | Confidence: High]   Token Efficiency — SKILL.md has grown back to 840/868 words; Fix Mode (309 words) loads on every run
#7  [Impact: Medium | Confidence: High]   Accuracy & Consistency — --fix is missing from help.md, README Usage and CHANGELOG, and its version was never bumped
#8  [Impact: Medium | Confidence: High]   Calculation Accuracy — --full pretty-prints, so the output stops being NDJSON
#9  [Impact: Medium | Confidence: Medium] Accuracy & Consistency — The --version README fallback picks up a placeholder or the wrong repo URL
#10 [Impact: Medium | Confidence: Medium] Skill Effectiveness — The step 2 script path is relative to the wrong directory
#11 [Impact: Medium | Confidence: Medium] Skill Effectiveness — Memory handling targets the wrong project and the wrong file location
#12 [Impact: Medium | Confidence: Medium] Test Coverage — No fixture tests for the scanner
#13 [Impact: Medium | Confidence: Medium] Calculation Accuracy — Path encoding only rewrites "/" and "."
#14 [Impact: Low    | Confidence: High]   Accuracy & Consistency — check-sync.sh skips references/split-guide.md
#15 [Impact: Low    | Confidence: High]   Calculation Accuracy — Weak argument parsing (--session with no id; projectDir must be first)
#16 [Impact: Low    | Confidence: Medium] README Quality — Antigravity has no fallback for "publish as Artifact"; other small doc drift
```

## Categorized Breakdown

### Calculation Accuracy (scanner)

**#1: Injected skill bodies are counted as user prompts.** `scripts/scan-transcripts.js:96` accepts every `type: "user"` entry. It never checks `isMeta`, so skill bodies that Claude Code injects ("Base directory for this skill: …") are counted as turns typed by the user.
- **Evidence:** in session `1c671858…` of this repo, the two longest "user turns" are skill bodies: 24,388 chars (git-release) and 5,871 chars (improve-this). The real prompts are 8–24 chars, e.g. "all, yes".
- **Why it matters:** the "Oversized or over-specified prompts" and "Context pollution" categories would point at text the user never wrote. That is a false finding, presented as evidence.

**#3: The scanner records no token counts and no file/URL inputs.** Assistant entries carry `message.usage` with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and `output_tokens`. The scanner reads only `message.model` (`:121`).
- Tool calls are stored as counts per tool name (`:129`). The `input.file_path` and `url` values are thrown away.
- **Why it matters:**
  - A token-waste auditor has no token numbers, so the report template's **Cost:** line can only be a guess.
  - The "Redundant large reads/fetches" category has no data at all, yet `SKILL.md:30` tells the model to "reuse its output for every category." In practice that means either re-reading the raw JSONL by hand or making things up.

**#4: Slash-command skill invocations are never recorded.** `skillInvocations` only catches the model-initiated `Skill` tool (`:134`).
- **Evidence:** session `1c671858…` ran `/improve-this` and `/git-release`, but its scan output shows `"skillInvocations":[]`.
- **Why it matters:** the "Skills without progressive disclosure" category can't see the most common way skills get loaded. The injected bodies from #1 are the signal; they should be reported as skill loads with their size.

**#8: `--full` breaks NDJSON.** `:144` uses `JSON.stringify(session, null, full ? 2 : 0)`. With `--full`, a single session printed 49 lines.
- **Why it matters:** this contradicts "one object per session" (`SKILL.md:34`) and the README's line-per-session paging and delegation claims.

**#13: Path encoding is narrower than Claude Code's.** `:20` uses `projectDir.replace(/[/.]/g, "-")`. As far as I know, Claude Code turns every non-alphanumeric character into `-`.
- **Why it matters:** projects with spaces, underscores or `@` in their path would fail with "No Claude Code transcripts found."
- **Not verified:** none of the local project paths contain those characters, so this couldn't be tested. Hence Medium confidence.

**#15: Weak argument parsing.**
- `--session` with no id silently scans every session; tested, and it exits 0 with all sessions.
- The project dir must be `argv[2]` (`:38`), so `node scan-transcripts.js --full /abs/path` fails with a usage error.

### Security & Privacy

**#2: `.sessionstats/` is committed to a public repo.** `gh repo view` reports `PUBLIC`.
- **What's exposed:**
  - `.sessionstats/config.json` contains a work email address.
  - `.sessionstats/session_stats.json` contains a `machineId` (username@hostname) and per-session spend.
- It was added in commit `837ce09` ("Save local work before push"), which looks unintentional. `.gitignore` doesn't exclude it.
- **Why it matters:** this is personal and employer data on the public internet. Removing the file now leaves it in git history.

### Agent Instructions (GEMINI.md)

**#5: GEMINI.md loads the whole skill into every Gemini session.** `GEMINI.md:1-5` `@`-imports `SKILL.md` plus four reference files, about 2,060 words (roughly 2.7k tokens). An extension's context file loads into every Gemini CLI session, not just token audits.
- **Why it matters:**
  - It undoes the progressive disclosure the skill itself recommends.
  - It pays for `split-guide.md` (needed only with `--fix`) and `platform-limitations.md` on every task.
  - It leaves out `version-check.md`, so `--version` on Gemini relies on the model finding that file by itself.
- **Option:** a one-line GEMINI.md pointer, or native extension skills if the installed Gemini CLI version supports them.

### Token Efficiency & Progressive Disclosure

**#6: SKILL.md has grown back past the 500-word target.** `wc -w` now gives 840 (root) and 868 (port), against the README's "keep it under ~500 words".
- The 2026-09-17 review fixed this for `--version`. Then `--fix` brought it back: the **Fix Mode** section (309 words) loads on every run but matters only when `--fix` is passed.
- **What to move:**
  - Fix Mode steps → `references/fix-mode.md`, leaving a one-line pointer under `### --fix`.
  - Optionally, the long Overview paragraph, which repeats the description and README.
- After that, a clarity pass on what remains is worthwhile.

### Accuracy & Consistency

**#7: `--fix` is undocumented almost everywhere.**
- It appears in neither `help.md` file, which makes `/tokentamer --help` misleading.
- The README's Usage section doesn't mention it; it appears only in the compatibility table.
- In the CHANGELOG, `[Unreleased]` is empty and `[1.3.0]` has no entries. The commit that added `--fix` (`826a6b1`) came after the `v1.3.0` tag, but the manifests still say `1.3.0`.

**#9: The `--version` README fallback picks up the wrong URL.** `version-check.md:9` takes "the first `https://github.com/<owner>/<repo>` URL" in the README.
- The first match is the literal placeholder `https://github.com/<owner>/tokentamer` (`README.md:82`). The next real one is `github.com/google-gemini/gemini-cli` (`:165`).
- **Result:** any install without `.git` gets either no check or a comparison against gemini-cli's release tags.
- `README.md:122` also has `git clone <repo>`. `version-check.md:5` looks for `.claude-plugin/plugin.json` first, but the repo has no `.claude-plugin/` directory.

**#14: `check-sync.sh` skips `split-guide.md`.** The script checks three reference files and the scanner, but not `references/split-guide.md`, which `--fix` depends on. The README says the script verifies "the shared `references/*.md`."

**Minor drift:** `platform-limitations.md:9` says `superpowers:writing-skills` is referenced in "step 4"; only `categories.md` mentions it. `CHANGELOG.md` lists "Initial commit" twice.

### Skill Effectiveness

**#10: The step 2 command uses a path relative to the wrong directory.** `SKILL.md:32` says `node scripts/scan-transcripts.js …`. While the skill runs, the working directory is usually the user's project, not the skill folder. The fixed `/tmp/scan.ndjson` output also clashes between concurrent runs.

**#11: Memory handling looks in the wrong places.**
- **Wrong target project:** Fix Mode saves memories "using this session's memory system." When auditing another directory, they land in the current project's memory.
- **Wrong location:** step 3 looks for `MEMORY.md` among the project's files. Claude Code's auto-memory lives in `~/.claude/projects/<encoded>/memory/`.
- **Wrong split method:** `split-guide.md` says to put a `references/` directory next to MEMORY.md, which clashes with the memory system's one-file-per-fact layout.

**Category definition:** "MCP tools loaded but idle" admits the scanner can't tell which servers were connected. The name promises more than the data can show.

### Test Coverage & Quality

**#12: No fixture tests for the scanner.** A tiny fixture JSONL with an `isMeta` entry, an array-content turn, a `usage` block and a slash-command load, plus a golden-output check, would have caught #1, #4 and #8. `check-sync.sh` is the only automated check, and nothing runs it automatically.

### README Quality

**#16: Small gaps.**
- The compatibility table marks `artifact-design` ❌ for Antigravity, yet the root `SKILL.md` step 6 says "just publish directly" as an Artifact, which Antigravity can't do.
- Install: `cp -r … ~/.claude/skills/tokentamer/` fails if `~/.claude/skills` doesn't exist (no `mkdir -p`).
