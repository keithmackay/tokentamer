# Tokentamer

Audits a project's Claude Code session transcripts to find concrete, evidence-backed opportunities to have used fewer tokens: repeated/duplicated work, context pollution, unused MCP servers, always-loaded skill listings, costly subagent delegation, poorly-disclosed skills, bloated prompts, verbose CLAUDE.md/memory files, wrong model choices, missed memory-save opportunities, and places a deterministic script would have beaten an LLM call.

## Highlights

- **Evidence-based findings** — every finding cites a session id, timestamp, and quote or tool-call sequence, not generic advice
- **Deterministic extraction** — a bundled script parses transcript JSONL directly (including subagent transcripts) instead of asking the model to eyeball raw logs
- **Twelve review categories** — context pollution, duplicated work, LLM-vs-script calls, unused MCP servers, always-on listing overhead, undisclosed skills, oversized prompts, verbose harness files, wrong model choice, subagent delegation, missed memory opportunities, and redundant reads
- **Scales to large histories** — output is newline-delimited JSON (one session per line), so a large project can be paged through or delegated to subagents instead of loaded whole into context
- **Cross-platform** — ships as a native skill for Claude Code, Codex, Antigravity, and Gemini CLI, with documented fallbacks where a platform lacks a feature the others have

## Compatibility

| Feature | Claude Code | Codex | Antigravity | Gemini CLI |
|---------|:-----------:|:-----:|:-----------:|:----------:|
| Core skill, `references/`, bundled scanner | ✅ | ✅ | ✅ | ✅ |
| Subagent dispatch (per-session delegation) | ✅ | ✅ | ✅ | ❌ (analyzes in the main session) |
| Publish the report as an Artifact | ✅ | ❌ (markdown file) | ❌ (markdown file) | ❌ (markdown file) |
| `--fix` multi-select picker | ✅ (AskUserQuestion) | numbered list | numbered list | numbered list |
| Optional skills (`artifact-design`, `superpowers:writing-skills`) | used if installed | — | — | — |

Every platform loads the same `SKILL.md`, which checks what the platform supports and falls back as above. The details are in [`references/platform-limitations.md`](references/platform-limitations.md).

## Getting Started

### Prerequisites

- Node.js (v18+)

### Installation

#### From the mackayi marketplace (recommended)

```
/plugin marketplace add keithmackay/mackayi
/plugin install tokentamer@mackayi
```

#### Claude Code

```bash
mkdir -p ~/.claude/skills
cp -r /path/to/tokentamer/ ~/.claude/skills/tokentamer/
```

Or symlink:
```bash
ln -s /path/to/tokentamer/ ~/.claude/skills/tokentamer
```

Then invoke with: `/tokentamer`

#### Codex

Place the plugin directory where Codex can find it, then add an entry to your marketplace:

**`~/.agents/plugins/marketplace.json`** (create if absent):
```json
{
  "name": "personal",
  "interface": { "displayName": "Personal Plugins" },
  "plugins": [
    {
      "name": "tokentamer",
      "source": { "source": "local", "path": "/path/to/tokentamer/" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

#### Antigravity

**Global install** (all workspaces):
```bash
mkdir -p ~/.gemini/antigravity/skills
cp -r /path/to/tokentamer/ ~/.gemini/antigravity/skills/tokentamer/
```

**Workspace install** (current project only):
```bash
cp -r /path/to/tokentamer/ .agents/skills/tokentamer/
```

Skills are auto-discovered. You can also mention the skill by name to force activation.

#### Gemini CLI

Gemini CLI installs extensions directly from GitHub:

```bash
gemini extensions install https://github.com/keithmackay/tokentamer
```

To update:
```bash
gemini extensions update tokentamer
```

After installation, `GEMINI.md` tells Gemini to load the skill only when you ask for a token-waste audit. Local install is not directly supported — this directory must live in a GitHub repository for `gemini extensions install` to work.

## Usage

Invoke the skill directly (`/tokentamer` on Claude Code, or the equivalent trigger on other platforms) and give it a project to audit:

```
/tokentamer review ~/Projects/my-app for token waste
```

The skill locates that project's transcripts under `~/.claude/projects/`, runs the bundled scanner, checks each finding against the category list in `references/categories.md`, and writes a report using the structure in `references/report-template.md`.

You can also run the scanner directly to inspect the raw data yourself:

```bash
node scripts/scan-transcripts.js /Users/you/Projects/my-app > /tmp/scan.ndjson
```

```bash
# Untruncated prompt text, one session only
node scripts/scan-transcripts.js /Users/you/Projects/my-app --full --session <sessionId>
```

Each line of output is one session: human-typed turns (truncated to 400 chars by default, each tagged with the model that answered it), token totals per session and per model, model usage, tool-call counts, MCP tool-call timestamps, connected-vs-used MCP tools per server, repeated read/fetch targets, skill invocations (slash command or `Skill` tool), injected skill bodies with their size, the size of the always-loaded skill listing, and a per-subagent breakdown (type, model, brief length, tokens, tool calls, reads) from the session's subagent transcripts, compactions and interruptions, and which nested worktree (if any) the session ran in — the same data the skill itself analyzes.

To have the skill offer fixes after the report, add `--fix`:

```
/tokentamer --fix review ~/Projects/my-app for token waste
```

It lists only the findings it can act on — splitting a verbose CLAUDE.md/SKILL.md/memory file, or saving a restated preference as a memory for the audited project — and applies just the ones you pick. Everything else stays advisory.

Run `/tokentamer --help` (or the equivalent trigger on other platforms) to print usage without running the workflow, or `--version` to print the installed version and check for updates.

## Development

This is a documentation-and-script skill package, not a compiled project — there's no build step. Tests use Node's built-in runner against synthetic transcript fixtures modeled on real entry types, then run the sync check:

```bash
git clone https://github.com/keithmackay/tokentamer.git
cd tokentamer
npm test
node scripts/scan-transcripts.js "$PWD" --session <sessionId>   # sanity-check the scanner against this repo's own transcripts
```

When editing `SKILL.md`, keep it under ~500 words (progressive disclosure: move heavy reference material into `references/`). The root files are canonical, and `skills/tokentamer/` is a byte-identical mirror for the Claude Code marketplace, Codex and Gemini CLI. Copy changes across; `npm test` runs `scripts/check-sync.sh`, which fails if `SKILL.md`, `help.md`, any `references/*.md` file or the scanner differs between the two trees.

`docs/reviews/` and `docs/plans/` are internal dev-history artifacts from past `/improve-this` review passes on this repo, kept for context — they aren't user-facing documentation.

## Contributing

Contributions are welcome — fork the repo, make your changes on a branch, and open a pull request. If you change `SKILL.md`, `help.md`, `references/` or the scanner, copy the change to `skills/tokentamer/` too; `npm test` checks this.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE)

## References

- **Claude Code Skills:** https://code.claude.com/docs/en/skills
- **Claude Code Complete Guide (PDF):** https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- **Codex Plugins:** https://developers.openai.com/codex/plugins/build
- **Antigravity Skills:** https://antigravity.google/docs/skills
- **Gemini CLI Extensions:** https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md
- **Agent Skills open standard:** https://agentskills.io/home
