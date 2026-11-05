# Implementation Plan — consolidated open items from all improve-this reviews (2026-11-04)

Sources: `docs/reviews/2026-08-20-improve-this.md`, `2026-08-20-improve-this-2.md`, `2026-09-17-improve-this.md`, `2026-10-05-improve-this.md`, and their plans.

## Status of past findings

Every finding selected in the four earlier plans has shipped (v1.1.0–v1.4.0, released). The items still open are:

- 2026-08-20 #4, "MCP tools loaded but idle": downgraded to "used late or rarely" with a caveat, because the scanner couldn't see which tools were connected.
- 2026-08-20 #5, "Wrong model" needs per-turn model data: only a caveat was added.
- 2026-08-20 #7, streaming reader: deferred until it becomes a problem.
- 2026-10-05 #2, `.sessionstats/` data still in public git history: purging it was deferred to the user.

Checking real transcripts on 2026-11-04 turned up evidence that makes the first two fixable now. It also showed a gap that no review caught:

- **Subagent transcripts are invisible.** Claude Code writes them to `<project>/<sessionId>/subagents/agent-*.jsonl`, with a `.meta.json` sidecar holding `agentType`, `description` and `model`. The scanner reads only top-level `*.jsonl`. In snapabrick session `103cbc1e…`, the subagents produced 89,199 output tokens against 108,237 for the main agent. About 45% of that session's output spend never reaches the audit.
- **Connected tools are recorded.** `attachment.type == "deferred_tools_delta"` (`addedNames`, `removedNames`) and `"mcp_instructions_delta"` (`addedNames` = MCP server names) list which tools and servers were available. They appear in 36 of 44 local sessions.
- **Skill listing overhead is recorded.** `attachment.type == "skill_listing"` carries `skillCount` and `content`. One tokentamer session loaded a listing of 151 skills. That listing is paid for on every turn, which makes it a real token cost for a user with many skills installed.

## Priority (by impact for the user)

| # | Item | Why it matters to the user |
|---|---|---|
| 1 | Scan subagent transcripts | The biggest blind spot: subagent spend can be close to half of a session, and delegation waste (oversized briefs, Opus on mechanical work) is invisible |
| 2 | Per-turn model attribution | Turns "Wrong model for the task" from a session-level guess into turn-level evidence |
| 3 | Connected-but-unused MCP tools | Restores the category the reviews downgraded; unused connected tools cost schema tokens every turn |
| 4 | Skill/tool listing overhead | A new, often large, always-on cost the user can fix by uninstalling or scoping skills |
| 5 | Docs, version 1.5.0 | Make the new fields discoverable |
| — | Purge `.sessionstats/` from history | **Gated: needs explicit user approval** (force-push to a public repo) |
| — | Streaming reader | Still deferred; no evidence of a size problem |

**Implementation status (2026-11-04):** Phases 1–5 are done in v1.5.0. One deviation: Phase 3 emits `mcpToolUsage` (`{ server: { available, used } }`) instead of `toolsAvailable`/`mcpToolsUnused` name lists. A real session had 350 connected MCP tools, and two 350-name lists on every NDJSON line would bloat what the skill pages through. The gated and deferred items remain open.

## Phase 1 — Subagent transcripts

1. For each session, if `<transcriptDir>/<sessionId>/subagents/` exists, scan every `agent-*.jsonl` in it with the same per-file logic. For subagents, `isSidechain` user entries *are* the brief, so the first user entry's length is recorded as `promptLength`.
2. Emit `session.subagents`: `[{ agentId, agentType, description, model, promptLength, tokens, tokensByModel, toolCalls, readTargets, firstTimestamp, lastTimestamp }]`. `agentType`, `description` and `model` come from the `.meta.json` sidecar when present.
3. Add `session.subagentTokens` (the sum across subagents). Leave `session.tokens` as main-thread only so it means the same thing as before.
4. Refactor so one function scans a JSONL file and returns its stats; the session and each subagent both use it.
5. Tests: add a fixture subagent JSONL and meta file, then assert the fields and totals above.

## Phase 2 — Per-turn model

1. Each human turn gets `model`: the model of the first assistant message that follows it. Leave it null if there is none.
2. Tests: a fixture with two models across turns.

## Phase 3 — Available tools and MCP servers

1. Track a running set from `deferred_tools_delta` (`addedNames` minus `removedNames`) and from `deferred_tools_record` entry names. Emit `toolsAvailable`: the MCP tools only (`mcp__*`), sorted. Emit `mcpServers` from `mcp_instructions_delta.addedNames`.
2. Emit `mcpToolsUnused` = `toolsAvailable` minus the names in `mcpToolCalls`.
3. `categories.md`: change the MCP row to "MCP tools connected but unused, or used late". Remove the "can't see connected servers" caveat, and keep a softer one for sessions without the attachments (older Claude Code versions).

## Phase 4 — Listing overhead

1. Emit `skillListing`: `{ count, chars }`, taken from the largest `skill_listing` attachment in the session (the initial one).
2. `categories.md`: add a row "Always-on listing overhead". A large `skillListing.chars` or a long `toolsAvailable` list is paid for on every turn. Fix: uninstall or scope rarely used skills and plugins, and disconnect unused MCP servers. Advisory only; `--fix` doesn't edit the user's global config.
3. Add a row "Subagent delegation" (from Phase 1): large `promptLength` briefs, subagents on high-capability models doing mechanical work, and subagents that re-read files the parent had already read (`readTargets` overlap). Advisory only.

## Phase 5 — Docs and release

1. Update the scanner header comment, `SKILL.md` step 2 field list (both copies, keeping each under ~500 words), README scanner description, and CHANGELOG `[1.5.0]`. Bump the manifests to 1.5.0.
2. Mirror to `skills/tokentamer/`, run `npm test` (which includes `check-sync.sh`), commit, and push.

## Verification

- `npm test` passes.
- Running against snapabrick session `103cbc1e…` gives a non-empty `subagents` with `subagentTokens.output ≈ 89k`.
- Running against a recent tokentamer session gives non-empty `toolsAvailable`/`mcpServers`, `skillListing.count` of 151, and a `model` on every turn that has a reply.
