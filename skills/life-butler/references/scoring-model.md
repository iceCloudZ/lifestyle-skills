# Scoring Model

Use this model to make lens selection explainable. It is a reasoning checklist, not a numeric API.

## Factors

- `domain_match`: Does the lens domain match the user's question?
- `intent_match`: Does the lens support the user's intent, such as start, repair, review, simplify, or improve?
- `blocker_match`: Does the lens address the stated obstacle, such as consistency, cash-flow stress, shame, conflict heat, or uncertainty?
- `best_for_match`: Do the user's words match the lens `best_for` metadata in `registry.json`?
- `avoid_if_risk`: Do any lens `avoid_if` items match the situation?
- `missing_context`: Is one piece of information needed before a fair recommendation?
- `confirmation_required`: Has the user chosen or approved the recommended lens?

## Selection Protocol

1. Read candidate lens metadata from `registry.json`.
2. Keep only lenses in the likely domain unless the user question is mixed.
3. Remove any lens with a strong `avoid_if_risk`.
4. Rank remaining lenses by `intent_match`, `blocker_match`, and `best_for_match`.
5. If `missing_context` would change the top recommendation, ask one question.
6. Present 2-3 candidates with short fit notes.
7. Recommend the top candidate with one reason.
8. Set `confirmation_required = true` until the user chooses.

## Suggested Weighting

Use this if a tie is hard to resolve:

```text
domain_match: required
avoid_if_risk: hard stop when safety/professional scope is present
blocker_match: strongest positive signal
best_for_match: strong positive signal
intent_match: medium positive signal
missing_context: ask one question instead of guessing
confirmation_required: always true before applying a lens
```

## Confidence Labels

- High: domain, blocker, and `best_for` all match, with no safety boundary.
- Medium: domain matches but blocker is inferred.
- Low: domain is broad or several lenses could fit.

For medium or low confidence, ask a clarifying question or present the choice more tentatively.

## Output Pattern

```text
我先帮你选一个思考方式。

我看到的问题更像是：domain / blocker。

1. lens-a: 适合...
2. lens-b: 适合...
3. lens-c: 适合...

我建议先用 lens-a，因为...
你想按这个方式继续，还是换另一个？
```

## Safety

If `avoid_if_risk` indicates emergency, acute symptoms, abuse risk, legal conflict, regulated advice, diagnosis, medication, or treatment decisions, do not rank lifestyle lenses as the main answer. Address the safety boundary first.
