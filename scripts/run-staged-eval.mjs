import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { randomInt } from "node:crypto";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildWithSkillInstructions,
  defaultRoot,
  findRegistryEntry,
  loadEvalCases,
  readSkillBundle
} from "./build-eval-prompts.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function resolveFromRoot(root, path) {
  return isAbsolute(path) ? path : join(root, path);
}

function loadMemberProfile(root, evalCase) {
  if (!evalCase.member_profile_ref) {
    return "No local profile or historical data. Treat this as first use.";
  }
  return readFileSync(join(root, evalCase.member_profile_ref), "utf8");
}

function requireNonEmpty(path, label) {
  if (!existsSync(path)) throw new Error(`${label} file does not exist: ${path}`);
  const value = readFileSync(path, "utf8").trim();
  if (!value) throw new Error(`${label} file is empty: ${path}`);
  return value;
}

function blindMapping() {
  return randomInt(2) === 0
    ? { A: "baseline", B: "with_skill" }
    : { A: "with_skill", B: "baseline" };
}

function validateScores(scores, label) {
  for (const key of ["trigger", "fit", "safety", "actionability"]) {
    if (![0, 1].includes(scores?.[key])) {
      throw new Error(`${label}.${key} must be 0 or 1`);
    }
  }
}

export function prepareEvalRun(root, caseId, runDir) {
  const evalCase = loadEvalCases(root).find((item) => item.id === caseId);
  if (!evalCase) throw new Error(`Unknown eval case: ${caseId}`);

  const registry = readJson(join(root, "registry.json"));
  const expectedEntry = findRegistryEntry(root, evalCase.expected_skill);
  if (!expectedEntry) throw new Error(`Unknown expected skill: ${evalCase.expected_skill}`);

  mkdirSync(runDir, { recursive: true });
  const memberProfile = loadMemberProfile(root, evalCase);
  const skillBundle = readSkillBundle(root, expectedEntry);
  const withSkillInstructions = buildWithSkillInstructions(expectedEntry);
  const registrySection = expectedEntry.skill_type === "entry"
    ? `## Registry

\`\`\`json
${JSON.stringify(registry, null, 2)}
\`\`\``
    : `## Expected Lens Metadata

\`\`\`json
${JSON.stringify(expectedEntry, null, 2)}
\`\`\``;

  const baselinePrompt = `# Baseline Response Task

Answer the user situation as a general assistant.

Do not assume access to local data or history that is not shown below. Do not mention this evaluation.

## User Situation

${evalCase.situation}

## Available Profile

${memberProfile}
`;

  const withSkillPrompt = `# Guided Response Task

Answer the user situation using the supplied lifestyle skill materials.

${withSkillInstructions}

## User Situation

${evalCase.situation}

## Available Profile

${memberProfile}

## Expected Entry Or Lens

${evalCase.expected_skill}

${registrySection}

## Skill Bundle

\`\`\`markdown
${skillBundle}
\`\`\`
`;

  writeFileSync(join(runDir, "baseline-prompt.md"), baselinePrompt);
  writeFileSync(join(runDir, "with-skill-prompt.md"), withSkillPrompt);
  writeFileSync(join(runDir, "baseline-response.md"), "");
  writeFileSync(join(runDir, "with-skill-response.md"), "");
  writeJson(join(runDir, "manifest.json"), {
    case_id: evalCase.id,
    source_file: evalCase.source_file,
    expected_skill: evalCase.expected_skill,
    situation: evalCase.situation,
    rubric: evalCase.rubric,
    stage: "prepared"
  });

  return { runDir, caseId: evalCase.id };
}

export function buildJudgeStage(runDir) {
  const manifestPath = join(runDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const baseline = requireNonEmpty(join(runDir, "baseline-response.md"), "baseline response");
  const withSkill = requireNonEmpty(join(runDir, "with-skill-response.md"), "with-skill response");
  const mapping = blindMapping();
  const responses = { baseline, with_skill: withSkill };
  const rubric = manifest.rubric.map((item) => `- ${item}`).join("\n");

  const prompt = `# Blind Lifestyle Response Judge

Evaluate two anonymous responses to the same user situation. Do not infer or reward which process produced either response.

## User Situation

${manifest.situation}

## Response A

${responses[mapping.A]}

## Response B

${responses[mapping.B]}

## Rubric

${rubric}

Score each response independently. Every score must be 0 or 1.

## Required JSON Output

\`\`\`json
{
  "winner": "A | B | tie",
  "scores": {
    "A": {
      "trigger": 0,
      "fit": 0,
      "safety": 0,
      "actionability": 0
    },
    "B": {
      "trigger": 0,
      "fit": 0,
      "safety": 0,
      "actionability": 0
    }
  },
  "notes": "",
  "judge": {
    "provider": "",
    "model": ""
  }
}
\`\`\`
`;

  writeFileSync(join(runDir, "judge-prompt.md"), prompt);
  writeJson(join(runDir, "judge-map.json"), mapping);
  writeFileSync(join(runDir, "judge-result.json"), "");
  writeJson(manifestPath, { ...manifest, stage: "judge_ready" });

  return { prompt, mapping };
}

export function finalizeEvalRun(runDir, outputPath) {
  const manifestPath = join(runDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const mapping = readJson(join(runDir, "judge-map.json"));
  const judgeResult = readJson(join(runDir, "judge-result.json"));

  if (!["A", "B", "tie"].includes(judgeResult.winner)) {
    throw new Error("judge winner must be A, B, or tie");
  }
  validateScores(judgeResult.scores?.A, "scores.A");
  validateScores(judgeResult.scores?.B, "scores.B");

  const withSkillLabel = mapping.A === "with_skill" ? "A" : "B";
  const canonicalWinner = judgeResult.winner === "tie"
    ? "tie"
    : mapping[judgeResult.winner];

  const result = {
    case_id: manifest.case_id,
    expected_skill: manifest.expected_skill,
    winner: canonicalWinner,
    scores: judgeResult.scores[withSkillLabel],
    notes: judgeResult.notes || "",
    judge: judgeResult.judge || {}
  };

  writeJson(join(runDir, "result.json"), result);
  writeJson(manifestPath, { ...manifest, stage: "finalized" });
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    appendFileSync(outputPath, `${JSON.stringify(result)}\n`);
  }
  return result;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--case") args.case = rest[++index];
    if (arg === "--run") args.run = rest[++index];
    if (arg === "--out") args.out = rest[++index];
  }
  return args;
}

function usage() {
  console.error(`Usage:
  node scripts/run-staged-eval.mjs prepare --case <case-id> --run <run-dir>
  node scripts/run-staged-eval.mjs judge --run <run-dir>
  node scripts/run-staged-eval.mjs finalize --run <run-dir> [--out eval-results/manual.jsonl]`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !args.run) {
    usage();
    process.exit(1);
  }

  const runDir = resolveFromRoot(defaultRoot, args.run);

  if (args.command === "prepare" && args.case) {
    prepareEvalRun(defaultRoot, args.case, runDir);
    console.log(`Prepared ${args.case} in ${args.run}`);
    return;
  }

  if (args.command === "judge") {
    buildJudgeStage(runDir);
    console.log(`Wrote blind judge prompt in ${args.run}`);
    return;
  }

  if (args.command === "finalize") {
    const outputPath = args.out ? resolveFromRoot(defaultRoot, args.out) : undefined;
    const result = finalizeEvalRun(runDir, outputPath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
