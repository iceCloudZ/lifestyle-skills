# Repository Guidance

This repository uses a single entry skill plus non-triggering lenses.

## Structure

```text
skills/life-butler/SKILL.md   # only user-facing entry skill
lenses/{domain}/{lens}.md     # selectable thinking lenses, not standalone skills
registry.json                 # machine-readable catalog
evals/                        # synthetic routing and behavior cases
```

Do not add a new `skills/{domain}/SKILL.md` for every lifestyle philosophy. Add a lens instead, then register it in `registry.json`.

## Development

When changing repository shape, write or update a static test first:

```bash
node --test tests/*.test.mjs
```

Then run validation:

```bash
node scripts/validate.mjs
```

## Evaluation

CI only runs deterministic checks. LLM evals should run manually or on a scheduled workflow because model behavior is probabilistic and may depend on external providers.

First-use evals must assume no local user data. Do not add weekly review requirements unless the eval case includes enough history or the user explicitly asks for review.

For comparative evals, keep the three stages separate:

1. Generate the baseline response without repository skill materials.
2. Generate the guided response with the expected skill or lens materials.
3. Blind the response origin before judging.

Do not reveal the A/B mapping to the judge prompt. Prefer a different model or a human for judging.

API eval credentials must come from environment variables. Never write keys to tracked or generated files, logs, error messages, or result JSON.

## Release

There is no CD yet. Keep publishing manual until the entry flow, lens format, and eval strategy stabilize.
