import { getPreferenceValues } from "@raycast/api";
import { listSkills } from "../lib/skills";

type Input = {
  /** Optional limit on number of skills to return (default 100) */
  limit?: number;
};

/** List all available skills in the user's skills directory. Call this first when the user asks what skills they have. */
export default function tool(input?: Input): { skills: ReturnType<typeof listSkills> } {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory;
  if (!root) {
    throw new Error("Skills directory not configured. Open extension preferences to set it.");
  }
  const skills = listSkills(root);
  const limit = input?.limit ?? 100;
  return { skills: skills.slice(0, limit) };
}
