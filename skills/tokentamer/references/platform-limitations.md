# Platform Limitations

The same `SKILL.md` ships to every platform: the root copy (Claude Code symlink/copy installs, Antigravity) and `skills/tokentamer/` (Claude Code marketplace installs, Codex, Gemini CLI). These are the features that differ, and what to do where one is missing.

| Feature | Claude Code | Codex | Antigravity | Gemini CLI | Fallback |
|---|:-:|:-:|:-:|:-:|---|
| Subagent dispatch (step 4) | ✅ | ✅ | ✅ | ❌ | Analyze the NDJSON scan output in the main session. |
| Artifact publishing + `artifact-design` skill (step 6) | ✅ | ❌ | ❌ | ❌ | Hand back the markdown report file. |
| `superpowers:writing-skills` (categories.md) | optional | ❌ | ❌ | ❌ | Apply the rule in categories.md directly: always-loaded SKILL.md under ~500 words, heavy material in referenced files. |
| AskUserQuestion multi-select (Fix Mode step 2) | ✅ | ❌ | ❌ | ❌ | Present a numbered list and ask which numbers to apply, in any combination. |

The transcript data itself (`~/.claude/projects/*.jsonl`) is Claude Code's. This skill only analyzes Claude Code session history, whichever platform runs it.
