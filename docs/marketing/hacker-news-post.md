# Hacker News: Show HN Post

> **Purpose**: Hacker News Show HN submission
> **Tone**: Technical, direct, with a values punch
> **Key Points**: 1 month build, AI agents, Shade protection works

---

## Title

**Show HN: I quit my job and built a blogging platform in a month that blocks AI crawlers**

---

## Body

**What I built:** Grove: a multi-tenant blogging platform where everyone gets `username.grove.place`. Built on Cloudflare Workers/D1/R2/KV with SvelteKit.

**The twist:** It aggressively blocks AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) using Cloudflare's bot management. Your words are not training data. I even block my own AI tools from scraping community content.

**How I built it:** One month, mostly AI agents (Claude Code, DeepSeek, Kimi), and a neurodivergent brain that refused to accept surveillance capitalism as inevitable.

**Tech stack:** Cloudflare edge infrastructure, SvelteKit 5, TypeScript, Stripe payments, magic code auth, Durable Objects for session management.

**Live components:**
- forage.grove.place: AI domain search (multi-provider: Claude, DeepSeek, Kimi, Llama 4)
- Example blog with Shade protection verified working
- MCP server (mycelium.grove.place) for AI agent integration
- Full onboarding, admin panel, theme system

**Why this matters:** I'm launching to 70 waitlist members this week. I just quit my job. I built this for people who've left social media because it's a dopamine slot machine designed to trap neurodivergent minds like mine.

**The social layer (Meadow):** No algorithms, no public metrics, no engagement farming. Launching with RSS support so users can build their own feeds immediately.

Would love feedback from folks who also think the internet can be better than this.

**Link:** grove.place
