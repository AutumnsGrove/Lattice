/**
 * Minimal Voice Preset
 *
 * Just the facts. Bullet points. No fluff.
 * For those who want pure signal, no style.
 */

import type { VoicePreset, Commit } from "../types";

export const minimal: VoicePreset = {
  id: "minimal",
  name: "Minimal",
  description: "Just the facts, bullet points only",
  preview:
    "Auth: session handling, token refresh. Timeline: UI polish. 3 repos, 12 commits.",

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
- Keep everything as short as possible
- NEVER create markdown links for section headers (no [Title](url) format)
- Only use plain text for headings
- Do NOT invent URLs or link to non-existent repositories`;
  },
};

export default minimal;
