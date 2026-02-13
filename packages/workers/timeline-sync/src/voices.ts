/**
 * Voice Presets System
 *
 * Simplified version of the engine's voice system for the cron worker.
 * All 5 voice presets are inlined here to avoid cross-package dependencies.
 */

import type { Commit, VoicePreset, CustomVoiceConfig } from "./config";

// =============================================================================
// Voice Presets (Inlined from engine/src/lib/curios/timeline/voices/presets)
// =============================================================================

const professional: VoicePreset = {
  id: "professional",
  name: "Professional",
  systemPrompt: `You write daily development summaries for a personal coding journal.

Your voice is:
- Matter-of-fact and technically clear
- Like a developer writing notes for their future self
- Describing what happened, not how impressive it was

CRITICAL RESTRICTIONS:
- Never use cheerleader language (crushed it, on a roll, amazing, etc.)
- Never start summaries with exclamations about productivity
- Never use emojis
- Start with the actual work, not commentary about the work

Always respond with valid JSON only.`,

  buildPrompt(commits: Commit[], date: string, ownerName = "the developer") {
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

    return `You are writing a daily development summary for ${ownerName}'s personal coding journal on ${date}.

STRICT RULES - VIOLATIONS WILL BE REJECTED:

1. NEVER start with exclamations about productivity or impressiveness
   BANNED OPENERS: "Wow", "What a day", "Busy day", "Productive day", "Another great day"

2. NEVER use cheerleader phrases anywhere in the summary
   BANNED: "crushed it", "killed it", "on a roll", "on fire", "smashed it", "nailed it"

3. NO emojis. Zero. None.

4. MINIMAL exclamation marks (max 1 total, and only if genuinely warranted)

5. START the brief summary with the WORK ITSELF:
   GOOD: "Refactored the auth system..." / "The timeline got some attention..."
   BAD: "Wow, what a productive day!" / "${ownerName} tackled a ton of updates!"

6. NEVER create markdown links — no [text](url) format anywhere. Use plain text only for headings.

7. VARY your writing day to day. Don't start every summary the same way.

VOICE: Write like a developer's changelog or a quiet journal entry. Matter-of-fact about the work.

COMMITS TODAY (${commits.length} total across: ${repoSummary}):
${commitList}

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences):
   - First sentence: what was the main focus
   - Second sentence: what else happened or how it connects
   - Optional third: a grounded observation

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Projects"
   - Each project: "### ProjectName"
   - Bullet points for key changes

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Short observations (10 words max).
   GOOD: "This one was tricky." / "Incremental progress." / "Long overdue cleanup."
   BAD: "Great work!" / "Crushing it!"

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your 2-3 sentence summary here",
  "detailed": "## Projects\\n\\n### ProjectName\\n- Change one\\n- Change two",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Short observation"}
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

const quest: VoicePreset = {
  id: "quest",
  name: "Quest Mode",
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
- Keep it fun but still informative about what actually happened
- NEVER create markdown links [text](url) — plain text only for all headings and content`;
  },
};

const casual: VoicePreset = {
  id: "casual",
  name: "Casual",
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

const poetic: VoicePreset = {
  id: "poetic",
  name: "Poetic",
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
- Gutter anchors must EXACTLY match "### ProjectName" headers (plain text, no links)
- Exactly ${gutterCount} gutter comments
- Keep it genuine - find real meaning, don't force purple prose
- NEVER create markdown links [text](url) — plain text only for all headings and content`;
  },
};

const minimal: VoicePreset = {
  id: "minimal",
  name: "Minimal",
  systemPrompt: `You write extremely concise development summaries.

Your voice is:
- Minimal, factual, no prose
- Bullet points and short phrases
- Technical accuracy over readability
- Like git commit messages, not sentences

STYLE GUIDELINES:
- No full sentences needed
- Skip articles (a, an, the)
- Use shorthand: impl, fix, refactor, add, rm
- Numbers and stats are good
- One line per concept

Think: a terse log file that a developer can scan in 2 seconds.

Always respond with valid JSON only.`,

  buildPrompt(commits: Commit[], date: string, _ownerName = "dev") {
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
      .map(([repo, msgs]) => `${repo}: ${msgs.length}`)
      .join(", ");

    const gutterCount = Math.min(3, Math.max(1, Math.ceil(commits.length / 5)));

    return `Generate minimal summary of ${date} commits.

COMMITS (${commits.length} total - ${repoSummary}):
${commitList}

GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (1-2 lines max):
   Ultra-concise. Examples:
   - "Auth: session fixes, token refresh. Timeline: CSS polish."
   - "Refactor day. GroveEngine internals, test cleanup."
   - "Bug fixes across 4 repos. Nothing major."

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Log"
   - Each project: "### ProjectName"
   - Terse bullet points
   - Skip minor changes, group related ones
   - Use shorthand: impl, fix, add, rm, refactor

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Single words or very short phrases.
   Examples:
   - "fixed"
   - "wip"
   - "cleanup"
   - "breaking"
   - "done"

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Terse summary here",
  "detailed": "## Log\\n\\n### ProjectName\\n- fix: thing\\n- add: other",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "word"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers (plain text, no links)
- Exactly ${gutterCount} gutter comments
- Keep everything as short as possible
- NEVER create markdown links [text](url) — plain text only for all headings and content`;
  },
};

// =============================================================================
// Voice Registry
// =============================================================================

const VOICE_PRESETS: Record<string, VoicePreset> = {
  professional,
  quest,
  casual,
  poetic,
  minimal,
};

const DEFAULT_VOICE = "professional";

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a voice preset by ID
 */
export function getVoice(voiceId: string): VoicePreset {
  const voice = VOICE_PRESETS[voiceId];
  if (!voice) {
    console.warn(
      `Unknown voice preset: ${voiceId}, falling back to professional`,
    );
    return VOICE_PRESETS[DEFAULT_VOICE];
  }
  return voice;
}

/**
 * Build a custom voice from user-provided prompts
 */
export function buildCustomVoice(customConfig: CustomVoiceConfig): VoicePreset {
  const {
    systemPrompt = VOICE_PRESETS.professional.systemPrompt,
    summaryInstructions = "",
    gutterStyle = "",
  } = customConfig;

  return {
    id: "custom",
    name: "Custom",
    systemPrompt,

    buildPrompt(commits: Commit[], date: string, ownerName = "the developer") {
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

      const gutterCount = Math.min(
        5,
        Math.max(1, Math.ceil(commits.length / 3)),
      );

      let prompt = `Write a daily development summary for ${ownerName} on ${date}.

COMMITS TODAY (${commits.length} total across: ${repoSummary}):
${commitList}

`;

      if (summaryInstructions) {
        prompt += `STYLE INSTRUCTIONS:
${summaryInstructions}

`;
      }

      prompt += `GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences)

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Projects"
   - Each project: "### ProjectName"
   - Bullet points for key changes

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Short observations (10 words max).`;

      if (gutterStyle) {
        prompt += `
   Style: ${gutterStyle}`;
      }

      prompt += `

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your summary here",
  "detailed": "## Projects\\n\\n### ProjectName\\n- Change one",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Observation"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers (plain text, no links)
- Exactly ${gutterCount} gutter comments
- NEVER create markdown links [text](url) — plain text only for all headings and content`;

      return prompt;
    },
  };
}

/**
 * Maximum commits to include verbatim in the prompt.
 * Beyond this, commits are summarized to keep prompt size manageable.
 */
const MAX_PROMPT_COMMITS = 40;

/**
 * Truncate commits for prompt inclusion.
 * If there are more than MAX_PROMPT_COMMITS, include the first batch verbatim
 * and summarize the remainder to prevent context window overflow.
 */
function truncateCommitsForPrompt(commits: Commit[]): {
  commitList: string;
  truncated: boolean;
  totalCount: number;
} {
  if (commits.length <= MAX_PROMPT_COMMITS) {
    return {
      commitList: commits
        .map(
          (c, i) =>
            `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`,
        )
        .join("\n"),
      truncated: false,
      totalCount: commits.length,
    };
  }

  // Include the first MAX_PROMPT_COMMITS verbatim
  const included = commits.slice(0, MAX_PROMPT_COMMITS);
  const remaining = commits.slice(MAX_PROMPT_COMMITS);

  // Summarize the remaining commits by repo
  const remainingByRepo: Record<string, number> = {};
  for (const c of remaining) {
    remainingByRepo[c.repo] = (remainingByRepo[c.repo] || 0) + 1;
  }
  const remainingSummary = Object.entries(remainingByRepo)
    .map(([repo, count]) => `${repo}: ${count}`)
    .join(", ");

  const commitList =
    included
      .map(
        (c, i) =>
          `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`,
      )
      .join("\n") +
    `\n... and ${remaining.length} more commits (${remainingSummary})`;

  return {
    commitList,
    truncated: true,
    totalCount: commits.length,
  };
}

/**
 * Build the complete prompt for summary generation using the selected voice.
 *
 * @param voiceId - The voice preset ID (or "custom")
 * @param commits - Array of commits to summarize
 * @param date - Target date in YYYY-MM-DD format
 * @param ownerName - Display name for the developer
 * @param customConfig - Custom voice configuration (when voiceId is "custom")
 * @param context - Optional long-horizon context for multi-day awareness
 */
export function buildVoicedPrompt(
  voiceId: string,
  commits: Commit[],
  date: string,
  ownerName = "the developer",
  customConfig: CustomVoiceConfig | null = null,
  context: {
    historicalContext?: string;
    continuationNote?: string;
  } | null = null,
): { systemPrompt: string; userPrompt: string } {
  let voice: VoicePreset;

  if (voiceId === "custom" && customConfig) {
    voice = buildCustomVoice(customConfig);
  } else {
    voice = getVoice(voiceId);
  }

  let userPrompt = voice.buildPrompt(commits, date, ownerName);

  // Append long-horizon context if provided (condensed to save tokens)
  if (context) {
    let contextSection = "";

    if (context.historicalContext) {
      contextSection += `
RECENT CONTEXT (brief awareness only — do NOT recap these):
${context.historicalContext}

`;
    }

    if (context.continuationNote) {
      contextSection += `${context.continuationNote}

`;
    }

    // Insert context before the commit list
    const commitsMarker = "COMMITS TODAY";
    const whatHappenedMarker = "WHAT HAPPENED";
    let insertIndex = userPrompt.indexOf(commitsMarker);
    if (insertIndex <= 0) {
      insertIndex = userPrompt.indexOf(whatHappenedMarker);
    }
    if (insertIndex > 0) {
      userPrompt =
        userPrompt.slice(0, insertIndex) +
        contextSection +
        userPrompt.slice(insertIndex);
    } else {
      // Fallback: prepend context
      userPrompt = contextSection + userPrompt;
    }
  }

  return {
    systemPrompt: voice.systemPrompt,
    userPrompt,
  };
}
