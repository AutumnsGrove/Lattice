---
title: What is Warden?
description: The secure gateway that lets agents talk to the outside world
category: help
section: how-it-works
lastUpdated: '2026-02-23'
keywords:
  - warden
  - api gateway
  - agents
  - security
  - credentials
  - technical
  - how grove works
  - infrastructure
order: 5
---

# What is Warden?

You don't need to understand Warden to use Grove. But if you're curious about how AI agents securely interact with external services, here's the story.

## The short version

Warden is Grove's external API gateway. When an AI agent needs to create a GitHub issue, search the web, or interact with any third-party service, the request goes through Warden. The agent describes what it wants to do. Warden checks permissions, adds the credentials, executes the request, and returns the results.

The agent never sees the API keys. They stay inside Grove's infrastructure.

## The problem it solves

AI agents are increasingly capable. They can write code, file issues, search documentation, send emails. But every one of those actions requires API credentials. And here's the uncomfortable truth: agents running in environments you don't fully control (cloud platforms, third-party integrations, even your own IDE extensions) can potentially leak those credentials.

If an agent has your GitHub token in memory, that token could be:

- Logged accidentally
- Extracted through prompt injection
- Included in training data
- Exposed through debugging output

The traditional approach is to give the agent the keys and hope for the best. Warden takes a different path.

## How it works

Instead of giving agents your API keys, you give them permission to ask Warden for specific actions:

1. **Agent requests an action:** "Create an issue in autumnsgrove/grove-engine"
2. **Warden validates:** Does this agent have permission? Is it within rate limits?
3. **Warden executes:** Adds the GitHub token, makes the API call
4. **Warden responds:** Returns the result with any sensitive data scrubbed

The agent gets what it asked for. The key stays home.

## What this means for you

**Your secrets stay secret.** API keys, tokens, and credentials live in Warden's encrypted store. External agents can use them without ever seeing them. Internal Grove services can request credentials over secure internal channels, but those keys never touch the public internet.

**Actions are scoped.** Each agent gets specific permissions. An MCP server might have `github:read` and `github:write` but not `github:admin`. An internal service like [[Lumen]] might have `openrouter:*` but nothing else. Scopes prevent accidents.

**Everything is logged.** Every request through Warden creates an audit trail. You can see which agents did what, when.

**Keys rotate seamlessly.** When you rotate an API key, you update it in one place. Every service that uses Warden gets the new key automatically — no need to update each worker individually.

## Where Warden shows up

You won't see [[warden]] in the Grove interface. Like [[lumen]], it's infrastructure. But it powers:

- **AI inference.** When [[Lumen]] needs an API key to talk to OpenRouter, it asks Warden. The key is resolved, used, and never stored outside Warden.
- **AI coding agents.** When Claude creates issues, opens PRs, or triggers workflows, Warden handles the GitHub API calls.
- **Search integrations.** Web searches and documentation lookups go through Warden to protect search API keys.
- **Email sending.** Transactional emails route through Warden to keep Resend credentials secure.
- **Infrastructure operations.** Cloudflare API calls for worker deployments, KV operations, and DNS management.

## Lumen and Warden

Grove has two gateways. They work together:

**[[lumen]]** routes AI inference requests. When Grove needs to moderate content, generate text, or transcribe audio, it talks to [[Lumen]]. [[Lumen]] picks the right model and provider.

**[[warden]]** manages credentials and routes external API requests. When any service — including [[Lumen]] — needs an API key, it asks [[Warden]]. When an agent needs to interact with GitHub or search the web, [[Warden]] injects credentials and validates permissions.

[[Lumen]] is actually a [[Warden]] client. When [[Lumen]] needs to call OpenRouter, it asks [[Warden]] for the key rather than storing it directly. This means all API credentials live in one place, with one audit trail.

| | [[Lumen]] | [[Warden]] |
|---|---|---|
| **Purpose** | AI model inference | Credential management + external API access |
| **Consumer** | Grove services | Lumen, agents, and workflows |
| **Protects** | PII (scrubbing pipeline) | All API keys (OpenRouter, GitHub, Tavily, etc.) |
| **Routing** | Task-based (moderation, generation) | Action-based + credential resolution |

## The technical details

Warden supports two authentication methods, depending on who's calling:

**For external agents** (MCP servers, coding tools, IDE extensions), Warden uses a challenge-response flow. Agents don't send credentials directly. Instead:

1. Agent requests a one-time nonce from Warden
2. Agent creates a signature: `hash(agent_secret + nonce)`
3. Agent sends the signature with the request
4. Warden verifies the signature and validates the nonce
5. Nonce is invalidated (prevents replay attacks)

The agent's secret is never transmitted. Even if someone intercepts the signature, they can't reuse it.

**For internal Grove services** (like [[Lumen]]), Warden uses service binding authentication. These services run on the same infrastructure as Warden — their requests never travel over the public internet. They authenticate with a registered API key and can request credential resolution directly. This is how [[Lumen]] gets OpenRouter keys without storing them.

If you're the type who reads technical specifications, the full architecture is documented in [Warden — External API Gateway](/knowledge/specs/warden-spec)

## Why we mention it

Most platforms don't explain their security infrastructure. Grove does, because understanding how your data flows matters. When you connect an AI agent to Grove, you should know what it can and can't access.

Warden is the gatekeeper. It ensures that agents can be useful without being dangerous.

---

*The one who holds the keys.*
