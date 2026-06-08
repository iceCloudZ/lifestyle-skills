import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("repository exposes one life-butler entry skill and lens entries", () => {
  const registry = readJson(join(root, "registry.json"));
  const entries = registry.skills.filter((skill) => skill.skill_type === "entry");
  const lenses = registry.skills.filter((skill) => skill.skill_type === "lens");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "life-butler");
  assert.equal(entries[0].path, "skills/life-butler/SKILL.md");
  assert.equal(entries[0].domain, "life");
  assert.ok(lenses.length >= 12);
  assert.ok(lenses.every((lens) => lens.path.startsWith("lenses/")));
});

test("life-butler skill supports first use without local data", () => {
  const skillPath = join(root, "skills/life-butler/SKILL.md");
  assert.ok(existsSync(skillPath));

  const skill = readFileSync(skillPath, "utf8");
  assert.match(skill, /No Data Mode/);
  assert.match(skill, /ask one/i);
  assert.match(skill, /2-3/);
  assert.match(skill, /let the user choose/i);
});

test("schema supports entry and lens skill types", () => {
  const schema = readJson(join(root, "schemas/lifestyle-skill.schema.json"));
  assert.deepEqual(schema.properties.skill_type.enum, ["entry", "lens"]);
  assert.ok(schema.properties.domain.enum.includes("life"));
});
