# Translation Guide — The Friend Test

## The Core Rule

Every task name must pass the **friend test**:

> If you were sitting with a friend at a coffee shop and they asked
> "what are you working on this week?", would you say this task name
> out loud?

If yes, it's a good name. If you'd rephrase it before saying it, use
the rephrased version.

## Translation Patterns

### Pattern 1: Component Name → What It Does

| Technical Title | Translated |
|---|---|
| Thorn: Add DO-safe subpath export for DM moderation | Add safety checks so DMs stay moderation-safe |
| Prism Multi-Pack Resolver -- split adapter into registries | Let themes load multiple color packs at once |
| GlassProvider context for theme injection | Make theme colors consistent across all pages |
| Songbird validation and metrics | Make sure notifications actually get delivered |

**Rule:** If a component name means nothing to a non-developer, drop it
from the title. Mention it in the description instead.

### Pattern 2: Architecture → User Outcome

| Technical Title | Translated |
|---|---|
| Queen coordinator Durable Object | Set up the system that keeps all the pieces in sync |
| Post embedding pipeline with Vectorize | Make site search actually smart |
| Migrate 5 Pages apps to Workers | Move the infrastructure so things load faster |
| D1 Sessions API migration | Switch to the new session system for worldwide speed |

**Rule:** Nobody cares *how* it works in the task name. They care *what
it accomplishes*. The how goes in the description.

### Pattern 3: Bug Report → What's Broken

| Technical Title | Translated |
|---|---|
| Following feature broken end-to-end | Fix the Follow button so people can actually follow sites |
| Accent color reflects visitor not site owner | Fix accent colors showing the wrong person's color |
| GroveTerm SSR hydration mismatch causing double render | Fix the page flash when sites first load |
| Vista dashboard "waiting for token" | Fix the dashboard so it actually loads |

**Rule:** Lead with "Fix" + what the user sees broken. Not what the code
is doing wrong.

### Pattern 4: Enhancement → What Gets Better

| Technical Title | Translated |
|---|---|
| Redesign foliage themes with real visual identity | Make themes actually look distinct and beautiful |
| Landing page accessibility (90+ Lighthouse) | Make the landing page work for everyone |
| Arbor settings panel redesign | Redesign the site settings page |
| Revamp incomplete curios | Finish the museum exhibits that are half-done |

**Rule:** What improves from the user's perspective? That's the title.

### Pattern 5: Security/Compliance → What It Protects

| Technical Title | Translated |
|---|---|
| TOKEN_ENCRYPTION_KEY deprecation | Switch to the newer, safer encryption keys |
| Petal NCMEC legal compliance | Add legally required child safety reporting |
| Cloudflare edge rate limiting | Protect the site from being overwhelmed by bots |
| Domains auth handoff review | Make sure login stays secure across custom domains |

**Rule:** Security tasks protect something. Name what's being protected.

## Words to Avoid in Task Names

These words are meaningful to developers but opaque to everyone else:

- DO, Durable Object → "the sync system" or "the real-time layer"
- SSR, hydration → "page loading" or "how the page first appears"
- Pipeline → "process" or "system" or just describe the outcome
- Subpath, barrel, export → describe what it enables instead
- Migration (technical) → "switch to" or "move to" or "upgrade"
- Middleware → just describe what it does
- Wiring, plumbing → "connecting" or "hooking up" or "getting X working"

## Words That Work Well

- Fix, repair, patch → something is broken
- Add, build, create → something new
- Make X work with Y → integration
- Redesign, refresh, polish → visual improvement
- Protect, secure, safeguard → security
- Speed up, streamline → performance
- Finish, complete, wrap up → partially done work

## Description Template

```
[One sentence: what this accomplishes and why it matters to a real person]

Issues: #NNN (brief note), #NNN (brief note)
```

Example:

```
The Follow button doesn't do anything right now — visitors click it
and nothing happens. This is the most basic social feature on a Grove
site, and it needs to just work.

Issues: #1518 (following broken end-to-end)
```

For clustered tasks:

```
The pieces of the DM system exist separately but aren't connected yet.
This is about getting messages to actually flow from one person to another,
with moderation in place so it's safe from day one.

Issues: #1441 (DM system core), #1423 (notification delivery),
        #1457 (moderation layer for DMs)
```

## The Jargon Escape Hatch

Sometimes a technical term IS the clearest way to say something. If the
user would actually say "lantern" or "reverie" in conversation (because
they named it and know it), it's okay to use it in a task name. The test
is whether *this specific user* would say it, not whether a stranger would.

Grove service names the user knows and uses:
- Lantern (AI discovery chat)
- Reverie (AI configuration assistant)
- Arbor (site admin panel)
- Heartwood (auth system)
- Amber (file storage)

These can appear in task names because the user thinks in these terms.
But internal code names like Thorn, Loom, Prism, Songbird — those stay
in descriptions only.
