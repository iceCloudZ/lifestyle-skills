import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSkillBundle as readSkillBundle,
  findRegistryEntry,
  defaultRoot as libRoot
} from "../lib/load-skill.mjs";

export const defaultRoot = libRoot;

function walkJsonlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonlFiles(path));
    } else if (entry.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
  return files.sort();
}

export function loadEvalCases(root = defaultRoot) {
  const cases = [];
  for (const file of walkJsonlFiles(join(root, "evals"))) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      cases.push({
        ...JSON.parse(line),
        source_file: relative(root, file).replaceAll("\\", "/")
      });
    }
  }
  return cases.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildWithSkillInstructions(entry) {
  if (entry.skill_type === "entry") {
    return `Skill Type: entry

This eval tests entry-skill lens selection. Use the entry skill's first-use and no-data flow when applicable. Recommend 2-3 relevant lenses, explain the recommended lens, and let the user choose before applying a lens.`;
  }

  if (entry.skill_type === "lens") {
    return `Skill Type: lens

This eval tests direct lens application. The expected lens has already been selected by the user. Apply the lens directly using its Reasoning Flow. Do not present alternative lens options or route back to the entry skill. Ask only missing key context that changes the lens path, and hand off if the lens boundaries apply.`;
  }

  throw new Error(`Unknown skill type for ${entry.id}: ${entry.skill_type}`);
}

export function buildEvalPrompt(root = defaultRoot, evalCase) {
  if (!evalCase) {
    throw new Error("buildEvalPrompt requires an eval case");
  }

  const expectedEntry = findRegistryEntry(root, evalCase.expected_skill);
  const skillBundle = readSkillBundle(root, expectedEntry);
  const withSkillInstructions = buildWithSkillInstructions(expectedEntry);
  const rubric = (evalCase.rubric || []).map((item) => `- ${item}`).join("\n");
  const avoidSkills = (evalCase.avoid_skills || []).join(", ") || "none";
  const memberProfile = evalCase.member_profile_ref
    ? readFileSync(join(root, evalCase.member_profile_ref), "utf8")
    : "No local profile or historical data. Treat this as first use.";

  return `# Lifestyle Skill Eval

Case: ${evalCase.id}
Source: ${evalCase.source_file || "unknown"}
Expected skill: ${evalCase.expected_skill}
Avoid applying as primary skill: ${avoidSkills}

## Situation

${evalCase.situation}

## Member Profile

\`\`\`json
${memberProfile}
\`\`\`

## Baseline Run

Answer the situation as a general assistant without using any repository skill, lens catalog, or registry metadata.

## With-Skill Run

Answer the situation using the expected skill and its references.

${withSkillInstructions}

### Skill Bundle

\`\`\`markdown
${skillBundle}
\`\`\`

## Judge Rubric

Compare the Baseline Run and With-Skill Run. Score each item as pass/fail and explain briefly.

${rubric}

## Judge Output Format

\`\`\`json
{
  "case_id": "${evalCase.id}",
  "baseline_passed": [],
  "with_skill_passed": [],
  "with_skill_failed": [],
  "winner": "baseline | with_skill | tie",
  "notes": ""
}
\`\`\`
`;
}

function parseArgs(argv) {
  const args = { all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--list") args.list = true;
    if (arg === "--all") args.all = true;
    if (arg === "--case") args.case = argv[++index];
    if (arg === "--out") args.out = argv[++index];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = loadEvalCases(defaultRoot);

  if (args.list) {
    for (const evalCase of cases) console.log(evalCase.id);
    return;
  }

  if (args.case) {
    const evalCase = cases.find((item) => item.id === args.case);
    if (!evalCase) {
      console.error(`Unknown eval case: ${args.case}`);
      process.exit(1);
    }
    console.log(buildEvalPrompt(defaultRoot, evalCase));
    return;
  }

  if (args.all && args.out) {
    mkdirSync(args.out, { recursive: true });
    for (const evalCase of cases) {
      const fileName = `${evalCase.id}.md`;
      writeFileSync(join(args.out, fileName), buildEvalPrompt(defaultRoot, evalCase));
    }
    console.log(`Wrote ${cases.length} prompt(s) to ${args.out}`);
    return;
  }

  console.error(`Usage:
  node scripts/${basename(process.argv[1])} --list
  node scripts/${basename(process.argv[1])} --case <eval-case-id>
  node scripts/${basename(process.argv[1])} --all --out generated/eval-prompts`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
