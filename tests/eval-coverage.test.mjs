import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readJsonl(path) {
  return readFileSync(join(root, path), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("life-butler has enough first-use eval coverage", () => {
  const cases = readJsonl("evals/life/life-butler.jsonl");

  assert.ok(cases.length >= 5, `expected at least 5 life-butler cases, found ${cases.length}`);
  assert.ok(cases.every((item) => item.member_profile_ref === null), "first-use cases should not assume local data");
  assert.ok(cases.some((item) => /理财|money|finance/i.test(item.situation)));
  assert.ok(cases.some((item) => /运动|exercise|movement/i.test(item.situation)));
  assert.ok(cases.some((item) => /伴侣|吵架|conflict|relationship/i.test(item.situation)));
});

test("each lens has at least three eval cases", () => {
  const registry = readJson("registry.json");
  const lenses = registry.skills.filter((skill) => skill.skill_type === "lens");

  for (const lens of lenses) {
    const cases = readJsonl(`evals/${lens.domain}/${lens.id}.jsonl`);
    assert.ok(cases.length >= 3, `${lens.id} should have at least 3 eval cases`);
  }
});

test("there are no orphan eval files outside registered skills", () => {
  const registry = readJson("registry.json");
  const expected = new Set(registry.skills.map((skill) => `evals/${skill.domain}/${skill.id}.jsonl`));
  const actual = [];

  for (const domain of readdirSync(join(root, "evals"), { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    for (const file of readdirSync(join(root, "evals", domain.name))) {
      if (file.endsWith(".jsonl")) actual.push(`evals/${domain.name}/${file}`);
    }
  }

  for (const file of actual) {
    assert.ok(expected.has(file), `${file} is not registered`);
  }
});
