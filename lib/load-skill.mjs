import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const libDir = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = join(libDir, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return {};

  const meta = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s+-\s/.test(line)) {
      if (currentKey && Array.isArray(meta[currentKey])) {
        meta[currentKey].push(line.replace(/^\s+-\s/, "").trim());
      }
      continue;
    }
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (value === "") {
      meta[key] = [];
      currentKey = key;
    } else {
      meta[key] = value;
      currentKey = null;
    }
  }
  return meta;
}

export function loadRegistry(root = defaultRoot) {
  const registryPath = join(root, "registry.json");
  if (!existsSync(registryPath)) return null;
  return readJson(registryPath);
}

export function findRegistryEntry(root, id) {
  const registry = loadRegistry(root);
  if (!registry) return null;
  return registry.skills.find((skill) => skill.id === id) || null;
}

export function loadSkillMetadata(root = defaultRoot) {
  const registry = loadRegistry(root);
  if (!registry) return [];

  return registry.skills.map((entry) => {
    const skillPath = join(root, entry.path);
    const frontmatter = existsSync(skillPath)
      ? parseFrontmatter(readFileSync(skillPath, "utf8"))
      : {};

    return {
      id: entry.id,
      name: entry.name || frontmatter.name,
      skill_type: entry.skill_type,
      domain: entry.domain,
      description: frontmatter.description || entry.description,
      best_for: entry.best_for || [],
      avoid_if: entry.avoid_if || [],
      triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
      blockers: Array.isArray(frontmatter.blockers) ? frontmatter.blockers : [],
      safety: Array.isArray(frontmatter.safety) ? frontmatter.safety : [],
      risk_level: entry.risk_level || "medium",
      path: entry.path
    };
  });
}

export function loadSkillBundle(root, entry) {
  if (!entry) return "";
  const skillPath = join(root, entry.path);
  if (!existsSync(skillPath)) return "";

  const main = readFileSync(skillPath, "utf8");
  if (entry.id !== "life-butler") return main;

  const refs = [
    "skills/life-butler/references/no-data-mode.md",
    "skills/life-butler/references/lens-catalog.md",
    "skills/life-butler/references/selection-rules.md",
    "skills/life-butler/references/scoring-model.md"
  ];

  const referenceText = refs
    .filter((path) => existsSync(join(root, path)))
    .map((path) => `\n\n## ${path}\n\n${readFileSync(join(root, path), "utf8")}`)
    .join("");

  return `${main}${referenceText}`;
}

export function loadSkill(root, skillId) {
  const entry = findRegistryEntry(root, skillId);
  if (!entry) return null;

  return {
    metadata: {
      id: entry.id,
      name: entry.name,
      skill_type: entry.skill_type,
      domain: entry.domain,
      description: entry.description,
      best_for: entry.best_for,
      avoid_if: entry.avoid_if,
      required_context: entry.required_context,
      style: entry.style,
      risk_level: entry.risk_level,
      path: entry.path
    },
    content: loadSkillBundle(root, entry)
  };
}
