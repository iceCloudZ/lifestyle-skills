# Selection Rules

Use these rules to choose 2-3 lenses for the user.

## Selection Process

1. Identify the domain from the user's language.
2. Filter out lenses whose `avoid_if` risks match the situation.
3. Prefer the lens whose `best_for` matches the user's stated blocker.
4. If context is missing, ask one question before recommending.
5. Offer a recommendation, but let the user choose.

## Tie Breakers

- If the blocker is consistency, failed previous plans, low motivation, or "I can't stick with it", prefer `tiny-habits-movement`.
- If the blocker is cash-flow stress, surprise bills, or unclear monthly limits, prefer `zero-based-budgeting`.
- If the blocker is shame or guilt around spending, prefer `conscious-spending`.
- If the blocker is long-term investing, overcomplicated portfolios, or performance chasing, prefer `bogleheads-style`.
- If the blocker is preventive health metrics, lab trends, or preparing doctor questions, prefer `longevity-medicine`.
- If the blocker is family lifestyle environment, shared routines, stress, food, and connection, prefer `blue-zones-style`.
- If the blocker is everyday nutrition quality or grocery choices, prefer `daily-dozen-style`.
- If the blocker is cardio base, energy, heart health, or sustainable aerobic work, prefer `zone2-longevity`.
- If the blocker is beginner strength, daily-life resilience, or safe lifting basics, prefer `strength-baseline`.
- If the blocker is conflict heat, prefer de-escalation before problem solving.
- If the blocker is conflict heat and the user needs a short non-accusatory message, prefer `nvc-style`.
- If the blocker is relationship repair, recurring couple conflict, or bids for connection, prefer `gottman-style`.
- If the blocker is parenting boundary, child behavior, or avoiding yelling/giving in, prefer `positive-discipline-style`.
- If safety or professional scope is present, do not apply a lifestyle lens until the boundary is addressed.

## Domain Defaults

Use these only after checking safety and `avoid_if`.

| User signal | Domain | First candidate | Other candidates |
| --- | --- | --- | --- |
| "I want to start managing money" | finance | `conscious-spending` | `zero-based-budgeting`, `bogleheads-style` |
| "Money is chaotic this month" | finance | `zero-based-budgeting` | `conscious-spending` |
| "I want to invest for the long term" | finance | `bogleheads-style` | `conscious-spending` |
| "I want to get healthier but hate strict plans" | health | `blue-zones-style` | `daily-dozen-style`, `longevity-medicine` |
| "I want to understand my metrics" | health | `longevity-medicine` | `blue-zones-style` |
| "I want to move but can't stick with exercise" | movement | `tiny-habits-movement` | `zone2-longevity`, `strength-baseline` |
| "I want better heart health or energy" | movement | `zone2-longevity` | `tiny-habits-movement`, `strength-baseline` |
| "I want to get stronger" | movement | `strength-baseline` | `tiny-habits-movement` |
| "I need to say something without a fight" | family | `nvc-style` | `gottman-style` |
| "We keep having the same couple conflict" | family | `gottman-style` | `nvc-style` |
| "My child refuses a boundary" | family | `positive-discipline-style` | `nvc-style` |

## Output Discipline

Keep lens options short:

```text
1. Lens name: best for...
2. Lens name: best for...
3. Lens name: best for...
```

Then give one recommendation and ask the user to choose.

Never apply a lens silently. The user must see the recommendation and have a chance to choose another lens.
