/**
 * Thorn - Publish Hook
 *
 * Provides a single function to moderate published content.
 * Designed to be called via platform.context.waitUntil() so
 * moderation runs asynchronously after the response is sent.
 *
 * This function NEVER throws — it catches all errors internally
 * so it's safe for fire-and-forget usage.
 *
 * @see docs/specs/thorn-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import { createLumenClient } from "../lumen/client.js";
import { moderateContent } from "./moderate.js";
import { logModerationEvent, flagContent } from "./logging.js";
import type { ThornContentType, ThornHookPoint } from "./types.js";

export interface ModeratePublishedContentOptions {
  /** The text content to moderate */
  content: string;
  /** Cloudflare AI binding */
  ai?: Ai;
  /** D1 database for logging */
  db: D1Database;
  /** OpenRouter API key (for provider routing) */
  openrouterApiKey?: string;
  /** Tenant ID */
  tenantId: string;
  /** User ID of the content author */
  userId?: string;
  /** Content type for threshold selection */
  contentType: ThornContentType;
  /** Hook point that triggered moderation */
  hookPoint: ThornHookPoint;
  /** Reference to the content (e.g., post slug) */
  contentRef?: string;
}

/**
 * Moderate published content and log the decision.
 *
 * Safe to call in waitUntil() — never throws.
 * Flow:
 * 1. Creates a Lumen client
 * 2. Runs Thorn moderation
 * 3. Logs the decision to thorn_moderation_log
 * 4. If flagged or blocked, inserts into thorn_flagged_content
 */
export async function moderatePublishedContent(
  options: ModeratePublishedContentOptions,
): Promise<void> {
  const {
    content,
    ai,
    db,
    openrouterApiKey,
    tenantId,
    userId,
    contentType,
    hookPoint,
    contentRef,
  } = options;

  try {
    // Create Lumen client for moderation
    // openrouterApiKey defaults to empty — moderation uses Cloudflare AI, not OpenRouter
    const lumen = createLumenClient({
      openrouterApiKey: openrouterApiKey || "",
      ai,
      db,
    });

    // Run Thorn moderation
    const result = await moderateContent(content, {
      lumen,
      tenant: tenantId,
      contentType,
    });

    // Log the moderation event (always, even for allows)
    await logModerationEvent(db, {
      userId,
      tenantId,
      contentType,
      hookPoint,
      action: result.action,
      categories: result.categories,
      confidence: result.confidence,
      model: result.model,
      contentRef,
    });

    // If flagged or blocked, create a review queue entry
    if (result.action === "flag_review" || result.action === "block") {
      await flagContent(db, {
        userId,
        tenantId,
        contentType,
        contentRef,
        action: result.action,
        categories: result.categories,
        confidence: result.confidence,
      });

      console.log(
        `[Thorn] Content ${result.action}: ${contentType} "${contentRef}" ` +
          `(${result.categories.join(", ")} @ ${result.confidence})`,
      );
    }
  } catch (err) {
    // Never throw — this runs in waitUntil, failures should not affect the user
    console.error("[Thorn] Post-publish moderation failed:", err);
  }
}
