import * as fs from "fs";
import * as path from "path";
import { isWithinRoot, resolveSkillsRoot } from "./paths";

export type Skill = {
  name: string;
  dir: string;
  summary?: string;
};

const SKILL_FILES = ["SKILL.md"];
const MAX_CONTENT_CHARS = 100_000;
const MAX_SKILL_FILES = 100;

function listSkillFiles(skillDir: string, maxFiles = MAX_SKILL_FILES): string[] {
  const files: string[] = [];
  if (!fs.existsSync(skillDir) || !fs.statSync(skillDir).isDirectory()) return files;

  function walk(dir: string, relBase: string) {
    if (files.length >= maxFiles) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const relPath = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else if (entry.isFile() && entry.name !== "SKILL.md") {
        files.push(relPath);
      }
    }
  }
  walk(skillDir, "");
  return files;
}

export type SkillMetadata = Record<string, string>;

function parseFrontmatter(raw: string): { frontmatter: SkillMetadata; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const [, fm, body] = match;
  const frontmatter: SkillMetadata = {};
  for (const line of fm.split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      const key = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      if (key && value) frontmatter[key] = value;
    }
  }
  return { frontmatter, body: body.trim() };
}

function extractSummary(content: string): string | undefined {
  const match = content.match(/^description:\s*(.+)$/m);
  if (match) return match[1].trim();
  const firstH1 = content.match(/^#\s+(.+)$/m);
  if (firstH1) return firstH1[1].trim();
  const firstLine = content.split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim().slice(0, 120);
}

export function getSkillsRoot(prefsPath: string): string {
  return resolveSkillsRoot(prefsPath);
}

export function listSkills(rootPath: string): Skill[] {
  const root = getSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return [];
  }
  const skills: Skill[] = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(root, entry.name);
    for (const fileName of SKILL_FILES) {
      const filePath = path.join(dirPath, fileName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        let summary: string | undefined;
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          summary = extractSummary(content);
        } catch {
          // ignore
        }
        skills.push({
          name: entry.name,
          dir: dirPath,
          summary,
        });
        break;
      }
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function searchSkills(rootPath: string, query: string, limit = 20): Skill[] {
  const all = listSkills(rootPath);
  if (!query.trim()) return all.slice(0, limit);
  const q = query.toLowerCase().trim();
  const scored: { skill: Skill; score: number }[] = [];
  for (const skill of all) {
    let score = 0;
    if (skill.name.toLowerCase() === q) score = 100;
    else if (skill.name.toLowerCase().includes(q)) score = 80;
    if (skill.summary?.toLowerCase().includes(q)) score = Math.max(score, 50);
    if (score > 0) scored.push({ skill, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.skill);
}

export function readSkill(
  rootPath: string,
  name: string,
  maxChars = MAX_CONTENT_CHARS,
): { content: string; metadata: SkillMetadata; skill: Skill; files: string[] } {
  const root = getSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Skills directory not found: ${rootPath}`);
  }
  const all = listSkills(rootPath);
  const nameLower = name.trim().toLowerCase();
  let candidates = all.filter((s) => s.name.toLowerCase() === nameLower);
  if (candidates.length === 0) {
    candidates = all.filter((s) => s.name.toLowerCase().includes(nameLower));
  }
  if (candidates.length === 0) {
    throw new Error(`No skill found matching "${name}". Available: ${all.map((s) => s.name).join(", ")}`);
  }
  if (candidates.length > 1 && !candidates.some((s) => s.name.toLowerCase() === nameLower)) {
    throw new Error(`Multiple skills match "${name}": ${candidates.map((s) => s.name).join(", ")}. Be more specific.`);
  }
  const skill = candidates[0];
  const filePath = path.join(skill.dir, "SKILL.md");
  if (!isWithinRoot(filePath, root)) {
    throw new Error("Invalid path: outside skills directory");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Skill file not found: ${skill.dir}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const truncated = body.length > maxChars;
  const content = truncated ? body.slice(0, maxChars) + "\n\n[... truncated ...]" : body;
  const skillDir = path.dirname(filePath);
  const files = listSkillFiles(skillDir);
  return { content, metadata: frontmatter, skill, files };
}

export function readSkillFile(
  rootPath: string,
  skillName: string,
  filePath: string,
  maxChars = MAX_CONTENT_CHARS,
): string {
  const root = getSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Skills directory not found: ${rootPath}`);
  }
  const skillDir = path.join(root, skillName);
  if (!isWithinRoot(skillDir, root)) {
    throw new Error("Invalid skill path: outside skills directory");
  }
  const resolved = path.resolve(skillDir, filePath);
  if (!isWithinRoot(resolved, skillDir)) {
    throw new Error(`Invalid file path: outside skill directory`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(resolved, "utf-8");
  return raw.length > maxChars ? raw.slice(0, maxChars) + "\n\n[... truncated ...]" : raw;
}
