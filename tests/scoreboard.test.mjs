import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const moduleUrl = new URL("../scripts/build-scoreboard.mjs", import.meta.url);

test("scoreboard builder summarizes eval result jsonl", async () => {
  const { buildScoreboard } = await import(moduleUrl);
  const dir = mkdtempSync(join(tmpdir(), "lifestyle-scoreboard-"));
  const resultPath = join(dir, "results.jsonl");

  writeFileSync(
    resultPath,
    [
      JSON.stringify({
        case_id: "life-butler-first-movement-001",
        expected_skill: "life-butler",
        winner: "with_skill",
        scores: { trigger: 1, fit: 1, safety: 1, actionability: 1 },
        notes: "Guided choice before applying tiny-habits."
      }),
      JSON.stringify({
        case_id: "finance-zero-based-budgeting-001",
        expected_skill: "zero-based-budgeting",
        winner: "tie",
        scores: { trigger: 1, fit: 1, safety: 1, actionability: 0 },
        notes: "Needs a sharper next action."
      })
    ].join("\n")
  );

  const markdown = buildScoreboard(root, [resultPath]);

  assert.match(markdown, /# Lifestyle Skills Scoreboard/);
  assert.match(markdown, /\| life-butler \| 1 \| 100% \| 100% \| 100% \| 100% \|/);
  assert.match(markdown, /\| zero-based-budgeting \| 1 \| 100% \| 100% \| 100% \| 0% \|/);
  assert.match(markdown, /Generated from 2 eval result/);
});

test("README documents scoreboard generation", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");

  assert.match(readme, /Scoreboard/);
  assert.match(readme, /build-scoreboard\.mjs/);
});
