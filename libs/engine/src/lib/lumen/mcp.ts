/**
 * Lumen MCP - Model Context Protocol Integration (STUB)
 *
 * Future integration point for MCP tool augmentation. When implemented,
 * Lumen will be able to invoke external tools (Tavily search, Context7 docs,
 * custom MCP servers) and inject their results as context before inference.
 *
 * This turns Lumen from a request router into a full AI orchestration layer:
 *   Client → Lumen → [Songbird] → [Shutter] → [MCP Tools] → Provider → Response
 *
 * Clients get tool-augmented responses without managing any tool APIs —
 * one key, one interface, many capabilities.
 *
 * Architecture notes:
 * - MCP servers are registered in a server registry (config or D1)
 * - "auto" mode selects tools based on task type + tool relevantTasks
 * - Tool results are injected as context (system msg, prepend, or append)
 * - BYOK pattern: tenants can bring their own Tavily/Context7 keys
 * - Tool calls run in parallel with a combined timeout
 *
 * @see https://modelcontextprotocol.io
 * @see LumenMcpOptions in ./types.ts
 */

import type {
  LumenMessage,
  LumenMcpOptions,
  LumenMcpResult,
  LumenMcpServerConfig,
  LumenTask,
} from "./types.js";
import type { ProviderRegistry } from "./providers/index.js";

// =============================================================================
// SERVER REGISTRY (STUB)
// =============================================================================

/**
 * MCP Server Registry — manages available tool servers.
 *
 * NOT YET IMPLEMENTED — will hold registered MCP servers and their tools.
 * Future: could be backed by D1 for per-tenant server configs.
 */
export class McpServerRegistry {
  private servers: Map<string, LumenMcpServerConfig> = new Map();

  /**
   * Register an MCP server with Lumen.
   */
  register(config: LumenMcpServerConfig): void {
    this.servers.set(config.id, config);
  }

  /**
   * Get a registered server by ID.
   */
  get(id: string): LumenMcpServerConfig | undefined {
    return this.servers.get(id);
  }

  /**
   * Get all servers that have tools relevant to a task.
   */
  getForTask(task: LumenTask): LumenMcpServerConfig[] {
    return Array.from(this.servers.values()).filter((server) =>
      server.tools.some(
        (tool) => !tool.relevantTasks || tool.relevantTasks.includes(task),
      ),
    );
  }

  /**
   * List all registered servers.
   */
  list(): LumenMcpServerConfig[] {
    return Array.from(this.servers.values());
  }
}

// =============================================================================
// TOOL EXECUTION (STUB)
// =============================================================================

/**
 * Execute MCP tools and return results for context injection.
 *
 * NOT YET IMPLEMENTED — will connect to MCP servers, invoke tools,
 * and return formatted results.
 *
 * @param options - MCP configuration (tools, timeout, inject mode)
 * @param task - Current Lumen task (for "auto" tool selection)
 * @param registry - MCP server registry
 * @param providers - Provider registry (for tool-specific auth)
 * @returns Tool results ready for context injection
 */
export async function runMcpTools(
  _options: LumenMcpOptions,
  _task: LumenTask,
  _registry: McpServerRegistry,
  _providers: ProviderRegistry,
): Promise<LumenMcpResult> {
  throw new Error(
    "MCP tool augmentation not yet implemented. " +
      "See https://modelcontextprotocol.io for protocol details.",
  );
}

/**
 * Inject MCP tool results into Lumen messages.
 *
 * NOT YET IMPLEMENTED — will format tool results and inject them
 * into the message array based on the configured inject mode.
 *
 * @param messages - Original Lumen messages
 * @param result - MCP tool execution results
 * @param options - MCP options (determines inject mode)
 * @returns Modified messages with tool context injected
 */
export function injectMcpContext(
  _messages: LumenMessage[],
  _result: LumenMcpResult,
  _options: LumenMcpOptions,
): LumenMessage[] {
  throw new Error("MCP context injection not yet implemented.");
}
