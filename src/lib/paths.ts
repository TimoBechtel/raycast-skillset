import * as os from "os";
import * as path from "path";

export function expandHomeDir(p: string): string {
  if (p.startsWith("~")) {
    return path.normalize(p.replace(/^~/, os.homedir()));
  }
  return p;
}

export function resolveSkillsRoot(rawPath: string): string {
  if (!rawPath?.trim()) {
    throw new Error("Skills directory path is required");
  }
  const expanded = expandHomeDir(rawPath.trim());
  return path.resolve(expanded);
}

export function isWithinRoot(child: string, root: string): boolean {
  const resolvedChild = path.resolve(child);
  const resolvedRoot = path.resolve(root);
  return resolvedChild === resolvedRoot || resolvedChild.startsWith(resolvedRoot + path.sep);
}
