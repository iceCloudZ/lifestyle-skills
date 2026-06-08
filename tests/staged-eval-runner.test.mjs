import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const moduleUrl = new URL("../scripts/run-staged-eval.mjs", import.meta.url);

test("prepare creates isolated baseline and with-skill prompts", async () => {
  const { prepareEvalRun } = await import(moduleUrl);
  const runDir = mkdtempSync(join(tmpdir(), "lifestyle-eval-run-"));

  prepareEvalRun(root, "life-butler-first-movement-001", runDir);

  const baseline = readFileSync(join(runDir, "baseline-prompt.md"), "utf8");
  const withSkill = readFileSync(join(runDir, "with-skill-prompt.md"), "utf8");
  const manifest = JSON.parse(readFileSync(join(runDir, "manifest.json"), "utf8"));

  assert.match(baseline, /我想开始运动，但总坚持不下来/);
  assert.doesNotMatch(baseline, /scoring-model|Skill Bundle|tiny-habits-movement/);
  assert.match(withSkill, /life-butler/);
  assert.match(withSkill, /scoring-model/);
  assert.match(withSkill, /tiny-habits-movement/);
  assert.equal(manifest.case_id, "life-butler-first-movement-001");
  assert.equal(manifest.stage, "prepared");
  assert.ok(existsSync(join(runDir, "baseline-response.md")));
  assert.ok(existsSync(join(runDir, "with-skill-response.md")));
});

test("prepare uses direct application instructions for lens evals", async () => {
  const { prepareEvalRun } = await import(moduleUrl);
  const runDir = mkdtempSync(join(tmpdir(), "lifestyle-eval-lens-"));

  prepareEvalRun(root, "finance-bogleheads-style-003", runDir);

  const withSkill = readFileSync(join(runDir, "with-skill-prompt.md"), "utf8");

  assert.match(withSkill, /Skill Type: lens/);
  assert.match(withSkill, /expected lens has already been selected/i);
  assert.match(withSkill, /apply the lens directly/i);
  assert.doesNotMatch(withSkill, /recommend 2-3 options/i);
  assert.doesNotMatch(withSkill, /let the user choose/i);
});

test("prepare keeps lens selection instructions for entry evals", async () => {
  const { prepareEvalRun } = await import(moduleUrl);
  const runDir = mkdtempSync(join(tmpdir(), "lifestyle-eval-entry-"));

  prepareEvalRun(root, "life-butler-first-movement-001", runDir);

  const withSkill = readFileSync(join(runDir, "with-skill-prompt.md"), "utf8");

  assert.match(withSkill, /Skill Type: entry/);
  assert.match(withSkill, /recommend 2-3/i);
  assert.match(withSkill, /let the user choose/i);
});

test("judge prompt blinds response origin and preserves rubric", async () => {
  const { buildJudgeStage, prepareEvalRun } = await import(moduleUrl);
  const runDir = mkdtempSync(join(tmpdir(), "lifestyle-eval-judge-"));

  prepareEvalRun(root, "life-butler-first-movement-001", runDir);
  writeFileSync(join(runDir, "baseline-response.md"), "Response text one.");
  writeFileSync(join(runDir, "with-skill-response.md"), "Response text two.");

  const { prompt, mapping } = buildJudgeStage(runDir);

  assert.match(prompt, /## Response A/);
  assert.match(prompt, /## Response B/);
  assert.match(prompt, /does not mention 7-day review without data/i);
  assert.doesNotMatch(prompt, /with_skill|baseline-response|with-skill-response/i);
  assert.deepEqual(new Set(Object.values(mapping)), new Set(["baseline", "with_skill"]));
  assert.ok(existsSync(join(runDir, "judge-prompt.md")));
  assert.ok(existsSync(join(runDir, "judge-map.json")));
});

test("finalize maps blind judge result to canonical scoreboard result", async () => {
  const { buildJudgeStage, finalizeEvalRun, prepareEvalRun } = await import(moduleUrl);
  const runDir = mkdtempSync(join(tmpdir(), "lifestyle-eval-finalize-"));

  prepareEvalRun(root, "life-butler-first-movement-001", runDir);
  writeFileSync(join(runDir, "baseline-response.md"), "Baseline answer.");
  writeFileSync(join(runDir, "with-skill-response.md"), "Guided lens answer.");
  const { mapping } = buildJudgeStage(runDir);
  const withSkillLabel = Object.entries(mapping).find(([, value]) => value === "with_skill")[0];
  const baselineLabel = withSkillLabel === "A" ? "B" : "A";

  writeFileSync(
    join(runDir, "judge-result.json"),
    `\uFEFF${JSON.stringify({
      winner: withSkillLabel,
      scores: {
        [withSkillLabel]: { trigger: 1, fit: 1, safety: 1, actionability: 1 },
        [baselineLabel]: { trigger: 0, fit: 0, safety: 1, actionability: 1 }
      },
      notes: "The guided response selected a lens before advising.",
      judge: { provider: "manual", model: "example-chatbot" }
    })}`
  );

  const outputPath = join(runDir, "nested", "manual.jsonl");
  const result = finalizeEvalRun(runDir, outputPath);

  assert.equal(result.case_id, "life-butler-first-movement-001");
  assert.equal(result.expected_skill, "life-butler");
  assert.equal(result.winner, "with_skill");
  assert.deepEqual(result.scores, { trigger: 1, fit: 1, safety: 1, actionability: 1 });
  assert.equal(result.judge.model, "example-chatbot");
  assert.ok(existsSync(outputPath));
  assert.match(readFileSync(outputPath, "utf8"), /life-butler-first-movement-001/);
});

test("README documents prepare, judge, and finalize stages", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");

  assert.match(readme, /Three-Stage Eval Runner/);
  assert.match(readme, /run-staged-eval\.mjs prepare/);
  assert.match(readme, /run-staged-eval\.mjs judge/);
  assert.match(readme, /run-staged-eval\.mjs finalize/);
});
