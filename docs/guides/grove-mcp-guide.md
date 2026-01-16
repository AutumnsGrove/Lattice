# 🌳 GroveMCP: Remote MCP Servers on Cloudflare Workers

> *Extending Grove's ecosystem with AI-agent tooling via the Model Context Protocol*

---

## TL;DR - Yes, This is PERFECT for Grove

- **McpAgent IS a Durable Object** - each MCP session gets its own DO with persistent SQL storage
- **Free tier now includes DOs** - Cloudflare added this specifically for agents
- **WebSocket Hibernation** - only pay when MCP server is active (perfect for Grove's cost-conscious architecture)
- **Heartwood integration** - use your existing OAuth provider!

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Grove Ecosystem                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│   │   Lattice    │     │   Heartwood  │     │      GroveMCP        │   │
│   │  (blogging)  │     │    (auth)    │     │   (MCP Server)       │   │
│   └──────────────┘     └──────┬───────┘     └──────────┬───────────┘   │
│                               │                        │                │
│                               │ OAuth 2.0 + PKCE       │                │
│                               │                        │                │
│   ┌──────────────┐           │              ┌─────────▼───────────┐    │
│   │    Amber     │           │              │   McpAgentDO        │    │
│   │  (storage)   │◄──────────┼──────────────┤  - Per-session state│    │
│   └──────────────┘           │              │  - SQL storage      │    │
│                              │              │  - Hibernation      │    │
│   ┌──────────────┐           │              └─────────────────────┘    │
│   │  GroveBloom  │◄──────────┤                                         │
│   │(remote dev)  │           │  MCP Tools exposed:                     │
│   └──────────────┘           │  - grove_blog_create                    │
│                              │  - grove_blog_list                      │
│                              │  - bloom_session_start                  │
│                              │  - amber_upload                         │
│                              │  - etc.                                 │
└──────────────────────────────┴──────────────────────────────────────────┘

         ▲                              ▲
         │                              │
         │ SSE/Streamable HTTP          │
         │                              │
┌────────┴────────┐          ┌──────────┴──────────┐
│   Claude.ai     │          │   Claude Desktop    │
│  (Connectors)   │          │   (mcp-remote)      │
└─────────────────┘          └─────────────────────┘
```

---

## Quick Start: Deploy Your First GroveMCP Server

### Option 1: One-Click Deploy

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

Then customize with your tools!

### Option 2: CLI Setup

```bash
# Create new MCP server
pnpm create cloudflare@latest grove-mcp --template=cloudflare/ai/demos/remote-mcp-authless

cd grove-mcp
```

---

## Basic GroveMCP Implementation

### `src/index.ts` - Minimal Stateless Server

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class GroveMCP extends McpAgent<Env, {}, {}> {
  server = new McpServer({
    name: "GroveMCP",
    version: "1.0.0",
  });

  async init() {
    // Tool: List recent blog posts from Lattice
    this.server.tool(
      "grove_blog_list",
      { tenant: z.string().optional() },
      async ({ tenant }) => {
        const response = await fetch(
          `https://lattice.grove.place/api/posts?tenant=${tenant || "default"}`
        );
        const posts = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
        };
      }
    );

    // Tool: Start a GroveBloom coding session
    this.server.tool(
      "bloom_session_start",
      {
        project: z.string(),
        region: z.enum(["eu", "us"]).default("eu"),
        task: z.string().optional(),
      },
      async ({ project, region, task }) => {
        const response = await fetch("https://bloom.grove.place/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, region, task }),
        });
        const session = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Session started! ID: ${session.id}\nRegion: ${region}\nProject: ${project}`,
            },
          ],
        };
      }
    );
  }
}

export default {
  fetch: GroveMCP.Router,
};
```

### `wrangler.jsonc`

```jsonc
{
  "name": "grove-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],

  // McpAgent automatically creates this DO
  "durable_objects": {
    "bindings": [
      {
        "name": "MCP_OBJECT",
        "class_name": "GroveMCP"
      }
    ]
  },

  // Optional: D1 for additional storage
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "grove-mcp-db",
      "database_id": "your-db-id"
    }
  ]
}
```

---

## Stateful MCP Server with Durable Objects

This is where it gets GOOD. Each MCP session = its own Durable Object with persistent storage!

### `src/index.ts` - Stateful Server

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define your session state type
type SessionState = {
  activeProject: string | null;
  taskHistory: Array<{
    task: string;
    status: "pending" | "running" | "complete";
    startedAt: number;
  }>;
  preferences: {
    defaultRegion: "eu" | "us";
    autoShutdownMinutes: number;
  };
};

export class GroveMCP extends McpAgent<Env, SessionState, {}> {
  server = new McpServer({
    name: "GroveMCP",
    version: "1.0.0",
  });

  // Initial state for new sessions
  initialState: SessionState = {
    activeProject: null,
    taskHistory: [],
    preferences: {
      defaultRegion: "eu",
      autoShutdownMinutes: 120,
    },
  };

  async init() {
    // Tool: Set active project (persisted across reconnects!)
    this.server.tool(
      "grove_set_project",
      { project: z.string() },
      async ({ project }) => {
        // State persists in the Durable Object's SQL storage
        this.setState({
          ...this.state,
          activeProject: project,
        });

        return {
          content: [
            { type: "text", text: `Active project set to: ${project}` },
          ],
        };
      }
    );

    // Tool: Get current session context
    this.server.tool("grove_context", {}, async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                activeProject: this.state.activeProject,
                taskCount: this.state.taskHistory.length,
                preferences: this.state.preferences,
              },
              null,
              2
            ),
          },
        ],
      };
    });

    // Tool: Start task with history tracking
    this.server.tool(
      "bloom_task",
      { task: z.string() },
      async ({ task }) => {
        const newTask = {
          task,
          status: "pending" as const,
          startedAt: Date.now(),
        };

        this.setState({
          ...this.state,
          taskHistory: [...this.state.taskHistory, newTask],
        });

        // Actually start the Bloom session
        const project = this.state.activeProject || "default";
        const region = this.state.preferences.defaultRegion;

        await fetch("https://bloom.grove.place/api/sessions", {
          method: "POST",
          body: JSON.stringify({ project, region, task }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Task queued for ${project}:\n"${task}"\n\nTask #${this.state.taskHistory.length} in this session.`,
            },
          ],
        };
      }
    );

    // Tool: Use the DO's built-in SQL storage for complex queries
    this.server.tool(
      "grove_analytics",
      { query: z.string() },
      async ({ query }) => {
        // McpAgent gives you access to ctx.storage.sql
        const results = this.sql`
          SELECT * FROM task_logs 
          WHERE session_id = ${this.name}
          ORDER BY created_at DESC
          LIMIT 10
        `;

        return {
          content: [{ type: "text", text: JSON.stringify(results) }],
        };
      }
    );
  }
}
```

---

## Adding Heartwood OAuth Authentication

Perfect for Grove! Use your existing Heartwood auth:

### `src/index.ts` - With OAuth

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { z } from "zod";

// Custom handler that redirects to Heartwood
class HeartwoodHandler {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      // Redirect to Heartwood OAuth
      const heartwoodUrl = new URL("https://heartwood.grove.place/oauth/authorize");
      heartwoodUrl.searchParams.set("client_id", env.HEARTWOOD_CLIENT_ID);
      heartwoodUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      heartwoodUrl.searchParams.set("response_type", "code");
      heartwoodUrl.searchParams.set("scope", "read write");
      heartwoodUrl.searchParams.set("state", url.searchParams.get("state") || "");

      return Response.redirect(heartwoodUrl.toString());
    }

    if (url.pathname === "/callback") {
      // Exchange code for token with Heartwood
      const code = url.searchParams.get("code");
      const tokenResponse = await fetch("https://heartwood.grove.place/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: env.HEARTWOOD_CLIENT_ID,
          client_secret: env.HEARTWOOD_CLIENT_SECRET,
        }),
      });

      const tokens = await tokenResponse.json();
      // Store tokens, redirect back to MCP client...
    }

    return new Response("Not Found", { status: 404 });
  }
}

// Props passed to your MCP agent after auth
type AuthProps = {
  userId: string;
  tenants: string[]; // Which Grove tenants they have access to
  email: string;
};

export class GroveMCP extends McpAgent<Env, SessionState, AuthProps> {
  server = new McpServer({
    name: "GroveMCP",
    version: "1.0.0",
  });

  async init() {
    // Now you can use this.props for auth context!
    this.server.tool("grove_my_blogs", {}, async () => {
      const userId = this.props.userId;
      const tenants = this.props.tenants;

      // Only show blogs user has access to
      const blogs = await Promise.all(
        tenants.map((t) =>
          fetch(`https://lattice.grove.place/api/${t}/posts?author=${userId}`)
        )
      );

      return {
        content: [{ type: "text", text: JSON.stringify(blogs) }],
      };
    });
  }
}

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: GroveMCP.Router,
  defaultHandler: HeartwoodHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

---

## Connecting to Claude.ai

### For Claude.ai Web (Connectors)

1. Go to **Settings > Connectors**
2. Click **Add custom connector**
3. Enter your MCP server URL: `https://grove-mcp.autumnsgrove.workers.dev/sse`
4. If using OAuth, configure client ID/secret

### For Claude Desktop (via mcp-remote)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "grove": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://grove-mcp.autumnsgrove.workers.dev/sse"
      ]
    }
  }
}
```

---

## Integration with GroveBloom

Your existing GroveBloom worker can expose an MCP interface alongside its REST API:

### `packages/worker/src/mcp.ts`

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class BloomMCP extends McpAgent<Env, BloomState, AuthProps> {
  server = new McpServer({
    name: "GroveBloom",
    version: "1.0.0",
  });

  async init() {
    // Expose all Bloom operations as MCP tools
    this.server.tool(
      "bloom_start",
      {
        project: z.string(),
        region: z.enum(["eu", "us"]).default("eu"),
        task: z.string().optional(),
      },
      async ({ project, region, task }) => {
        // Reuse your existing session provisioning logic
        const session = await this.env.SESSIONS.create({
          project,
          region,
          task,
          userId: this.props.userId,
        });

        return {
          content: [
            {
              type: "text",
              text: `🌸 Bloom session started!\nID: ${session.id}\nTerminal: ${session.terminalUrl}`,
            },
          ],
        };
      }
    );

    this.server.tool("bloom_status", {}, async () => {
      const sessions = await this.env.DB.prepare(
        "SELECT * FROM sessions WHERE user_id = ? AND status != 'terminated'"
      )
        .bind(this.props.userId)
        .all();

      return {
        content: [{ type: "text", text: JSON.stringify(sessions.results) }],
      };
    });

    this.server.tool(
      "bloom_stop",
      { sessionId: z.string() },
      async ({ sessionId }) => {
        await this.env.SESSIONS.terminate(sessionId);
        return {
          content: [{ type: "text", text: `Session ${sessionId} terminated.` }],
        };
      }
    );
  }
}
```

---

## Cost Analysis

### Durable Objects (Free Tier - NEW!)

| Resource | Free Tier | Paid (Workers Paid) |
|----------|-----------|---------------------|
| Requests | 1M/month | $0.15/million |
| Duration | 400K GB-s | $12.50/million GB-s |
| Storage | 1 GB | $0.20/GB |

### With WebSocket Hibernation

Your MCP server **only bills when active**. If Claude sends a tool call:
1. DO wakes from hibernation (instant)
2. Processes request
3. Returns to hibernation

**Estimated cost for 1000 tool calls/month**: ~$0.00 (free tier)

---

## Project Structure for GroveMCP

```
grove-mcp/
├── src/
│   ├── index.ts           # Main entry, exports McpAgent
│   ├── tools/
│   │   ├── lattice.ts     # Blog tools
│   │   ├── bloom.ts       # Remote dev tools
│   │   ├── amber.ts       # Storage tools
│   │   └── analytics.ts   # Rings integration
│   ├── auth/
│   │   └── heartwood.ts   # OAuth handler
│   └── types.ts           # State/Props types
├── wrangler.jsonc
├── package.json
└── README.md
```

---

## Testing Your MCP Server

### Using MCP Inspector

```bash
# Start your server locally
pnpm dev

# In another terminal, run inspector
npx @modelcontextprotocol/inspector@latest

# Open http://localhost:5173
# Connect to http://localhost:8788/sse
```

### Using Cloudflare AI Playground

1. Deploy your server: `pnpm deploy`
2. Go to https://playground.ai.cloudflare.com/
3. Add your MCP server URL
4. Test tools interactively!

---

## Next Steps

1. **Create the repo**: `github.com/AutumnsGrove/GroveMCP`
2. **Start simple**: Just expose `grove_blog_list` and `bloom_start`
3. **Add Heartwood OAuth**: Leverage your existing auth
4. **Expand tools**: Add Amber, Rings, Meadow integrations
5. **Add to Claude**: Via Connectors or custom connector

---

## Resources

- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [McpAgent API Reference](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude Connectors Docs](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)

---

*Built with 🌸 for the Grove ecosystem*
