# Selection Rules

Use these rules to choose 2-3 lenses for the user.

## Selection Process

1. Identify the domain from the user's language.
2. Filter out lenses whose `avoid_if` risks match the situation.
3. Prefer the lens whose `best_for` matches the user's stated blocker.
4. If context is missing, ask one question before recommending.
5. Offer a recommendation, but let the user choose.

## Tie Breakers

- If the blocker is consistency, prefer a tiny-habit lens.
- If the blocker is cash-flow stress, prefer a constraint-first budgeting lens.
- If the blocker is shame or guilt, prefer a low-shame values lens.
- If the blocker is conflict heat, prefer de-escalation before problem solving.
- If safety or professional scope is present, do not apply a lifestyle lens until the boundary is addressed.

## Output Discipline

Keep lens options short:

```text
1. Lens name: best for...
2. Lens name: best for...
3. Lens name: best for...
```

Then give one recommendation and ask the user to choose.
