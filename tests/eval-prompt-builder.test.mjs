import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const moduleUrl = new URL("../scripts/build-eval-prompts.mjs", import.meta.url);

test("eval prompt builder loads cases by id", async () => {
  const { loadEvalCases } = await import(moduleUrl);
  const cases = loadEvalCases(root);
  const ids = cases.map((item) => item.id);

  assert.ok(ids.includes("life-butler-first-movement-001"));
  assert.ok(ids.includes("finance-zero-based-budgeting-001"));
});

test("eval prompt includes baseline, with-skill, and judge sections", async () => {
  const { buildEvalPrompt, loadEvalCases } = await import(moduleUrl);
  const cases = loadEvalCases(root);
  const evalCase = cases.find((item) => item.id === "life-butler-first-movement-001");
  const prompt = buildEvalPrompt(root, evalCase);

  assert.match(prompt, /# Lifestyle Skill Eval/);
  assert.match(prompt, /## Baseline Run/);
  assert.match(prompt, /## With-Skill Run/);
  assert.match(prompt, /## Judge Rubric/);
  assert.match(prompt, /life-butler/);
  assert.match(prompt, /tiny-habits-movement/);
  assert.match(prompt, /does not mention 7-day review without data/i);
});

test("README documents manual LLM eval usage", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");

  assert.match(readme, /Manual LLM Evals/);
  assert.match(readme, /build-eval-prompts\.mjs/);
  assert.match(readme, /not part of default CI/i);
});

test("eval prompt builder CLI prints a selected prompt", () => {
  const output = execFileSync(
    "node",
    ["scripts/build-eval-prompts.mjs", "--case", "life-butler-first-movement-001"],
    { cwd: root, encoding: "utf8" }
  );

  assert.match(output, /# Lifestyle Skill Eval/);
  assert.match(output, /life-butler-first-movement-001/);
});
