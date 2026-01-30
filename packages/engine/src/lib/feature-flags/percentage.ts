/**
 * Percentage Rollout Logic
 *
 * Deterministic percentage evaluation using SHA-256 hashing.
 * Same user/tenant always gets same result for same flag.
 *
 * @see docs/plans/feature-flags-spec.md
 */

import type { EvaluationContext, PercentageRuleCondition } from "./types.js";

/**
 * Simple hash function using Web Crypto API (Cloudflare Workers compatible).
 * Returns a number between 0 and 99 for percentage bucketing.
 */
async function hashToBucket(input: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Use first 4 bytes as uint32, mod 100 for percentage
  const view = new DataView(hashArray.buffer);
  const uint32 = view.getUint32(0, false); // big-endian
  return uint32 % 100;
}

/**
 * Evaluate a percentage rollout rule.
 *
 * Uses deterministic hashing to ensure the same user/tenant
 * always gets the same result for the same flag.
 *
 * @param condition - The percentage rule condition
 * @param context - The evaluation context
 * @param flagId - The flag ID (used as salt for bucketing)
 * @returns True if the user is in the rollout percentage
 */
export async function evaluatePercentageRule(
  condition: PercentageRuleCondition,
  context: EvaluationContext,
  flagId: string,
): Promise<boolean> {
  const { percentage, salt = "" } = condition;

  // Edge case: 0% means never, 100% means always
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;

  // Build stable identifier
  // Priority: userId > tenantId > sessionId
  const identifier = context.userId ?? context.tenantId ?? context.sessionId;

  if (!identifier) {
    // No identifier available - fail safe by returning false
    // Random assignment would break the "deterministic" promise and cause
    // inconsistent user experiences across requests
    console.warn(
      `No identifier for percentage rollout of flag "${flagId}" - returning false. ` +
        "Provide userId, tenantId, or sessionId in context for consistent bucketing.",
    );
    return false;
  }

  // Hash identifier with flag-specific salt for independence between flags
  const hashInput = `${flagId}:${salt}:${identifier}`;
  const bucket = await hashToBucket(hashInput);

  return bucket < percentage;
}

/**
 * Get the exact bucket number for a given identifier and flag.
 * Useful for debugging and testing.
 *
 * @param flagId - The flag ID
 * @param identifier - The user/tenant/session identifier
 * @param salt - Optional salt for the flag
 * @returns The bucket number (0-99)
 */
export async function getUserBucket(
  flagId: string,
  identifier: string,
  salt = "",
): Promise<number> {
  const hashInput = `${flagId}:${salt}:${identifier}`;
  return hashToBucket(hashInput);
}

/**
 * Synchronous version of getUserBucket for testing.
 * Uses a simple FNV-1a hash instead of SHA-256.
 *
 * NOTE: This is NOT the same algorithm as the async version.
 * Only use for testing or when async is not available.
 */
export function getUserBucketSync(
  flagId: string,
  identifier: string,
  salt = "",
): number {
  const input = `${flagId}:${salt}:${identifier}`;

  // FNV-1a hash (fast, good distribution)
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep as 32-bit unsigned
  }

  return hash % 100;
}
