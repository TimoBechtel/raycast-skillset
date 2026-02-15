import { getPreferenceValues } from "@raycast/api";
import { searchSkills } from "../lib/skills";

type Input = {
  /** Search query (name or content) */
  query: string;
  /** Optional limit on results (default 20) */
  limit?: number;
};

/** Search skills by name or content. Use when the user wants to find a skill but doesn't know the exact name. */
export default function tool(input: Input): { skills: ReturnType<typeof searchSkills> } {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory;
  if (!root) {
    throw new Error("Skills directory not configured. Open extension preferences to set it.");
  }
  const limit = input.limit ?? 20;
  const skills = searchSkills(root, input.query, limit);
  return { skills };
}
