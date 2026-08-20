# Platform Limitations

This skill's body references plugin-namespaced Claude Code skills (`superpowers:writing-skills`, `artifact-design`) that have no equivalent on Codex or Gemini CLI. This same `SKILL.md` is loaded by both Codex and Gemini CLI (identical `skills/<name>/SKILL.md` path per each platform's spec), so the fallbacks below hold for both.

The following features from the original (Claude Code) skill are not supported on this platform:

| Feature | Reason |
|---------|--------|
| Reference to `superpowers:writing-skills` (step 4, categories.md) | Plugin-namespaced Claude Code skill; not installed/resolvable on Codex or Gemini CLI. If word-count guidance is needed, apply the general rule directly: keep the always-loaded SKILL.md under ~500 words, move heavy reference material to separate files. |
| Reference to the `artifact-design` skill (step 6) | Claude Code-specific Artifact publishing skill; has no equivalent on Codex or Gemini CLI. Skip that step — just deliver the markdown report file directly. |
| Subagent dispatch (step 4) | Supported on Codex; **not** supported on Gemini CLI (no `Task`-style dispatch). On Gemini CLI, analyze the NDJSON scan output directly in the main session rather than delegating per session/batch. |

The transcript source data itself (`~/.claude/projects/*.jsonl`) is Claude Code-specific. This skill only analyzes Claude Code session history, regardless of which platform runs it.
