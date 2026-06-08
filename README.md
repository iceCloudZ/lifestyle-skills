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

Each lens must be more than a philosophy summary. It needs two operating sections:

- `Evidence Card`: why this lens is admitted, what kind of evidence or practice supports it, what its limits are, and where it must not be used.
- `Reasoning Flow`: how the lens decides whether it applies, which key questions change the path, which branch to take, what a minimum complete answer must include, and when to hand off.

Eval results are feedback signals, not the design target. Do not add rigid answer templates only to improve win rate. If an eval exposes a weakness, first ask whether the lens's own reasoning contract is incomplete; if the eval is measuring the wrong value, change the eval instead.

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

## Manual LLM Evals

Use `scripts/build-eval-prompts.mjs` to generate deterministic prompts for manual or scheduled LLM evaluation.

Eval prompts split entry-skill behavior from lens behavior:

- Entry evals, such as `life-butler`, test lens selection. The guided response should recommend 2-3 lenses and let the user choose.
- Lens evals, such as `bogleheads-style`, test direct application. The prompt treats the expected lens as already selected, so the guided response should apply that lens's `Reasoning Flow` instead of routing back to lens selection.

List cases:

```bash
node scripts/build-eval-prompts.mjs --list
```

Build one prompt:

```bash
node scripts/build-eval-prompts.mjs --case life-butler-first-movement-001
```

Build all prompts into a local folder:

```bash
node scripts/build-eval-prompts.mjs --all --out generated/eval-prompts
```

These generated prompts are for free chatbots, local models, or scheduled eval jobs. They are not part of default CI because model output is probabilistic and external services may change.

## Three-Stage Eval Runner

For stronger evidence, keep generation and judging separate.

### 1. Prepare

```bash
node scripts/run-staged-eval.mjs prepare \
  --case life-butler-first-movement-001 \
  --run generated/eval-runs/movement-001
```

This creates:

```text
baseline-prompt.md
with-skill-prompt.md
baseline-response.md
with-skill-response.md
manifest.json
```

Send each prompt to the selected chatbot or local model independently. Put the answers in the matching response files.

### 2. Judge

```bash
node scripts/run-staged-eval.mjs judge \
  --run generated/eval-runs/movement-001
```

This creates a blind `judge-prompt.md` where the two answers are labeled only as Response A and Response B. Send it to a different model or a human reviewer, then save the required JSON as `judge-result.json`.

### 3. Finalize

```bash
node scripts/run-staged-eval.mjs finalize \
  --run generated/eval-runs/movement-001 \
  --out eval-results/manual.jsonl
```

Finalize maps the blind A/B result back to `baseline`, `with_skill`, or `tie`, validates binary scores, and writes a scoreboard-compatible result.

Prefer different models for response generation and judging. Record provider and model names in `judge-result.json`. Never use private household data with a third-party free chatbot.

## API Eval Runner

The API runner automates generation, blind judging, result archiving, and scoreboard output for any OpenAI-compatible endpoint.

Set credentials in environment variables. Never write API keys into repository files:

```bash
EVAL_BASE_URL=https://api.example.com/v1
EVAL_API_KEY=...
EVAL_MODEL=example-model
EVAL_MAX_TOKENS=2000

JUDGE_BASE_URL=https://api.example.com/v1
JUDGE_API_KEY=...
JUDGE_MODEL=another-model
JUDGE_MAX_TOKENS=4000
```

Run all first-use `life-butler` cases with a concurrency limit of 20:

```bash
node scripts/run-api-evals.mjs \
  --prefix life-butler-first- \
  --concurrency 20 \
  --run generated/api-runs/example \
  --out eval-results/example.jsonl \
  --scoreboard SCOREBOARD.md
```

The runner:

- sends baseline and with-skill prompts as isolated API requests
- uses a global concurrency pool
- retries rate limits and transient server errors
- randomly blinds response origin for the judge
- archives prompts, responses, API metadata, failures, and final results
- never stores the API key

For stronger evidence, use a different provider or model for `JUDGE_*`. Using the same model is supported but should be disclosed in published results.

## Scoreboard

After collecting manual or scheduled eval results, generate a scoreboard:

```bash
node scripts/build-scoreboard.mjs --out SCOREBOARD.md
```

Eval result files should be JSONL under `eval-results/` with this shape:

```json
{
  "case_id": "life-butler-first-movement-001",
  "expected_skill": "life-butler",
  "winner": "with_skill",
  "scores": {
    "trigger": 1,
    "fit": 1,
    "safety": 1,
    "actionability": 1
  },
  "notes": "Guided lens choice before applying advice."
}
```

Do not treat the scoreboard as scientific proof. It is an iteration tool for trigger quality, lens fit, safety boundaries, and actionability.

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
