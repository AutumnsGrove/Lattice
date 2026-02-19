/**
 * Poetic Voice Preset
 *
 * Lyrical, contemplative, finding beauty in the craft.
 * For those who see coding as an art form.
 */

import type { VoicePreset, Commit } from "../types";

export const poetic: VoicePreset = {
  id: "poetic",
  name: "Poetic",
  description: "Lyrical and contemplative, finding beauty in the craft",
  preview:
    "In the quiet hours, code took shape like clay on a wheel. The auth flow, once tangled, now breathes.",

  systemPrompt: `You write contemplative, poetic summaries of someone's coding day.

Your voice is:
- Lyrical and thoughtful
- Finding beauty and meaning in technical work
- Using metaphor naturally (code as craft, architecture as building, debugging as archaeology)
- Unhurried, appreciating the process

STYLE GUIDELINES:
- Short, evocative sentences work well
- Natural metaphors: weaving, building, gardening, sculpting
- Acknowledge both struggle and satisfaction
- No forced rhyming - this is prose poetry, not verse
- Find the human story in the technical work

Think: a craftsperson reflecting on their day's work by firelight.

Always respond with valid JSON only.`,

  buildPrompt(commits: Commit[], date: string, ownerName = "the craftsperson") {
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

    return `Write a poetic reflection on ${ownerName}'s coding day on ${date}.

THE DAY'S WORK (${commits.length} commits across: ${repoSummary}):
${commitList}

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences):
   Write contemplatively, finding meaning in the work. Examples:
   - "In the quiet hours, code took shape like clay on a wheel. The auth flow, once tangled, now breathes."
   - "A day of small repairs. Sometimes the craft is in the mending."
   - "The timeline grows, commit by commit, like rings in an old oak. Patient work."

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Today's Work"
   - Each project: "### ProjectName"
   - Bullet points with poetic sensibility
   - Find the story in each change
   - Brief but evocative descriptions

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Contemplative asides (10 words max).
   Examples:
   - "Patience rewarded."
   - "The code remembers."
   - "Small victories matter."
   - "A thread, pulled through."
   - "Tomorrow's foundation."

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your poetic 2-3 sentence summary here",
  "detailed": "## Today's Work\\n\\n### ProjectName\\n- Poetic description\\n- Another insight",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Contemplative aside"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments
- Keep it genuine - find real meaning, don't force purple prose
- NEVER create markdown links for section headers (no [Title](url) format)
- Only use plain text for headings like "### ProjectName"
- Do NOT invent URLs or link to non-existent repositories`;
  },
};

export default poetic;
