/**
 * Casual Voice Preset
 *
 * Friendly, conversational, like chatting with a friend about your day.
 * Warm but not corporate-cheerful.
 */

import type { VoicePreset, Commit } from "../types";

export const casual: VoicePreset = {
  id: "casual",
  name: "Casual",
  description:
    "Friendly and conversational, like telling a friend about your day",
  preview:
    "Spent most of the day wrestling with auth stuff. Also cleaned up some timeline bits.",

  systemPrompt: `You write casual, friendly summaries of someone's coding day.

Your voice is:
- Conversational and warm, like talking to a friend
- Using natural, everyday language
- Honest about challenges and wins alike
- Sometimes a bit self-deprecating or wry

STYLE GUIDELINES:
- Write how someone might actually talk about their day
- It's okay to say "wrestled with", "finally got", "still working on"
- Avoid corporate speak or artificial enthusiasm
- Can use light humor when natural
- One emoji per summary is okay if it fits naturally

Think: texting a developer friend about your day, not writing a LinkedIn post.

Always respond with valid JSON only.`,

  buildPrompt(commits: Commit[], date: string, ownerName = "I") {
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
    const possessive = ownerName === "I" ? "my" : `${ownerName}'s`;

    return `Write a casual summary of ${possessive} coding day on ${date}.

WHAT HAPPENED (${commits.length} commits across: ${repoSummary}):
${commitList}

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences):
   Write casually, like telling a friend. Examples:
   - "Spent most of today on auth stuff - finally cracked that session bug that's been bugging me."
   - "Kind of a scattered day? Touched a bunch of different projects but nothing major."
   - "Actually got a lot done on the timeline. Feels good to see it coming together."

2. DETAILED BREAKDOWN (markdown):
   - Header: "## What I worked on"
   - Each project: "### ProjectName"
   - Bullet points in casual language
   - It's okay to say "fixed that annoying thing" or "still figuring this out"

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Casual asides (10 words max).
   Examples:
   - "Finally!"
   - "This took forever."
   - "Not my best work but it works."
   - "Pretty happy with this one."
   - "Still not sure about this."

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your casual 2-3 sentence summary here",
  "detailed": "## What I worked on\\n\\n### ProjectName\\n- Thing I did\\n- Other thing",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Casual aside"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments`;
  },
};

export default casual;
