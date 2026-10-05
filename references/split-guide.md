# Splitting a verbose harness/skill file

Applies to two categories: **verbose/unsplit harness files** (CLAUDE.md, AGENTS.md, MEMORY.md) and **skills without progressive disclosure** (SKILL.md). Same mechanics either way — move rarely-needed content out, leave a pointer behind.

1. **Identify split candidates** within the flagged file: sections that are long, only needed occasionally (troubleshooting runbooks, exhaustive tables, one-off project history, detailed examples), and not required on every load.
2. **Create a `references/` directory** next to the file if one doesn't already exist (for a skill, this is standard; for CLAUDE.md/AGENTS.md/MEMORY.md, place it alongside that file).
3. **Move each candidate section verbatim** into its own file under `references/`, named for its content (kebab-case, e.g. `references/troubleshooting-db-connections.md`). Don't summarize or compress during the move — this is a relocation, not a rewrite.
4. **Replace the section in the original file** with a short pointer: what it covers and when to load it, e.g. `See references/troubleshooting-db-connections.md when a DB connection error appears — not needed otherwise.`
5. **Keep always-relevant content inline** — this includes short rules, core behavioral directives, and anything needed on effectively every load. Only move content that's conditional on a specific situation.
6. **Show a before/after word count** for the main file so the user can see the reduction, and list every new reference file created.
