/**
 * Thorn - Core Moderation Function
 *
 * Wraps Lumen's moderation task with Grove-specific policy logic.
 * Returns a decision based on Thorn's category thresholds and content type.
 *
 * @see docs/specs/thorn-spec.md
 */

import type { LumenClient } from "../lumen/index.js";
import { determineAction } from "./config.js";
import type { ThornResult, ThornOptions } from "./types.js";

// =============================================================================
// Public API
// =============================================================================

/**
 * Moderate text content using Lumen's moderation task.
 *
 * Flow:
 * 1. Send content to Lumen's moderation task
 *    Primary: GPT-oss Safeguard 20B (policy-based safety reasoning with confidence scores)
 *    Fallback: LlamaGuard 4 12B (binary safe/unsafe classification)
 *    Last resort: DeepSeek V3.2 (general-purpose with policy prompt)
 * 2. Map the moderation result through Thorn's threshold configuration
 * 3. Return a decision based on content type and category confidence
 *
 * @param content - Text content to moderate
 * @param options - Moderation options (lumen client, tenant, content type)
 * @returns ThornResult with decision, categories, and confidence
 *
 * @example
 * ```typescript
 * const result = await moderateContent(postBody, {
 *   lumen,
 *   tenant: tenantId,
 *   contentType: 'blog_post',
 * });
 *
 * if (!result.allowed) {
 *   // Handle blocked/flagged content
 * }
 * ```
 */
export async function moderateContent(
  content: string,
  options: ThornOptions,
): Promise<ThornResult> {
  const { lumen, tenant, contentType } = options;

  // Call Lumen's moderation task
  const result = await lumen.moderate({
    content,
    tenant,
  });

  // Map Lumen moderation result to Thorn action via config thresholds
  const action = determineAction(result, contentType);

  return {
    allowed: action === "allow" || action === "warn",
    action,
    categories: result.categories,
    confidence: result.confidence,
    model: result.model,
  };
}
