import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const moduleUrl = new URL("../scripts/run-api-evals.mjs", import.meta.url);

test("OpenAI-compatible request uses normalized endpoint and bearer token", async () => {
  const { callChatCompletion } = await import(moduleUrl);
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      id: "chatcmpl-test",
      model: "test-model",
      choices: [{ message: { content: "hello" } }],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await callChatCompletion({
    baseUrl: "https://example.com/v1/",
    apiKey: "secret",
    model: "test-model",
    prompt: "Say hello",
    fetchImpl,
    retries: 0
  });

  assert.equal(requests[0].url, "https://example.com/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer secret");
  assert.equal(JSON.parse(requests[0].options.body).model, "test-model");
  assert.equal(result.content, "hello");
  assert.equal(result.usage.total_tokens, 12);
});

test("judge JSON parser accepts plain JSON and fenced JSON", async () => {
  const { parseJudgeJson } = await import(moduleUrl);
  const value = {
    winner: "A",
    scores: {
      A: { trigger: 1, fit: 1, safety: 1, actionability: 1 },
      B: { trigger: 0, fit: 0, safety: 1, actionability: 1 }
    },
    notes: "A is better.",
    judge: { provider: "test", model: "judge-model" }
  };

  assert.deepEqual(parseJudgeJson(JSON.stringify(value)), value);
  assert.deepEqual(parseJudgeJson(`\`\`\`json\n${JSON.stringify(value)}\n\`\`\``), value);
  assert.deepEqual(parseJudgeJson(`Here is the result:\n${JSON.stringify(value)}\nDone.`), value);
});

test("concurrency pool never exceeds configured limit", async () => {
  const { mapWithConcurrency } = await import(moduleUrl);
  let active = 0;
  let peak = 0;

  const results = await mapWithConcurrency(
    Array.from({ length: 12 }, (_, index) => index),
    3,
    async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    }
  );

  assert.equal(peak, 3);
  assert.deepEqual(results, Array.from({ length: 12 }, (_, index) => index * 2));
});

test("API eval run archives responses and returns scoreboard-compatible results", async () => {
  const { runApiEvals } = await import(moduleUrl);
  const runRoot = mkdtempSync(join(tmpdir(), "lifestyle-api-eval-"));
  let callIndex = 0;
  const requestBodies = [];
  const fetchImpl = async (_url, options) => {
    callIndex += 1;
    const body = JSON.parse(options.body);
    requestBodies.push(body);
    const prompt = body.messages[0].content;
    let content;

    if (prompt.includes("Blind Lifestyle Response Judge")) {
      content = JSON.stringify({
        winner: "A",
        scores: {
          A: { trigger: 1, fit: 1, safety: 1, actionability: 1 },
          B: { trigger: 0, fit: 0, safety: 1, actionability: 1 }
        },
        notes: "Blind judge result.",
        judge: { provider: "test", model: body.model }
      });
    } else {
      content = `Response ${callIndex}`;
    }

    return new Response(JSON.stringify({
      id: `chatcmpl-${callIndex}`,
      model: body.model,
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const summary = await runApiEvals({
    root,
    caseIds: ["life-butler-first-movement-001"],
    runRoot,
    outputPath: join(runRoot, "results.jsonl"),
    concurrency: 2,
    generation: {
      baseUrl: "https://example.com",
      apiKey: "secret",
      model: "generation-model"
    },
    judge: {
      baseUrl: "https://example.com",
      apiKey: "secret",
      model: "judge-model"
    },
    fetchImpl
  });

  assert.equal(summary.completed, 1);
  assert.equal(summary.failed, 0);
  const resultLine = readFileSync(join(runRoot, "results.jsonl"), "utf8").trim();
  const result = JSON.parse(resultLine);
  assert.equal(result.case_id, "life-butler-first-movement-001");
  assert.ok(["baseline", "with_skill"].includes(result.winner));
  assert.equal(result.generation.model, "generation-model");
  assert.equal(result.judge.model, "judge-model");
  assert.equal(requestBodies.find((body) => body.messages[0].content.includes("Blind Lifestyle Response Judge")).max_tokens, 4000);
  assert.match(readFileSync(join(runRoot, "life-butler-first-movement-001", "baseline-response.md"), "utf8"), /Response/);
  assert.match(readFileSync(join(runRoot, "life-butler-first-movement-001", "judge-response.md"), "utf8"), /winner/);
  assert.match(readFileSync(join(runRoot, "life-butler-first-movement-001", "judge-result.json"), "utf8"), /winner/);
});

test("README documents API runner and concurrency", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");

  assert.match(readme, /API Eval Runner/);
  assert.match(readme, /run-api-evals\.mjs/);
  assert.match(readme, /--concurrency 20/);
});
