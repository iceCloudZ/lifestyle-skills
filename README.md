# Lifestyle Skills

Local-first lifestyle skills for AI agents.

This repository collects reusable `SKILL.md` thinking modules for household and personal life domains such as finance, health, movement, and family relationships.

The goal is not to provide professional financial, medical, legal, or psychological advice. The goal is to give local agents structured, auditable reasoning styles that help them choose better questions, safer trade-offs, and more actionable next steps.

## What This Is

- A skill library for lifestyle reasoning.
- A registry of machine-readable skill metadata.
- A starter eval set for testing when a skill should or should not be used.
- A local-first building block for products such as LifeOps.

## What This Is Not

- Not an MCP server.
- Not a tool adapter.
- Not a chatbot frontend.
- Not a source of professional advice.
- Not an imitation of any real person.

## Repository Layout

```text
skills/      Skill folders. Each skill has a SKILL.md file.
schemas/     JSON schema for skill registry entries.
evals/       Synthetic eval cases for routing and output quality.
examples/    Synthetic member profiles and household context.
scripts/     Local validation scripts.
```

## MVP Domains

- `finance`: spending, budgeting, long-term investing principles.
- `health`: long-term health, lifestyle patterns, nutrition habits.
- `movement`: aerobic base, strength baseline, tiny movement habits.
- `family`: relationship repair, nonviolent communication, positive discipline.

## Validate Locally

```bash
node scripts/validate.mjs
```

## CI/CD

This repo starts with CI only:

- validate registry shape
- validate `SKILL.md` files exist
- validate eval case JSONL files
- check registry paths

There is no CD in the first phase. Publishing should stay manual until the schema, evals, and contribution process stabilize.

## License

MIT
