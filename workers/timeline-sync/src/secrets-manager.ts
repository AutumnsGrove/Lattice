/**
 * Envelope Encryption Manager for Tenant Secrets
 *
 * Provides per-tenant key isolation using envelope encryption:
 * - KEK (Key Encryption Key): Stored in Cloudflare Secrets Store
 * - DEK (Data Encryption Key): Per-tenant, stored encrypted in D1
 * - Secrets: Encrypted with tenant's DEK
 *
 * Simplified version for the timeline-sync worker (read-only).
 * @see libs/engine/src/lib/server/secrets-manager.ts for full implementation.
 */

import { encryptToken, decryptToken, isEncryptedToken } from "./encryption";

/**
 * Generates a new 256-bit key as 64 hex characters.
 * Used for creating per-tenant DEKs.
 */
function generateDEKHex(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Manages tenant secrets using envelope encryption.
 *
 * Usage:
 * ```ts
 * const secrets = new SecretsManager(env.DB, env.GROVE_KEK);
 *
 * const token = await secrets.getSecret('tenant_123', 'timeline_github_token');
 * ```
 */
export class SecretsManager {
	/** Per-instance DEK cache. Safe because instances are created per-request. */
	private dekCache: Map<string, string> = new Map();

	constructor(
		private db: D1Database,
		private kekHex: string,
	) {
		// Validate KEK format immediately
		if (kekHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(kekHex)) {
			throw new Error("KEK must be 64 hex characters (256 bits)");
		}
	}

	/**
	 * Get or create the DEK for a tenant.
	 * DEKs are cached for the lifetime of this SecretsManager instance.
	 */
	async getTenantDEK(tenantId: string): Promise<string> {
		// Return cached DEK if available
		const cached = this.dekCache.get(tenantId);
		if (cached) return cached;

		// Fetch tenant record
		const result = await this.db
			.prepare("SELECT encrypted_dek FROM tenants WHERE id = ?")
			.bind(tenantId)
			.first<{ encrypted_dek: string | null }>();

		if (!result) {
			throw new Error(`Tenant not found: ${tenantId}`);
		}

		let dekHex: string;

		if (result.encrypted_dek && isEncryptedToken(result.encrypted_dek)) {
			// Decrypt existing DEK using KEK
			dekHex = await decryptToken(result.encrypted_dek, this.kekHex);
		} else {
			// Generate new DEK for this tenant
			dekHex = generateDEKHex();

			// Encrypt DEK with KEK and store
			const encryptedDek = await encryptToken(dekHex, this.kekHex);
			await this.db
				.prepare("UPDATE tenants SET encrypted_dek = ? WHERE id = ?")
				.bind(encryptedDek, tenantId)
				.run();
		}

		// Cache and return
		this.dekCache.set(tenantId, dekHex);
		return dekHex;
	}

	/**
	 * Retrieve and decrypt a secret.
	 * Returns null if not found.
	 * Throws if decryption fails (wrong key, corrupted data).
	 */
	async getSecret(tenantId: string, keyName: string): Promise<string | null> {
		const dekHex = await this.getTenantDEK(tenantId);

		const result = await this.db
			.prepare("SELECT encrypted_value FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?")
			.bind(tenantId, keyName)
			.first<{ encrypted_value: string }>();

		if (!result) return null;

		return decryptToken(result.encrypted_value, dekHex);
	}

	/**
	 * Safely get a secret, returning null on any error.
	 * Useful for graceful degradation.
	 */
	async safeGetSecret(tenantId: string, keyName: string): Promise<string | null> {
		try {
			return await this.getSecret(tenantId, keyName);
		} catch {
			return null;
		}
	}
}

/**
 * Create a SecretsManager instance from environment.
 * Returns null if KEK is not configured.
 */
export function createSecretsManager(
	db: D1Database,
	kek: string | undefined,
): SecretsManager | null {
	if (!kek) return null;
	try {
		return new SecretsManager(db, kek);
	} catch {
		return null;
	}
}
