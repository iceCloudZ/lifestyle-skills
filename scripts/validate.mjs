import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const errors = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${relative(root, path)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function parseFrontmatter(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    errors.push(`${relative(root, path)} is missing YAML frontmatter`);
    return {};
  }

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

function validateRegistryEntry(entry, index) {
  const prefix = `registry.skills[${index}]`;
  const required = [
    "id",
    "name",
    "skill_type",
    "domain",
    "path",
    "description",
    "best_for",
    "avoid_if",
    "required_context",
    "style",
    "risk_level"
  ];

  for (const key of required) {
    assert(Object.hasOwn(entry, key), `${prefix} missing ${key}`);
  }

  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || ""), `${prefix}.id must be kebab-case`);
  assert(["entry", "lens"].includes(entry.skill_type), `${prefix}.skill_type is invalid`);
  assert(["life", "finance", "health", "movement", "family"].includes(entry.domain), `${prefix}.domain is invalid`);
  assert(["low", "medium", "high"].includes(entry.risk_level), `${prefix}.risk_level is invalid`);

  for (const key of ["best_for", "avoid_if", "required_context", "style"]) {
    assert(Array.isArray(entry[key]), `${prefix}.${key} must be an array`);
  }

  const contentPath = join(root, entry.path);
  assert(existsSync(contentPath), `${entry.path} does not exist`);

  if (entry.skill_type === "entry") {
    assert(entry.path.startsWith("skills/"), `${prefix}.path for entry skill must be under skills/`);
    if (existsSync(contentPath)) {
      const meta = parseFrontmatter(contentPath);
      assert(meta.name === entry.id, `${entry.path} frontmatter name must equal registry id ${entry.id}`);
      assert(Boolean(meta.description), `${entry.path} frontmatter description is required`);
    }
  }

  if (entry.skill_type === "lens") {
    assert(entry.path.startsWith("lenses/"), `${prefix}.path for lens must be under lenses/`);
    if (existsSync(contentPath)) {
      const meta = parseFrontmatter(contentPath);
      assert(Boolean(meta.description), `${entry.path} frontmatter description is required`);
      assert(Boolean(meta.triggers), `${entry.path} frontmatter triggers is required`);
      assert(Boolean(meta.blockers), `${entry.path} frontmatter blockers is required`);
      assert(Boolean(meta.safety), `${entry.path} frontmatter safety is required`);
    }
  }

  const evalPath = join(root, "evals", entry.domain, `${entry.id}.jsonl`);
  assert(existsSync(evalPath), `evals/${entry.domain}/${entry.id}.jsonl does not exist`);
}

function walkJsonlFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      files.push(...walkJsonlFiles(path));
    } else if (name.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
  return files;
}

function validateEvalFile(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  assert(lines.length > 0, `${relative(root, path)} must contain at least one case`);

  lines.forEach((line, index) => {
    let item;
    try {
      item = JSON.parse(line);
    } catch (error) {
      errors.push(`${relative(root, path)}:${index + 1} is not valid JSON: ${error.message}`);
      return;
    }

    for (const key of ["id", "member_profile_ref", "situation", "expected_skill", "avoid_skills", "rubric"]) {
      assert(Object.hasOwn(item, key), `${relative(root, path)}:${index + 1} missing ${key}`);
    }
    assert(Array.isArray(item.avoid_skills), `${relative(root, path)}:${index + 1} avoid_skills must be an array`);
    assert(Array.isArray(item.rubric), `${relative(root, path)}:${index + 1} rubric must be an array`);
    assert(existsSync(join(root, item.member_profile_ref || "")), `${relative(root, path)}:${index + 1} member_profile_ref does not exist`);
  });
}

const registry = readJson(join(root, "registry.json"));
assert(Boolean(registry), "registry.json is required");
assert(registry?.schema_version === "0.2.0", "registry.schema_version must be 0.2.0");
assert(Array.isArray(registry?.skills), "registry.skills must be an array");

const ids = new Set();
for (const [index, entry] of (registry?.skills || []).entries()) {
  validateRegistryEntry(entry, index);
  assert(!ids.has(entry.id), `duplicate skill id ${entry.id}`);
  ids.add(entry.id);
}

for (const file of walkJsonlFiles(join(root, "evals"))) {
  validateEvalFile(file);
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validation passed: ${ids.size} skills`);
