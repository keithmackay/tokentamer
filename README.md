# Tokentamer

Audits a project's Claude Code session transcripts to find concrete, evidence-backed opportunities to have used fewer tokens: repeated/duplicated work, context pollution, unused MCP tools, poorly-disclosed skills, bloated prompts, verbose CLAUDE.md/memory files, wrong model choices, missed memory-save opportunities, and places a deterministic script would have beaten an LLM call.

## Highlights

- **Evidence-based findings** — every finding cites a session id, timestamp, and quote or tool-call sequence, not generic advice
- **Deterministic extraction** — a bundled script parses transcript JSONL directly instead of asking the model to eyeball raw logs
- **Ten review categories** — context pollution, duplicated work, LLM-vs-script calls, late or rarely used MCP tools, undisclosed skills, oversized prompts, verbose harness files, wrong model choice, missed memory opportunities, and redundant reads
- **Scales to large histories** — output is newline-delimited JSON (one session per line), so a large project can be paged through or delegated to subagents instead of loaded whole into context
- **Cross-platform** — ships as a native skill for Claude Code, Codex, Antigravity, and Gemini CLI, with documented fallbacks where a platform lacks a feature the others have

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

The root `SKILL.md` has no Claude Code-specific frontmatter (no `metadata`, `retrieval`, or `tags` fields), so it is used as-is — no separate `antigravity/SKILL.md` was needed.

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

Each line of output is one session: human-typed turns (truncated to 400 chars by default), token totals per session and per model, model usage, tool-call counts, MCP tool-call timestamps, repeated read/fetch targets, skill invocations (slash command or `Skill` tool), and injected skill bodies with their size — the same data the skill itself analyzes.

To have the skill offer fixes after the report, add `--fix`:

```
/tokentamer --fix review ~/Projects/my-app for token waste
```

It lists only the findings it can act on — splitting a verbose CLAUDE.md/SKILL.md/memory file, or saving a restated preference as a memory for the audited project — and applies just the ones you pick. Everything else stays advisory.

Run `/tokentamer --help` (or the equivalent trigger on other platforms) to print usage without running the workflow, or `--version` to print the installed version and check for updates.

## Development

This is a documentation-and-script skill package, not a compiled project — there's no build step. Tests use Node's built-in runner against a synthetic transcript fixture, then run the sync check:

```bash
git clone https://github.com/keithmackay/tokentamer.git
cd tokentamer
npm test
node scripts/scan-transcripts.js "$PWD" --session <sessionId>   # sanity-check the scanner against this repo's own transcripts
```

When editing `SKILL.md`, keep it under ~500 words (progressive disclosure — move heavy reference material into `references/`) and re-sync the ported copies under `skills/tokentamer/` for Codex and Gemini CLI so all four platform versions stay consistent. `npm test` runs `scripts/check-sync.sh`, which verifies the shared `references/*.md` and `scripts/scan-transcripts.js` files still match between the two trees (it deliberately skips `SKILL.md`, `help.md`, and the port-only `platform-limitations.md`, which differ by design between platforms).

`docs/reviews/` and `docs/plans/` are internal dev-history artifacts from past `/improve-this` review passes on this repo, kept for context — they aren't user-facing documentation.

## Contributing

Contributions are welcome — fork the repo, make your changes on a branch, and open a pull request. If you're changing `SKILL.md` or `references/`, please also update the corresponding copy under `skills/tokentamer/` so the Codex and Gemini CLI ports don't drift out of sync.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE)

## Compatibility

| Feature | Claude Code | Codex | Antigravity | Gemini CLI |
|---------|:-----------:|:-----:|:-----------:|:----------:|
| Core skill | ✅ | ✅ | ✅ | ✅ |
| Sub-documents (`references/`) | ✅ | ✅ | ✅ | ✅ |
| Scripts (`scripts/scan-transcripts.js`) | ✅ | ✅ | ✅ | ✅ |
| `superpowers:writing-skills` reference (plugin namespacing) | ✅ (optional; graceful fallback if absent) | ❌ | ❌ (not installed) | ❌ |
| `artifact-design` skill reference (report publishing) | ✅ (optional; graceful fallback if absent) | ❌ | ❌ (markdown report returned instead) | ❌ |
| Subagent dispatch (per-session delegation) | ✅ | ✅ | ✅ | ❌ |
| `--fix` mode: multi-select fixable-finding picker | ✅ (AskUserQuestion) | ✅ (numbered-list fallback) | ✅ (numbered-list fallback) | ✅ (numbered-list fallback) |

Legend: ✅ Supported · ❌ Not supported

Where a Claude Code-specific skill reference has no equivalent, the ported `SKILL.md` documents a fallback under **Platform Limitations** (Codex and Gemini CLI copies) rather than failing silently. On Claude Code itself, both `superpowers:writing-skills` and `artifact-design` are optional — the workflow degrades gracefully if either plugin isn't installed.

## References

- **Claude Code Skills:** https://code.claude.com/docs/en/skills
- **Claude Code Complete Guide (PDF):** https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- **Codex Plugins:** https://developers.openai.com/codex/plugins/build
- **Antigravity Skills:** https://antigravity.google/docs/skills
- **Gemini CLI Extensions:** https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md
- **Agent Skills open standard:** https://agentskills.io/home
