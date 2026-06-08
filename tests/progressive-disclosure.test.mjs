import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { loadSkillMetadata, loadSkill } from "../lib/load-skill.mjs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const libRoot = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

test("Level 1: loadSkillMetadata returns compact index for all skills", () => {
  const metadata = loadSkillMetadata(libRoot);

  assert.ok(metadata.length >= 13, `expected at least 13 entries, got ${metadata.length}`);

  const entry = metadata.find((m) => m.id === "life-butler");
  assert.ok(entry);
  assert.equal(entry.skill_type, "entry");

  const lenses = metadata.filter((m) => m.skill_type === "lens");
  assert.ok(lenses.length >= 12);

  for (const lens of lenses) {
    assert.ok(lens.triggers.length >= 3, `${lens.id} should have at least 3 triggers`);
    assert.ok(lens.blockers.length >= 2, `${lens.id} should have at least 2 blockers`);
    assert.ok(lens.description, `${lens.id} should have a description`);
  }
});

test("Level 2: loadSkill returns entry skill content without full references", () => {
  const skill = loadSkill(libRoot, "life-butler");
  assert.ok(skill);
  assert.match(skill.content, /# Life Butler/);
  assert.match(skill.content, /Lens Index/);
  assert.match(skill.content, /First-Use Flow/);
});

test("Level 2: loadSkill returns lens content with reasoning flow", () => {
  const skill = loadSkill(libRoot, "bogleheads-style");
  assert.ok(skill);
  assert.match(skill.content, /## Reasoning Flow/);
  assert.match(skill.content, /Apply this lens directly/);
});

test("Level 3: lens references are separate files loaded on demand", () => {
  const skill = loadSkill(libRoot, "bogleheads-style");
  assert.ok(skill);

  assert.doesNotMatch(skill.content, /tiny-habits-movement/, "lens should not include other lens content");
  assert.doesNotMatch(skill.content, /nvc-style/, "lens should not include other domain content");
});

test("lib does not perform keyword matching — routing is LLM responsibility", () => {
  const loadSkillModule = readFileSync(join(root, "lib/load-skill.mjs"), "utf8");
  assert.doesNotMatch(loadSkillModule, /matchLenses|domainKeywords|keyword/i, "lib should not contain keyword matching logic");
});
