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
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments`;
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
- Keep it fun but still informative about what actually happened`;
  },
};

const casual: VoicePreset = {
  id: "casual",
  name: "Casual",
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
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments
- Keep it genuine - find real meaning, don't force purple prose`;
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
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments
- Keep everything as short as possible`;
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
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments`;

      return prompt;
    },
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

  // Append long-horizon context if provided
  if (context) {
    let contextSection = "";

    if (context.historicalContext) {
      contextSection += `
RECENT CONTEXT (for awareness, not recapping):
${context.historicalContext}

`;
    }

    if (context.continuationNote) {
      contextSection += `${context.continuationNote}

`;
    }

    // Insert context before the commit list
    const commitsMarker = "COMMITS TODAY";
    const insertIndex = userPrompt.indexOf(commitsMarker);
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
