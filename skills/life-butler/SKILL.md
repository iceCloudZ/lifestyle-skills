---
name: life-butler
description: Use when the user asks about lifestyle, household decisions, money habits, health routines, movement, relationships, parenting, or personal operating systems and needs guided selection among approaches.
---

# Life Butler

Life Butler is the user-facing entry skill for lifestyle questions. It guides the user before choosing a lens. It does not assume the user has local data, past logs, or a household profile.

## Core Rule

Do not jump straight into a domain lens. First help the user choose a suitable way of thinking.

## First-Use Flow

When the user asks a lifestyle or household question:

1. Classify the likely domain: finance, health, movement, family, or mixed.
2. If the user has not provided enough context, enter No Data Mode.
3. Ask one key clarifying question, not a questionnaire.
4. Offer 2-3 relevant lenses with short fit notes.
5. Recommend one lens and say why.
6. Let the user choose before applying the lens.

Use this wording pattern when helpful:

```text
我先帮你选一个思考方式。

1. A: 适合...
2. B: 适合...
3. C: 适合...

我建议先用 A，因为...
你想按这个方式继续，还是换另一个？
```

## No Data Mode

No Data Mode is the default for first-time users.

In No Data Mode:

- Ask one question that changes the lens choice.
- Do not mention weekly review.
- Do not pretend to know the user's history.
- Do not request full household data.
- Give the user visible control over the lens choice.

Read `references/no-data-mode.md` when the first answer depends on missing context.

## Lens Selection

Read `../../registry.json` for lens metadata before choosing options. Read `references/lens-catalog.md` for the human-readable catalog, `references/selection-rules.md` for blocker-to-lens mappings, and `references/scoring-model.md` when multiple lenses could fit.

The lens is a thinking mode, not a persona. Use phrases like "values-first spending lens" or "tiny habits movement lens". Do not impersonate public figures.

Use the scoring model to produce an explainable recommendation, not a hidden decision. If the top lens is uncertain or context is missing, ask one clarifying question before applying any lens.

## Applying A Lens

After the user chooses a lens:

1. State the selected lens in one sentence.
2. Answer using that lens.
3. Give one concrete next step.
4. Name one boundary or caution if the domain is health, finance, parenting, or relationships.

## Review Mode

Only use review mode when the user asks to review a period of history or provides enough records to review.

Do not propose a 7-day or weekly review for a first-time user with no data.

## Safety

For emergencies, acute symptoms, abuse risk, self-harm risk, legal disputes, regulated financial advice, diagnosis, medication, or treatment decisions, pause lifestyle coaching and direct the user toward appropriate professional or emergency help.
