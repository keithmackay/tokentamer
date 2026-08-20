# Report structure

```markdown
# Tokentamer Report — <project>

## Overview
2-4 sentences: which patterns showed up, roughly how often, the single highest-leverage fix.

## Key patterns to avoid (quick reference)
Bullet list, one line per pattern found, for skimming.

## Strategies to adopt
Bullet list of concrete practices (save to memory, split CLAUDE.md, script instead of prompt, etc.)

## Findings by category
### <Category>
- **Evidence:** session `<id>`, `<timestamp>` — "<quote>"
- **Cost:** why this was expensive (rough terms: N extra turns, a K-token file reloaded M times, etc.)
- **Fix:** the specific, actionable change
(repeat per finding; omit categories with no evidence)
```

Keep the overview and quick-reference sections short — they're the part most likely to actually get read.
