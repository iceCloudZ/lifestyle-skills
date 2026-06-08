import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function walkMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

test("all lenses include evidence cards and reasoning flows", () => {
  const lensPaths = walkMarkdown(join(root, "lenses"));

  assert.ok(lensPaths.length >= 12);
  for (const path of lensPaths) {
    const lens = readFileSync(path, "utf8");

    assert.match(lens, /## Evidence Card/, path);
    assert.match(lens, /evidence_level:/, path);
    assert.match(lens, /evidence_type:/, path);
    assert.match(lens, /why_included:/, path);
    assert.match(lens, /known_limits:/, path);
    assert.match(lens, /safety_boundaries:/, path);
    assert.match(lens, /not_for:/, path);

    assert.match(lens, /## Reasoning Flow/, path);
    assert.match(lens, /### 1\. Pre-check/, path);
    assert.match(lens, /minimum complete answer|### 3\. Deliver|### 4\. Minimum complete/i, path);
    assert.match(lens, /hand.?off/i, path);
  }
});

test("life-butler defines what happens after recommending lenses", () => {
  const skill = readFileSync(join(root, "skills/life-butler/SKILL.md"), "utf8");

  assert.match(skill, /## After Lens Recommendation/);
  assert.match(skill, /accepts the lens/i);
  assert.match(skill, /does not choose/i);
  assert.match(skill, /hesitates|declines/i);
  assert.match(skill, /reasoning flow/i);
});
