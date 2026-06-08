import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("life-butler explicitly loads the scoring model for lens choice", () => {
  const skill = read("skills/life-butler/SKILL.md");

  assert.match(skill, /scoring-model\.md/);
  assert.match(skill, /registry\.json/);
});

test("scoring model defines explainable score factors and confirmation", () => {
  const scoring = read("skills/life-butler/references/scoring-model.md");

  for (const factor of [
    "domain_match",
    "intent_match",
    "blocker_match",
    "best_for_match",
    "avoid_if_risk",
    "missing_context",
    "confirmation_required"
  ]) {
    assert.match(scoring, new RegExp(factor));
  }
});

test("selection rules map common first-use blockers to recommended lenses", () => {
  const rules = read("skills/life-butler/references/selection-rules.md");

  const expectations = [
    ["consistency", "tiny-habits-movement"],
    ["cash-flow stress", "zero-based-budgeting"],
    ["shame or guilt", "conscious-spending"],
    ["long-term investing", "bogleheads-style"],
    ["conflict heat", "nvc-style"],
    ["parenting boundary", "positive-discipline-style"]
  ];

  for (const [trigger, lens] of expectations) {
    assert.match(rules, new RegExp(trigger, "i"));
    assert.match(rules, new RegExp(lens, "i"));
  }
});
