/**
 * Timeline Curio Secrets Helper
 *
 * Tokens live in SecretsManager, envelope-encrypted with a per-tenant DEK
 * (see libs/grove-crypto). The single shared `TOKEN_ENCRYPTION_KEY` and its
 * per-column ciphertext are gone: production had no legacy values left and
 * the key was no longer set on any worker (#1475).
 *
 * The `*_encrypted` columns on `timeline_curio_config` are kept in the schema
 * so this stays a code change rather than a destructive migration, but nothing
 * writes a ciphertext to them any more — saves clear them.
 */

import { createSecretsManager, type SecretsManager } from "@autumnsgrove/grove-crypto/secrets";
import { logGroveError } from "@autumnsgrove/grove-errors";
import { CURIO_ERRORS } from "../errors";

/** Secret key names for Timeline tokens in SecretsManager */
export const TIMELINE_SECRET_KEYS = {
	GITHUB_TOKEN: "timeline_github_token",
	OPENROUTER_KEY: "timeline_openrouter_key",
} as const;

export type TimelineSecretKey = (typeof TIMELINE_SECRET_KEYS)[keyof typeof TIMELINE_SECRET_KEYS];

/**
 * Environment bindings needed for token operations
 */
interface TokenEnv {
	DB: D1Database;
	GROVE_KEK?: string;
}

/**
 * Result of a token retrieval operation
 */
export interface TokenResult {
	token: string | null;
	source: "secrets_manager" | "none";
}

/** Tag for consistent log grepping */
const TAG = "[Timeline Secrets]";

/**
 * Format an error for logging without leaking secret values.
 * Extracts the message string so catch blocks produce useful output.
 */
function errorDetail(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}

/**
 * Summarize which encryption bindings are available for diagnostics.
 * NEVER logs actual key values — only presence/absence and basic format info.
 */
function envDiagnostic(env: TokenEnv): string {
	const parts: string[] = [];

	if (env.GROVE_KEK) {
		const len = env.GROVE_KEK.length;
		const isHex = /^[0-9a-fA-F]+$/.test(env.GROVE_KEK);
		parts.push(`GROVE_KEK: ${len} chars, ${isHex ? "hex" : "NOT hex (wrong format!)"}`);
	} else {
		parts.push("GROVE_KEK: missing");
	}

	return parts.join(", ");
}

/**
 * Get a Timeline token from SecretsManager.
 *
 * @param env - Platform environment with DB and the key encryption key
 * @param tenantId - The tenant ID
 * @param keyName - Which secret to retrieve
 * @returns TokenResult with the decrypted token and where it came from
 */
export async function getTimelineToken(
	env: TokenEnv,
	tenantId: string,
	keyName: TimelineSecretKey,
): Promise<TokenResult> {
	if (!env.GROVE_KEK) {
		console.warn(
			`${TAG} getTimelineToken(${keyName}): GROVE_KEK not configured, cannot read secrets`,
		);
		return { token: null, source: "none" };
	}

	try {
		const secrets = await createSecretsManager({
			DB: env.DB,
			GROVE_KEK: env.GROVE_KEK,
		});
		const token = await secrets.safeGetSecret(tenantId, keyName);
		return { token: token ?? null, source: token ? "secrets_manager" : "none" };
	} catch (error) {
		logGroveError("TimelineSecrets", CURIO_ERRORS.SECRETS_MANAGER_FAILED, {
			detail: `${keyName}: ${errorDetail(error)}. Env: ${envDiagnostic(env)}`,
			cause: error,
		});
		return { token: null, source: "none" };
	}
}

/**
 * Save a Timeline token to SecretsManager.
 *
 * Throws when the key encryption key is missing rather than falling back to a
 * weaker store: a token that cannot be encrypted should be refused, not
 * written somewhere else.
 */
export async function setTimelineToken(
	env: TokenEnv,
	tenantId: string,
	keyName: TimelineSecretKey,
	plainToken: string,
): Promise<{ system: "secrets_manager" }> {
	if (!env.GROVE_KEK) {
		console.error(
			`${TAG} setTimelineToken(${keyName}): GROVE_KEK not configured. Env: ${envDiagnostic(env)}`,
		);
		throw new Error("GROVE_KEK is not configured — refusing to store a token");
	}

	const secrets = await createSecretsManager({
		DB: env.DB,
		GROVE_KEK: env.GROVE_KEK,
	});
	await secrets.setSecret(tenantId, keyName, plainToken);

	return { system: "secrets_manager" };
}

/**
 * Delete a Timeline token from SecretsManager.
 * Legacy column should be cleared separately via SQL.
 */
export async function deleteTimelineToken(
	env: TokenEnv,
	tenantId: string,
	keyName: TimelineSecretKey,
): Promise<boolean> {
	if (!env.GROVE_KEK) {
		console.warn(
			`${TAG} deleteTimelineToken(${keyName}): GROVE_KEK not configured, cannot delete from SecretsManager`,
		);
		return false;
	}

	try {
		const secrets = await createSecretsManager({
			DB: env.DB,
			GROVE_KEK: env.GROVE_KEK,
		});
		const deleted = await secrets.deleteSecret(tenantId, keyName);
		console.warn(
			`${TAG} Deleted ${keyName} from SecretsManager: ${deleted ? "found and removed" : "not found"}`,
		);
		return deleted;
	} catch (error) {
		console.error(
			`${TAG} deleteTimelineToken FAILED for ${keyName}: ${errorDetail(error)}. ` +
				`Env: ${envDiagnostic(env)}`,
		);
		return false;
	}
}

/**
 * Check whether a Timeline token exists in SecretsManager.
 */
export async function hasTimelineToken(
	env: TokenEnv,
	tenantId: string,
	keyName: TimelineSecretKey,
): Promise<boolean> {
	if (!env.GROVE_KEK) {
		console.warn(`${TAG} hasTimelineToken(${keyName}): GROVE_KEK not configured, reporting absent`);
		return false;
	}

	try {
		const secrets = await createSecretsManager({
			DB: env.DB,
			GROVE_KEK: env.GROVE_KEK,
		});
		return await secrets.hasSecret(tenantId, keyName);
	} catch (error) {
		console.error(
			`${TAG} hasTimelineToken FAILED for ${keyName}: ${errorDetail(error)}. ` +
				`Env: ${envDiagnostic(env)}`,
		);
		return false;
	}
}

/**
 * Create a SecretsManager instance, handling missing GROVE_KEK gracefully.
 * Returns null if GROVE_KEK is not configured.
 */
export async function maybeCreateSecretsManager(env: TokenEnv): Promise<SecretsManager | null> {
	if (!env.GROVE_KEK) {
		console.warn(`${TAG} maybeCreateSecretsManager: GROVE_KEK not configured`);
		return null;
	}

	try {
		return await createSecretsManager({
			DB: env.DB,
			GROVE_KEK: env.GROVE_KEK,
		});
	} catch (error) {
		console.error(
			`${TAG} maybeCreateSecretsManager FAILED: ${errorDetail(error)}. ` +
				`Env: ${envDiagnostic(env)}`,
		);
		return null;
	}
}
