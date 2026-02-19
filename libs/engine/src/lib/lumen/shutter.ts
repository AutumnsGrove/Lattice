/**
 * Shutter - Web Content Distillation (STUB)
 *
 * Future integration point for Shutter, which fetches web pages and distills
 * them into focused, token-efficient context for LLM requests.
 *
 * When implemented, this will:
 * 1. Fetch URLs via Jina Reader / Tavily / httpx
 * 2. Run extraction through a cheap/fast model (DeepSeek V3 or GPT-OSS)
 * 3. Detect prompt injection in fetched content (Canary heuristics + LLM)
 * 4. Inject distilled content into the Lumen request messages
 *
 * @see https://github.com/AutumnsGrove/Shutter
 * @see ShutterOptions in ./types.ts
 */

import type { LumenMessage, ShutterOptions, ShutterResult } from "./types.js";
import type { ProviderRegistry } from "./providers/index.js";

/**
 * Run Shutter web content distillation.
 *
 * NOT YET IMPLEMENTED — will throw until the Cloudflare port (v1.5) lands.
 *
 * @param options - Shutter configuration (URLs, query, model tier)
 * @param messages - Current request messages (for injection point)
 * @param providers - Provider registry (will use OpenRouter for extraction)
 * @returns Distilled content and injection detection results
 */
export async function runShutter(
  _options: ShutterOptions,
  _messages: LumenMessage[],
  _providers: ProviderRegistry,
): Promise<ShutterResult> {
  throw new Error(
    "Shutter integration not yet implemented. " +
      "See https://github.com/AutumnsGrove/Shutter for the standalone Python package.",
  );
}

/**
 * Inject Shutter extractions into Lumen messages.
 *
 * NOT YET IMPLEMENTED — stub for the message injection logic.
 *
 * @param messages - Original Lumen messages
 * @param result - Shutter extraction results
 * @param options - Shutter options (determines inject mode)
 * @returns Modified messages with distilled content injected
 */
export function injectShutterContext(
  _messages: LumenMessage[],
  _result: ShutterResult,
  _options: ShutterOptions,
): LumenMessage[] {
  throw new Error("Shutter context injection not yet implemented.");
}
