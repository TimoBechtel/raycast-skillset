import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List } from "@raycast/api";
import * as path from "path";
import { useEffect, useState } from "react";
import { listSkills, readSkill, type Skill } from "./lib/skills";

function SkillDetail({ skill, root }: { skill: Skill; root: string }) {
  const { content, metadata } = readSkill(root, skill.name);
  const hasMetadata = Object.keys(metadata).length > 0;
  return (
    <Detail
      markdown={content}
      navigationTitle={skill.name}
      metadata={
        hasMetadata ? (
          <Detail.Metadata>
            {Object.entries(metadata).map(([key, value]) => (
              <Detail.Metadata.Label key={key} title={key.charAt(0).toUpperCase() + key.slice(1)} text={value} />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Name" content={skill.name} />
          <Action.OpenWith path={path.join(skill.dir, "SKILL.md")} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory?.trim() ?? "";
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setHasLoaded(false);
    if (!root) {
      setError("Skills directory not configured");
      setSkills([]);
      setHasLoaded(true);
      return;
    }
    try {
      const result = listSkills(root);
      setSkills(result);
      setError(null);
      setHasLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSkills([]);
      setHasLoaded(true);
    }
  }, [root]);

  return (
    <List isLoading={!!root && !hasLoaded && !error} searchBarPlaceholder="Search skills...">
      {error && (
        <List.EmptyView title={root ? "Could not read skills" : "Skills directory not set"} description={error} />
      )}
      {!error && skills.length === 0 && root && (
        <List.EmptyView title="No skills found" description={`Add SKILL.md files in subdirectories of ${root}`} />
      )}
      {skills.map((skill) => (
        <List.Item
          key={skill.name}
          id={skill.name}
          title={skill.name}
          subtitle={skill.summary}
          keywords={[skill.name, skill.summary].filter((x): x is string => Boolean(x))}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<SkillDetail skill={skill} root={root} />} />
              <Action.CopyToClipboard title="Copy Name" content={skill.name} />
              <Action.OpenWith path={path.join(skill.dir, "SKILL.md")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
