/**
 * Quest Voice Preset
 *
 * RPG/adventure style - turn your coding into an epic journey.
 * Every commit is a heroic deed, every bug fix a monster slain.
 */

import type { VoicePreset, Commit } from "../types";

export const quest: VoicePreset = {
  id: "quest",
  name: "Quest Mode",
  description: "Turn your coding into an RPG adventure",
  preview:
    "Day 3 of the Authentication Saga. The session dragons have been tamed at last.",

  systemPrompt: `You are a bard chronicling a developer's coding adventures in an RPG style.

Your voice is:
- Dramatic but not over-the-top
- Treating code work as heroic quests and adventures
- Using fantasy/RPG metaphors naturally
- Still technically accurate underneath the flavor

STYLE GUIDELINES:
- Bugs are monsters or challenges to overcome
- Features are quests or missions
- Refactoring is forging better weapons
- Multi-day work becomes sagas or campaigns
- Use phrases like "ventured into", "forged", "conquered", "discovered"

Keep it fun but readable. The humor should come from the juxtaposition of epic language with mundane coding tasks.

Always respond with valid JSON only.`,

  buildPrompt(commits: Commit[], date: string, ownerName = "the adventurer") {
    const commitList = commits
      .map(
        (c, i) =>
          `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`,
      )
      .join("\n");

    const repoGroups: Record<string, string[]> = {};
    commits.forEach((c) => {
      if (!repoGroups[c.repo]) repoGroups[c.repo] = [];
      repoGroups[c.repo].push(c.message);
    });
    const repoSummary = Object.entries(repoGroups)
      .map(([repo, msgs]) => `${repo}: ${msgs.length} commits`)
      .join(", ");

    const gutterCount = Math.min(5, Math.max(1, Math.ceil(commits.length / 3)));

    return `Chronicle ${ownerName}'s coding adventures on ${date} in RPG quest style.

QUEST LOG ENTRIES (${commits.length} deeds across: ${repoSummary}):
${commitList}

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences):
   Write as if chronicling an adventurer's day. Examples:
   - "The authentication dungeons proved treacherous today, but ${ownerName} emerged victorious."
   - "A quiet day of maintenance quests - sharpening tools and organizing the inventory."
   - "Day 3 of the Great Refactoring Campaign. The codebase grows stronger."

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Quest Log"
   - Each project: "### [ProjectName] Expedition"
   - Bullet points as quest achievements/challenges faced
   - Use RPG language: "vanquished the null pointer beast", "forged new API endpoints"

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Short RPG-flavored observations (10 words max).
   Examples:
   - "A worthy opponent."
   - "The hero levels up."
   - "Side quest complete."
   - "The plot thickens."
   - "Loot acquired."

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your 2-3 sentence quest summary here",
  "detailed": "## Quest Log\\n\\n### [ProjectName] Expedition\\n- Achievement one\\n- Achievement two",
  "gutter": [
    {"anchor": "### [ProjectName] Expedition", "type": "comment", "content": "RPG observation"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match the "### [ProjectName] Expedition" headers you create
- Exactly ${gutterCount} gutter comments
- Keep it fun but still informative about what actually happened`;
  },
};

export default quest;
