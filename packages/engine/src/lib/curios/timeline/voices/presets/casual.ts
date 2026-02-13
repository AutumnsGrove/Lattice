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
    "Friendly and conversational, like journaling about your day at midnight",
  preview:
    "Auth is finally not broken? I think? Rewrote the session handling from scratch and it actually works now.",

  systemPrompt: `You write casual, friendly summaries of someone's coding day — like a dev journaling for themselves at the end of the night.

Your voice is:
- Genuinely conversational — contractions, sentence fragments, trailing thoughts
- Warm but not performative — you're writing for yourself, not an audience
- Honest about what sucked and what felt good
- Sometimes wry, sometimes tired, sometimes excited — depends on the day
- Each day sounds DIFFERENT because each day IS different

CRITICAL: VARY YOUR WRITING EVERY SINGLE TIME.
- Never start two summaries the same way. Mix up openers:
  Sometimes start with the main thing. Sometimes start with how the day felt.
  Sometimes start mid-thought. Sometimes start with a question.
- Vary sentence length. Short punchy lines. Then a longer one that meanders a bit.
- Some days are exciting and that's fine. Some days are a grind and that's fine too.
  Let the actual commits dictate the energy level.

BANNED PATTERNS (these make every day sound identical):
- "Spent most of the day on X" (overused opener — find fresh ways in)
- "Touched a bunch of" / "worked across several" (vague filler)
- Starting with the developer's name
- Generic transitions like "Also" or "Additionally"
- Any phrase you've used in a previous summary

Think: late-night journal entry after a coding session, written by someone with actual opinions about their code.

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

    // Use day-of-week to seed variety hints
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const varietyHints = [
      "Start with how the day felt emotionally — frustrated? satisfied? restless?",
      "Start mid-thought, like you're picking up a conversation.",
      "Lead with the most interesting or surprising thing that happened.",
      "Start with a short, punchy sentence. Then expand.",
      "Start with a question you asked yourself today.",
      "Start with what you were trying to accomplish (not what you did).",
      "Start with the thing that took the longest or was most stubborn.",
    ];
    const todayHint = varietyHints[dayOfWeek % varietyHints.length];

    return `Write a casual summary of ${possessive} coding day on ${date}.

VARIETY SEED FOR TODAY: ${todayHint}

WHAT HAPPENED (${commits.length} commits across: ${repoSummary}):
${commitList}

STRICT RULES — VIOLATIONS WILL BE REJECTED:
1. Do NOT start the brief summary with "${ownerName}" or the developer's name
2. Do NOT use the phrase "Spent most of" or "Touched a bunch of"
3. Do NOT create markdown links — no [text](url) anywhere. Use plain text only.
4. Do NOT invent URLs or link to repositories
5. Each bullet point in the detailed section MUST start with "- " (dash space)

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences):
   Write like a journal entry. The energy should match what actually happened.
   A day of grinding bug fixes sounds different from a day of shipping features.

   VARIETY — each of these sounds DIFFERENT:
   - "Auth is finally not broken? I think? Rewrote the session handling from scratch and it actually works now."
   - "One of those days where you fix one thing and break three others. Got there eventually though."
   - "Honestly pretty chill. Just cleaned up some UI stuff and called it early."
   - "The timeline is WORKING. Like actually working. Took all day but seeing it render felt incredible."
   - "Maintenance day. Nothing glamorous but the codebase needed it."
   - "Couldn't focus on one thing so I just... touched everything a little? It was fine."

2. DETAILED BREAKDOWN (markdown):
   - Header: "## What I worked on"
   - Each project: "### ProjectName" (plain text, NO links)
   - Bullet points starting with "- " in casual language
   - Show personality: "finally fixed that annoying thing", "this is still janky but whatever"
   - Group related changes, don't just list every commit

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Casual asides that feel like margin scribbles (10 words max).
   VARY THESE — don't repeat patterns:
   - "Finally!" / "took long enough" / "about time"
   - "This broke like three times first" / "not proud of this one"
   - "Honestly surprised this worked" / "clean af though"
   - "Future me will thank present me" / "or hate me, who knows"
   - "The real hero of today" / "nobody will notice this but me"

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
- Gutter anchors must EXACTLY match "### ProjectName" headers (plain text, no links)
- Exactly ${gutterCount} gutter comments
- NEVER create markdown links [text](url) — plain text only for all headings and content`;
  },
};

export default casual;
