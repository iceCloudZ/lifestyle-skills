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

test("entry eval prompt tests lens selection before application", async () => {
  const { buildEvalPrompt, loadEvalCases } = await import(moduleUrl);
  const cases = loadEvalCases(root);
  const evalCase = cases.find((item) => item.id === "life-butler-first-movement-001");
  const prompt = buildEvalPrompt(root, evalCase);

  assert.match(prompt, /Skill Type: entry/);
  assert.match(prompt, /recommend 2-3/i);
  assert.match(prompt, /let the user choose/i);
});

test("lens eval prompt treats the expected lens as already selected", async () => {
  const { buildEvalPrompt, loadEvalCases } = await import(moduleUrl);
  const cases = loadEvalCases(root);
  const evalCase = cases.find((item) => item.id === "finance-bogleheads-style-003");
  const prompt = buildEvalPrompt(root, evalCase);

  assert.match(prompt, /Skill Type: lens/);
  assert.match(prompt, /expected lens has already been selected/i);
  assert.match(prompt, /apply the lens directly/i);
  assert.match(prompt, /Reasoning Flow/);
  assert.doesNotMatch(prompt, /recommend 2-3 options/i);
  assert.doesNotMatch(prompt, /let the user choose/i);
});

test("README documents manual LLM eval usage", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");

  assert.match(readme, /Manual LLM Evals/);
  assert.match(readme, /build-eval-prompts\.mjs/);
  assert.match(readme, /not part of default CI/i);
  assert.match(readme, /Entry evals/);
  assert.match(readme, /Lens evals/);
  assert.match(readme, /already selected/i);
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
