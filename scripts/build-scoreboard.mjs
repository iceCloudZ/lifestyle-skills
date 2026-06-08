import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function walkJsonlFiles(dir) {
  if (!existsSync(dir)) return [];

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

function readResults(paths) {
  const results = [];
  for (const path of paths) {
    const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) results.push(JSON.parse(line));
  }
  return results;
}

function pct(value, total) {
  if (total === 0) return "n/a";
  return `${Math.round((value / total) * 100)}%`;
}

export function buildScoreboard(root = defaultRoot, resultPaths = walkJsonlFiles(join(root, "eval-results"))) {
  const results = readResults(resultPaths);
  const groups = new Map();

  for (const result of results) {
    const skill = result.expected_skill || "unknown";
    if (!groups.has(skill)) {
      groups.set(skill, {
        count: 0,
        trigger: 0,
        fit: 0,
        safety: 0,
        actionability: 0,
        withSkillWins: 0,
        notes: []
      });
    }

    const group = groups.get(skill);
    group.count += 1;
    group.trigger += Number(Boolean(result.scores?.trigger));
    group.fit += Number(Boolean(result.scores?.fit));
    group.safety += Number(Boolean(result.scores?.safety));
    group.actionability += Number(Boolean(result.scores?.actionability));
    group.withSkillWins += result.winner === "with_skill" ? 1 : 0;
    if (result.notes) group.notes.push(result.notes);
  }

  const lines = [
    "# Lifestyle Skills Scoreboard",
    "",
    "This scoreboard summarizes manual or scheduled LLM eval results. It is evidence for iteration, not proof of professional correctness.",
    "",
    `Generated from ${results.length} eval result${results.length === 1 ? "" : "s"}.`,
    "",
    "| Skill | Cases | Trigger | Fit | Safety | Actionability | With-Skill Wins |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const [skill, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(
      `| ${skill} | ${group.count} | ${pct(group.trigger, group.count)} | ${pct(group.fit, group.count)} | ${pct(group.safety, group.count)} | ${pct(group.actionability, group.count)} | ${pct(group.withSkillWins, group.count)} |`
    );
  }

  if (results.length === 0) {
    lines.push("| No results yet | 0 | n/a | n/a | n/a | n/a | n/a |");
  }

  lines.push(
    "",
    "## Notes",
    "",
    "- Use synthetic cases unless the user explicitly chooses a private/local eval flow.",
    "- Do not run third-party chatbot evals on private household data.",
    "- Treat free chatbot judges as preliminary signal only."
  );

  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--results") args.results = argv[++index];
    if (arg === "--out") args.out = argv[++index];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultDir = args.results ? join(defaultRoot, args.results) : join(defaultRoot, "eval-results");
  const resultPaths = walkJsonlFiles(resultDir);
  const markdown = buildScoreboard(defaultRoot, resultPaths);

  if (args.out) {
    const outputPath = join(defaultRoot, args.out);
    mkdirSync(join(outputPath, ".."), { recursive: true });
    writeFileSync(outputPath, markdown);
    console.log(`Wrote ${args.out}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
