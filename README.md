# Lifestyle Skills

Local-first lifestyle reasoning skills for AI agents.

This repository is built around one user-facing entry skill:

```text
skills/life-butler/SKILL.md
```

Users should start with `life-butler`. It guides the first conversation, asks one useful question when there is no data, presents 2-3 suitable lifestyle lenses, recommends one, and lets the user choose before applying it.

The other files are lenses, not entry skills. They should not compete for initial triggering.

## Why This Shape

A first-time user usually has no local household data, no member profile, and no history to review. A good lifestyle skill must start by guiding the user, not by pretending it already knows the family.

The intended first-use flow is:

```text
user asks a lifestyle question
  -> life-butler triggers
  -> no-data mode if needed
  -> ask one key question
  -> offer 2-3 lenses
  -> user chooses
  -> answer with the chosen lens
```

## Repository Layout

```text
skills/
  life-butler/
    SKILL.md
    references/
      lens-catalog.md
      no-data-mode.md
      scoring-model.md
      selection-rules.md
lenses/
  finance/
  health/
  movement/
  family/
registry.json
schemas/
evals/
tests/
scripts/
```

## Lenses

Lenses are thinking modes. They are not personas, agents, or professional advisors.

Current MVP lenses:

- Finance: conscious spending, Bogleheads-style, zero-based budgeting.
- Health: longevity medicine, Blue Zones-style, Daily Dozen-style.
- Movement: Zone 2 longevity, strength baseline, tiny habits movement.
- Family: Gottman-style, NVC-style, positive discipline-style.

## How Lens Selection Works

`life-butler` does not assume there is one correct lens. It makes an explainable recommendation, then asks the user to choose.

Selection uses:

- `registry.json` for machine-readable lens metadata.
- `skills/life-butler/references/lens-catalog.md` for a human-readable catalog.
- `skills/life-butler/references/selection-rules.md` for common blocker-to-lens mappings.
- `skills/life-butler/references/scoring-model.md` for the recommendation protocol.

The scoring model checks:

```text
domain_match
intent_match
blocker_match
best_for_match
avoid_if_risk
missing_context
confirmation_required
```

For example:

```text
"I want to exercise but never stick with it"
  -> domain: movement
  -> blocker: consistency
  -> candidates: tiny-habits-movement, zone2-longevity, strength-baseline
  -> recommendation: tiny-habits-movement
  -> user still chooses before the lens is applied
```

This keeps first use lightweight while still leaving room for LifeOps or another local-first app to use member profiles and history later.

## Testing

Static tests run in CI:

```bash
node --test tests/*.test.mjs
node scripts/validate.mjs
```

LLM evals are intentionally not part of default CI. They should run manually or on a scheduled job because model outputs are slower, probabilistic, and may depend on external providers.

## CI/CD

This repo uses CI only in the first phase.

CI validates:

- registry shape
- entry skill existence
- lens paths
- `SKILL.md` frontmatter for entry skills
- eval JSONL syntax

There is no CD yet. Release automation, tarballs, and marketplace packaging should wait until the first-use flow and eval strategy are stable.

## Safety

Lifestyle lenses can help organize thinking, but they do not replace professional financial, medical, legal, psychological, or emergency support.

Do not send private household data to third-party eval models. Use synthetic eval cases unless the user explicitly chooses a local/private evaluation flow.

## License

MIT
