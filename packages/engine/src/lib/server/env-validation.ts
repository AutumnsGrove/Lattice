/**
 * Environment Variable Validation
 *
 * Provides early validation of required environment variables with actionable
 * error messages. In Cloudflare Workers, env vars come through platform.env,
 * so we validate at request time but fail fast with clear messages.
 *
 * @see https://developers.cloudflare.com/workers/configuration/environment-variables/
 */

export interface CloudflareEnv {
  DB?: D1Database;
  CACHE_KV?: KVNamespace;
  ANTHROPIC_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  TOGETHER_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  AUTH?: Fetcher;
  IMAGES?: R2Bucket;
  AI?: Ai; // Workers AI binding for Petal image moderation
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  message: string;
}

/**
 * Validate that required environment variables are configured.
 * Returns a result object with validation status and helpful error messages.
 *
 * @example
 * ```typescript
 * const validation = validateEnv(platform?.env, ['DB', 'CACHE_KV', 'ANTHROPIC_API_KEY']);
 * if (!validation.valid) {
 *   throw error(503, validation.message);
 * }
 * ```
 */
export function validateEnv(
  env: CloudflareEnv | undefined,
  required: string[],
): ValidationResult {
  if (!env) {
    return {
      valid: false,
      missing: required,
      message:
        "Platform environment not available. Ensure you're running in Cloudflare Workers.",
    };
  }

  const missing: string[] = [];

  for (const key of required) {
    const value = env[key];
    // Check for undefined, null, or empty string
    if (value === undefined || value === null || value === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const envList = missing.join(", ");
    return {
      valid: false,
      missing,
      message: `Missing required environment variables: ${envList}. Check your wrangler.toml configuration.`,
    };
  }

  return {
    valid: true,
    missing: [],
    message: "All required environment variables are configured.",
  };
}

/**
 * Validate environment and throw a 503 error if validation fails.
 * Use this for fail-fast validation at the start of request handlers.
 *
 * @example
 * ```typescript
 * // In a request handler:
 * requireEnv(platform?.env, ['DB', 'ANTHROPIC_API_KEY'], error);
 * // If validation fails, throws error(503, "Missing required...")
 * ```
 */
export function requireEnv(
  env: CloudflareEnv | undefined,
  required: string[],
  errorFn: (status: number, message: string) => never,
): void {
  const validation = validateEnv(env, required);
  if (!validation.valid) {
    // Log the specific missing vars for debugging (not exposed to user)
    console.error(
      `[Env Validation] ${validation.message}`,
      `Missing: ${validation.missing.join(", ")}`,
    );
    // Return generic message to user
    errorFn(503, "Service configuration error. Please contact support.");
  }
}

/**
 * Check if at least one of the specified environment variables is configured.
 * Useful for features with multiple provider options (e.g., AI inference).
 *
 * @example
 * ```typescript
 * const hasAI = hasAnyEnv(platform?.env, [
 *   'OPENROUTER_API_KEY',
 * ]);
 * if (!hasAI) {
 *   throw error(503, "No AI provider configured");
 * }
 * ```
 */
export function hasAnyEnv(
  env: CloudflareEnv | undefined,
  keys: string[],
): boolean {
  if (!env) return false;

  return keys.some((key) => {
    const value = env[key];
    return value !== undefined && value !== null && value !== "";
  });
}
