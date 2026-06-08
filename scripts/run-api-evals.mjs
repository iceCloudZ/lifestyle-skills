import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildScoreboard } from "./build-scoreboard.mjs";
import { defaultRoot, loadEvalCases } from "./build-eval-prompts.mjs";
import {
  buildJudgeStage,
  finalizeEvalRun,
  prepareEvalRun
} from "./run-staged-eval.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEndpoint(baseUrl) {
  const value = baseUrl.replace(/\/+$/, "");
  if (value.endsWith("/chat/completions")) return value;
  return `${value}/chat/completions`;
}

function responseContent(message) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => typeof part === "string" ? part : part?.text || "")
      .join("");
  }
  return "";
}

export async function callChatCompletion({
  baseUrl,
  apiKey,
  model,
  prompt,
  temperature = 0.2,
  maxTokens = 1400,
  fetchImpl = fetch,
  retries = 3
}) {
  const endpoint = normalizeEndpoint(baseUrl);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        throw new Error(`API returned non-JSON response (${response.status}): ${text.slice(0, 300)}`);
      }

      if (!response.ok) {
        const message = payload?.error?.message || payload?.message || text.slice(0, 300);
        const error = new Error(`API request failed (${response.status}): ${message}`);
        error.status = response.status;
        throw error;
      }

      const content = responseContent(payload?.choices?.[0]?.message);
      if (!content.trim()) throw new Error("API response did not contain assistant content");

      return {
        content,
        id: payload.id || null,
        model: payload.model || model,
        usage: payload.usage || {},
        finish_reason: payload?.choices?.[0]?.finish_reason || null,
        raw: payload
      };
    } catch (error) {
      lastError = error;
      const retryable = !error.status || error.status === 408 || error.status === 409 ||
        error.status === 429 || error.status >= 500;
      if (!retryable || attempt === retries) break;
      await sleep(Math.min(1000 * (2 ** attempt), 8000));
    }
  }

  throw lastError;
}

export function parseJudgeJson(content) {
  const trimmed = content.trim().replace(/^\uFEFF/, "");
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced ? fenced[1].trim() : trimmed;
  if (!fenced && !candidate.startsWith("{")) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidate = candidate.slice(firstBrace, lastBrace + 1);
    }
  }
  return JSON.parse(candidate);
}

export async function mapWithConcurrency(items, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("concurrency must be a positive integer");
  const results = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function apiArchive(result) {
  return {
    id: result.id,
    model: result.model,
    usage: result.usage,
    finish_reason: result.finish_reason,
    raw: result.raw
  };
}

function providerName(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return baseUrl;
  }
}

export async function runApiEvals({
  root = defaultRoot,
  caseIds,
  runRoot,
  outputPath,
  scoreboardPath,
  concurrency = 5,
  generation,
  judge = generation,
  fetchImpl = fetch
}) {
  const allCases = loadEvalCases(root);
  const selected = caseIds.map((id) => {
    const evalCase = allCases.find((item) => item.id === id);
    if (!evalCase) throw new Error(`Unknown eval case: ${id}`);
    return evalCase;
  });

  mkdirSync(runRoot, { recursive: true });
  mkdirSync(dirname(outputPath), { recursive: true });

  const states = selected.map((evalCase) => {
    const runDir = join(runRoot, evalCase.id);
    prepareEvalRun(root, evalCase.id, runDir);
    return { evalCase, runDir, errors: [] };
  });

  const generationTasks = states.flatMap((state) => [
    { state, kind: "baseline", promptFile: "baseline-prompt.md", responseFile: "baseline-response.md" },
    { state, kind: "with-skill", promptFile: "with-skill-prompt.md", responseFile: "with-skill-response.md" }
  ]);

  await mapWithConcurrency(generationTasks, concurrency, async (task) => {
    try {
      const prompt = readFileSync(join(task.state.runDir, task.promptFile), "utf8");
      const response = await callChatCompletion({
        ...generation,
        prompt,
        fetchImpl
      });
      writeFileSync(join(task.state.runDir, task.responseFile), response.content);
      writeJson(join(task.state.runDir, `${task.kind}-api.json`), apiArchive(response));
      task.state[`${task.kind}Api`] = response;
    } catch (error) {
      task.state.errors.push(`${task.kind}: ${error.message}`);
      writeFileSync(join(task.state.runDir, `${task.kind}-error.txt`), `${error.stack || error.message}\n`);
    }
  });

  await mapWithConcurrency(states, concurrency, async (state) => {
    if (state.errors.length > 0) return;
    try {
      buildJudgeStage(state.runDir);
      const prompt = readFileSync(join(state.runDir, "judge-prompt.md"), "utf8");
      const response = await callChatCompletion({
        ...judge,
        prompt,
        temperature: 0,
        maxTokens: judge.maxTokens || 4000,
        fetchImpl
      });
      writeFileSync(join(state.runDir, "judge-response.md"), response.content);
      writeJson(join(state.runDir, "judge-api.json"), apiArchive(response));
      const judgeResult = parseJudgeJson(response.content);
      judgeResult.judge = {
        provider: providerName(judge.baseUrl),
        model: response.model || judge.model
      };
      writeJson(join(state.runDir, "judge-result.json"), judgeResult);
      state.judgeApi = response;
    } catch (error) {
      state.errors.push(`judge: ${error.message}`);
      writeFileSync(join(state.runDir, "judge-error.txt"), `${error.stack || error.message}\n`);
    }
  });

  const results = [];
  for (const state of states) {
    if (state.errors.length > 0) {
      writeJson(join(state.runDir, "failure.json"), {
        case_id: state.evalCase.id,
        errors: state.errors
      });
      continue;
    }

    const result = finalizeEvalRun(state.runDir);
    result.generation = {
      provider: providerName(generation.baseUrl),
      model: state["baselineApi"]?.model || generation.model,
      baseline_usage: state["baselineApi"]?.usage || {},
      with_skill_usage: state["with-skillApi"]?.usage || {}
    };
    result.judge = {
      ...result.judge,
      usage: state.judgeApi?.usage || {}
    };
    writeJson(join(state.runDir, "result.json"), result);
    results.push(result);
  }

  writeFileSync(outputPath, results.map((item) => JSON.stringify(item)).join("\n") + (results.length ? "\n" : ""));
  if (scoreboardPath) {
    mkdirSync(dirname(scoreboardPath), { recursive: true });
    writeFileSync(scoreboardPath, buildScoreboard(root, [outputPath]));
  }

  return {
    requested: states.length,
    completed: results.length,
    failed: states.length - results.length,
    outputPath,
    scoreboardPath
  };
}

function parseArgs(argv) {
  const args = { concurrency: 5 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--case") {
      args.cases ||= [];
      args.cases.push(argv[++index]);
    }
    if (arg === "--prefix") args.prefix = argv[++index];
    if (arg === "--concurrency") args.concurrency = Number(argv[++index]);
    if (arg === "--run") args.run = argv[++index];
    if (arg === "--out") args.out = argv[++index];
    if (arg === "--scoreboard") args.scoreboard = argv[++index];
  }
  return args;
}

function requiredEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optionalNumberEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) throw new Error(`${name} must be a positive number`);
  return number;
}

function resolveFromRoot(path) {
  return isAbsolute(path) ? path : join(defaultRoot, path);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allCases = loadEvalCases(defaultRoot);
  const caseIds = args.cases?.length
    ? args.cases
    : allCases.filter((item) => !args.prefix || item.id.startsWith(args.prefix)).map((item) => item.id);

  if (caseIds.length === 0) throw new Error("No eval cases selected");
  if (!args.run || !args.out) {
    throw new Error("--run and --out are required");
  }

  const generation = {
    baseUrl: requiredEnv("EVAL_BASE_URL"),
    apiKey: requiredEnv("EVAL_API_KEY"),
    model: requiredEnv("EVAL_MODEL"),
    maxTokens: optionalNumberEnv("EVAL_MAX_TOKENS")
  };
  const judge = {
    baseUrl: requiredEnv("JUDGE_BASE_URL", generation.baseUrl),
    apiKey: requiredEnv("JUDGE_API_KEY", generation.apiKey),
    model: requiredEnv("JUDGE_MODEL", generation.model),
    maxTokens: optionalNumberEnv("JUDGE_MAX_TOKENS", 4000)
  };

  const summary = await runApiEvals({
    root: defaultRoot,
    caseIds,
    runRoot: resolveFromRoot(args.run),
    outputPath: resolveFromRoot(args.out),
    scoreboardPath: args.scoreboard ? resolveFromRoot(args.scoreboard) : undefined,
    concurrency: args.concurrency,
    generation,
    judge
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
