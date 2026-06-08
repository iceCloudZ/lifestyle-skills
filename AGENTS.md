# Repository Guidance

This repository uses a single entry skill plus non-triggering lenses.

## Structure

```text
skills/life-butler/SKILL.md   # only user-facing entry skill
lenses/{domain}/{lens}.md     # selectable thinking lenses, not standalone skills
lib/load-skill.mjs             # shared data loader for scripts and future SDK
registry.json                  # machine-readable catalog
evals/                        # synthetic routing and behavior cases
```

Do not add a new `skills/{domain}/SKILL.md` for every lifestyle philosophy. Add a lens instead, then register it in `registry.json`.

## Lens Frontmatter

Every lens must include these YAML frontmatter fields:

- `name`: kebab-case identifier matching the registry id
- `description`: one-line summary for indexing
- `triggers`: list of natural-language phrases describing when this lens applies
- `blockers`: list of common obstacles this lens addresses
- `safety`: list of safety rules and boundaries

The frontmatter is the single source of structured metadata. `registry.json` holds additional fields (best_for, avoid_if, style, risk_level) that complement the frontmatter but do not duplicate it.

## Progressive Disclosure

Loading happens in three tiers:

1. **Level 1 (index)**: `lib/load-skill.mjs` → `loadSkillMetadata()` returns name, description, triggers, blockers for all skills
2. **Level 2 (skill)**: Load the full SKILL.md for the matched skill or lens
3. **Level 3 (references)**: Load `selection-rules.md`, `scoring-model.md`, or specific lens files only when needed

Do not load all references upfront. The entry skill embeds a Lens Index table for basic routing and reads detailed references on demand.

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

Releases are automated via CI. Push a version tag to trigger the release workflow.
