# Grove Tenant Secrets: Envelope Encryption Implementation Guide

**Target Repository:** `AutumnsGrove/Lattice`  
**Existing File:** `libs/engine/src/lib/server/encryption.ts`  
**Goal:** Add envelope encryption layer on top of existing AES-256-GCM implementation

---

## Overview

This guide adds **envelope encryption** to Grove's existing crypto utilities. The current `encryption.ts` is solid—we're wrapping it with per-tenant key isolation using Cloudflare Secrets Store.

### What We're Keeping

Your existing `encryption.ts` already has:

- ✅ AES-256-GCM algorithm
- ✅ Random 12-byte IV per encryption
- ✅ Version prefix (`v1:iv:ciphertext`)
- ✅ Hex key input (64 chars = 256 bits)
- ✅ Web Crypto API

### What We're Adding

| Current                                       | With Envelope Encryption                    |
| --------------------------------------------- | ------------------------------------------- |
| Single `TOKEN_ENCRYPTION_KEY` for all tenants | Per-tenant DEK                              |
| Key in Worker environment variable            | KEK in Secrets Store, DEKs in D1            |
| One key compromise = everything exposed       | One tenant compromise = only their data     |
| Key rotation = re-encrypt all data            | Key rotation = re-encrypt DEKs only (small) |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Secrets Store                                   │
│  └── GROVE_KEK (256-bit key, hex encoded)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Worker binding (free, native)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SecretsManager class                                       │
│  1. Fetch tenant's encrypted DEK from D1                   │
│  2. Decrypt DEK using KEK (your existing decryptToken)     │
│  3. Decrypt user secret using DEK (your existing code)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ D1 queries
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  D1 Database                                                │
│  ├── tenants.encrypted_dek (DEK encrypted with KEK)        │
│  └── tenant_secrets (user secrets encrypted with DEK)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Debug Existing Issues (Optional but Recommended)

Before adding complexity, diagnose why decryption is "janky." Add this to `encryption.ts`:

### 1.1 Add Debug Function

```typescript
// Add to libs/engine/src/lib/server/encryption.ts

/**
 * Diagnostic version of decryptToken that reports exactly where failures occur.
 * Use this to debug decryption issues, then remove or disable in production.
 */
export async function debugDecryptToken(
	encrypted: string,
	keyHex: string,
): Promise<{
	success: boolean;
	value?: string;
	error?: string;
	stage?: string;
	details?: Record<string, unknown>;
}> {
	try {
		// Stage 1: Parse format
		const parts = encrypted.split(":");
		let ivBase64: string;
		let ctBase64: string;
		let format: string;

		if (parts.length === 3 && parts[0] === "v1") {
			format = "v1";
			ivBase64 = parts[1];
			ctBase64 = parts[2];
		} else if (parts.length === 2) {
			format = "legacy";
			ivBase64 = parts[0];
			ctBase64 = parts[1];
		} else {
			return {
				success: false,
				error: `Unexpected format: ${parts.length} parts, first="${parts[0]?.slice(0, 10)}"`,
				stage: "parse",
				details: {
					partsCount: parts.length,
					firstPart: parts[0]?.slice(0, 20),
				},
			};
		}

		// Stage 2: Validate base64 characters
		const base64Regex = /^[A-Za-z0-9+/=]+$/;
		if (!base64Regex.test(ivBase64)) {
			return {
				success: false,
				error: `IV contains invalid base64 characters`,
				stage: "iv-base64",
				details: { ivLength: ivBase64.length, ivSample: ivBase64.slice(0, 20) },
			};
		}
		if (!base64Regex.test(ctBase64)) {
			return {
				success: false,
				error: `Ciphertext contains invalid base64 characters`,
				stage: "ct-base64",
				details: { ctLength: ctBase64.length },
			};
		}

		// Stage 3: Check IV length (12 bytes = 16 base64 chars)
		if (ivBase64.length !== 16) {
			return {
				success: false,
				error: `IV wrong base64 length: ${ivBase64.length} (expected 16)`,
				stage: "iv-length",
				details: { ivBase64Length: ivBase64.length, iv: ivBase64 },
			};
		}

		// Stage 4: Decode base64
		let iv: ArrayBuffer;
		let ciphertext: ArrayBuffer;
		try {
			iv = base64ToArrayBuffer(ivBase64);
		} catch (e) {
			return {
				success: false,
				error: `IV base64 decode failed: ${e}`,
				stage: "iv-decode",
			};
		}
		try {
			ciphertext = base64ToArrayBuffer(ctBase64);
		} catch (e) {
			return {
				success: false,
				error: `Ciphertext base64 decode failed: ${e}`,
				stage: "ct-decode",
			};
		}

		// Stage 5: Verify decoded IV length
		if (iv.byteLength !== 12) {
			return {
				success: false,
				error: `Decoded IV wrong byte length: ${iv.byteLength} (expected 12)`,
				stage: "iv-bytes",
			};
		}

		// Stage 6: Validate key format
		if (keyHex.length !== 64) {
			return {
				success: false,
				error: `Key wrong length: ${keyHex.length} chars (expected 64)`,
				stage: "key-length",
			};
		}
		if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
			const badChar = keyHex.split("").find((c) => !/[0-9a-fA-F]/.test(c));
			return {
				success: false,
				error: `Key contains non-hex character: "${badChar}"`,
				stage: "key-format",
			};
		}

		// Stage 7: Import key
		let key: CryptoKey;
		try {
			key = await importKey(keyHex);
		} catch (e) {
			return {
				success: false,
				error: `Key import failed: ${e}`,
				stage: "key-import",
			};
		}

		// Stage 8: Decrypt
		try {
			const decrypted = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv: new Uint8Array(iv) },
				key,
				ciphertext,
			);
			const value = new TextDecoder().decode(decrypted);
			return {
				success: true,
				value,
				details: {
					format,
					ivLength: iv.byteLength,
					ctLength: ciphertext.byteLength,
				},
			};
		} catch (e) {
			// This is the most common failure point - wrong key or tampered data
			return {
				success: false,
				error: `Decryption failed: ${e instanceof Error ? e.message : e}`,
				stage: "decrypt",
				details: {
					format,
					ivLength: iv.byteLength,
					ctLength: ciphertext.byteLength,
					hint: "Usually means wrong key or data was modified after encryption",
				},
			};
		}
	} catch (e) {
		return {
			success: false,
			error: `Unexpected error: ${e instanceof Error ? e.message : e}`,
			stage: "unknown",
		};
	}
}
```

### 1.2 Test Failing Decryption

Create a test script or add a temporary API route:

```typescript
// Temporary debug endpoint - REMOVE AFTER DEBUGGING
export async function debugEncryption(env: Env) {
	// Test with a known value
	const testPlaintext = "test-token-12345";
	const key = env.TOKEN_ENCRYPTION_KEY;

	// Encrypt
	const encrypted = await encryptToken(testPlaintext, key);
	console.log("Encrypted:", encrypted);

	// Decrypt with debug
	const result = await debugDecryptToken(encrypted, key);
	console.log("Debug result:", JSON.stringify(result, null, 2));

	// Test a known-failing value from your DB
	const failingValue = "v1:ABC123..."; // paste real failing value
	const failResult = await debugDecryptToken(failingValue, key);
	console.log("Failing value debug:", JSON.stringify(failResult, null, 2));

	return result;
}
```

### 1.3 Common Issues This Will Catch

| Stage        | Problem                       | Fix                                  |
| ------------ | ----------------------------- | ------------------------------------ |
| `parse`      | Data truncated or corrupted   | Check DB column size, network issues |
| `iv-base64`  | Whitespace or URL-safe base64 | Trim input, normalize base64         |
| `iv-length`  | Wrong IV stored               | Check encryption code                |
| `key-length` | Env var not set or partial    | Check wrangler.toml secrets          |
| `key-format` | Key has non-hex chars         | Regenerate key properly              |
| `decrypt`    | Wrong key or tampered data    | Key mismatch between envs            |

---

## Phase 2: Cloudflare Secrets Store Setup

### 2.1 Generate the KEK

Generate a 256-bit key in hex format (same format your existing code uses):

```bash
# Generate 64 hex characters (256 bits)
openssl rand -hex 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Store this key securely - it cannot be recovered if lost.**

### 2.2 Create Secrets Store and Add KEK

```bash
# List existing stores
wrangler secrets-store store list

# Create store if needed
wrangler secrets-store store create grove-secrets --remote

# Add the KEK (paste your 64-char hex key when prompted)
wrangler secrets-store secret put GROVE_KEK --store grove-secrets --remote
```

### 2.3 Update wrangler.toml

```toml
# In libs/engine/wrangler.toml

[[secrets_store_secrets]]
binding = "GROVE_KEK"
store_id = "<your-store-id>"  # Get from: wrangler secrets-store store list
secret_name = "GROVE_KEK"
```

### 2.4 Update Environment Type

```typescript
// In src/types/env.ts or equivalent

export interface Env {
	// Existing bindings
	DB: D1Database;
	TOKEN_ENCRYPTION_KEY: string; // Keep for now during migration

	// Add Secrets Store binding
	GROVE_KEK: {
		get(): Promise<string>;
	};
}
```

---

## Phase 3: Database Schema Updates

### 3.1 Add DEK Column to Tenants

```sql
-- migrations/XXXX_add_encrypted_dek.sql

ALTER TABLE tenants ADD COLUMN encrypted_dek TEXT;
```

### 3.2 Create Tenant Secrets Table

```sql
-- migrations/XXXX_create_tenant_secrets.sql

CREATE TABLE IF NOT EXISTS tenant_secrets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE (tenant_id, key_name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_secrets_tenant ON tenant_secrets(tenant_id);
```

### 3.3 Run Migrations

```bash
wrangler d1 migrations apply grove-db --local
wrangler d1 migrations apply grove-db --remote
```

---

## Phase 4: Secrets Manager (Wraps Existing Code)

### 4.1 Create SecretsManager

Create `libs/engine/src/lib/server/secrets-manager.ts`:

````typescript
/**
 * Envelope encryption wrapper for tenant secrets.
 * Uses existing encryption.ts functions internally.
 */

import { encryptToken, decryptToken, isEncryptedToken } from "./encryption";

export interface TenantSecret {
	keyName: string;
	createdAt: string;
	updatedAt: string;
}

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
 * Architecture:
 * - KEK (Key Encryption Key): Stored in Cloudflare Secrets Store
 * - DEK (Data Encryption Key): Per-tenant, stored encrypted in D1
 * - Secrets: Encrypted with tenant's DEK
 *
 * Usage:
 * ```ts
 * const secrets = new SecretsManager(env.DB, await env.GROVE_KEK.get());
 *
 * await secrets.setSecret('tenant_123', 'github_token', 'ghp_xxx');
 * const token = await secrets.getSecret('tenant_123', 'github_token');
 * ```
 */
export class SecretsManager {
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
	private async getTenantDEK(tenantId: string): Promise<string> {
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
	 * Store a secret for a tenant.
	 * Overwrites if key_name already exists.
	 */
	async setSecret(tenantId: string, keyName: string, plainValue: string): Promise<void> {
		const dekHex = await this.getTenantDEK(tenantId);
		const encrypted = await encryptToken(plainValue, dekHex);

		await this.db
			.prepare(
				`
        INSERT INTO tenant_secrets (tenant_id, key_name, encrypted_value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT (tenant_id, key_name)
        DO UPDATE SET 
          encrypted_value = excluded.encrypted_value,
          updated_at = datetime('now')
      `,
			)
			.bind(tenantId, keyName, encrypted)
			.run();
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

	/**
	 * Check if a secret exists without decrypting.
	 */
	async hasSecret(tenantId: string, keyName: string): Promise<boolean> {
		const result = await this.db
			.prepare("SELECT 1 FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?")
			.bind(tenantId, keyName)
			.first();

		return result !== null;
	}

	/**
	 * Delete a secret.
	 */
	async deleteSecret(tenantId: string, keyName: string): Promise<boolean> {
		const result = await this.db
			.prepare("DELETE FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?")
			.bind(tenantId, keyName)
			.run();

		return result.meta.changes > 0;
	}

	/**
	 * List all secret keys for a tenant (not the values).
	 */
	async listSecrets(tenantId: string): Promise<TenantSecret[]> {
		const results = await this.db
			.prepare(
				"SELECT key_name, created_at, updated_at FROM tenant_secrets WHERE tenant_id = ? ORDER BY key_name",
			)
			.bind(tenantId)
			.all<{ key_name: string; created_at: string; updated_at: string }>();

		return results.results.map((r) => ({
			keyName: r.key_name,
			createdAt: r.created_at,
			updatedAt: r.updated_at,
		}));
	}

	/**
	 * Delete all secrets for a tenant.
	 * Call this when deleting a tenant account.
	 */
	async deleteAllSecrets(tenantId: string): Promise<number> {
		const result = await this.db
			.prepare("DELETE FROM tenant_secrets WHERE tenant_id = ?")
			.bind(tenantId)
			.run();

		// Also clear the DEK
		await this.db
			.prepare("UPDATE tenants SET encrypted_dek = NULL WHERE id = ?")
			.bind(tenantId)
			.run();

		this.dekCache.delete(tenantId);

		return result.meta.changes;
	}

	/**
	 * Rotate a tenant's DEK.
	 * Re-encrypts all their secrets with a new DEK.
	 * Use when a tenant's DEK may have been compromised.
	 */
	async rotateTenantDEK(tenantId: string): Promise<{ rotated: number }> {
		// Get current DEK
		const oldDekHex = await this.getTenantDEK(tenantId);

		// Generate new DEK
		const newDekHex = generateDEKHex();

		// Get all secrets for this tenant
		const secrets = await this.db
			.prepare("SELECT key_name, encrypted_value FROM tenant_secrets WHERE tenant_id = ?")
			.bind(tenantId)
			.all<{ key_name: string; encrypted_value: string }>();

		// Re-encrypt each secret
		let rotated = 0;
		for (const secret of secrets.results) {
			try {
				// Decrypt with old DEK
				const plainValue = await decryptToken(secret.encrypted_value, oldDekHex);

				// Encrypt with new DEK
				const newEncrypted = await encryptToken(plainValue, newDekHex);

				// Update in DB
				await this.db
					.prepare(
						"UPDATE tenant_secrets SET encrypted_value = ?, updated_at = datetime('now') WHERE tenant_id = ? AND key_name = ?",
					)
					.bind(newEncrypted, tenantId, secret.key_name)
					.run();

				rotated++;
			} catch (error) {
				console.error(`Failed to rotate secret ${tenantId}/${secret.key_name}:`, error);
				// Continue with other secrets
			}
		}

		// Encrypt and store new DEK
		const encryptedNewDek = await encryptToken(newDekHex, this.kekHex);
		await this.db
			.prepare("UPDATE tenants SET encrypted_dek = ? WHERE id = ?")
			.bind(encryptedNewDek, tenantId)
			.run();

		// Update cache
		this.dekCache.set(tenantId, newDekHex);

		return { rotated };
	}

	/**
	 * Debug helper: Check if a tenant's DEK can be decrypted.
	 * Does not expose the actual DEK.
	 */
	async debugTenantDEK(tenantId: string): Promise<{
		exists: boolean;
		canDecrypt: boolean;
		error?: string;
	}> {
		const result = await this.db
			.prepare("SELECT encrypted_dek FROM tenants WHERE id = ?")
			.bind(tenantId)
			.first<{ encrypted_dek: string | null }>();

		if (!result) {
			return { exists: false, canDecrypt: false, error: "Tenant not found" };
		}

		if (!result.encrypted_dek) {
			return {
				exists: false,
				canDecrypt: false,
				error: "No DEK stored (will be created on first use)",
			};
		}

		try {
			await decryptToken(result.encrypted_dek, this.kekHex);
			return { exists: true, canDecrypt: true };
		} catch (e) {
			return {
				exists: true,
				canDecrypt: false,
				error: e instanceof Error ? e.message : "Decryption failed",
			};
		}
	}
}
````

### 4.2 Create Factory Function

Create `libs/engine/src/lib/server/secrets.ts`:

````typescript
/**
 * Factory and exports for SecretsManager.
 */

import { SecretsManager } from "./secrets-manager";
import type { Env } from "@/types/env";

/**
 * Create a SecretsManager instance from the Worker environment.
 * Call once per request and reuse.
 *
 * @example
 * ```ts
 * const secrets = await createSecretsManager(env);
 * const token = await secrets.getSecret(tenantId, 'github_token');
 * ```
 */
export async function createSecretsManager(env: Env): Promise<SecretsManager> {
	const kek = await env.GROVE_KEK.get();
	return new SecretsManager(env.DB, kek);
}

// Re-export for direct usage
export { SecretsManager } from "./secrets-manager";
export type { TenantSecret } from "./secrets-manager";
````

---

## Phase 5: Integration Examples

### 5.1 API Route for Managing Secrets

```typescript
// Example: src/routes/api/tenants/[tenantId]/secrets/+server.ts

import { createSecretsManager } from "$lib/server/secrets";
import type { RequestHandler } from "./$types";

// List secrets (keys only, not values)
export const GET: RequestHandler = async ({ params, platform }) => {
	const secrets = await createSecretsManager(platform.env);
	const list = await secrets.listSecrets(params.tenantId);

	return new Response(JSON.stringify(list), {
		headers: { "Content-Type": "application/json" },
	});
};

// Create/update a secret
export const PUT: RequestHandler = async ({ params, request, platform }) => {
	const { keyName, value } = await request.json();

	if (!keyName || typeof value !== "string") {
		return new Response("Missing keyName or value", { status: 400 });
	}

	const secrets = await createSecretsManager(platform.env);
	await secrets.setSecret(params.tenantId, keyName, value);

	return new Response(JSON.stringify({ success: true }), {
		headers: { "Content-Type": "application/json" },
	});
};

// Delete a secret
export const DELETE: RequestHandler = async ({ params, request, platform }) => {
	const { keyName } = await request.json();

	const secrets = await createSecretsManager(platform.env);
	const deleted = await secrets.deleteSecret(params.tenantId, keyName);

	return new Response(JSON.stringify({ deleted }), {
		headers: { "Content-Type": "application/json" },
	});
};
```

### 5.2 Using Secrets for External API Calls

```typescript
// Example: Calling GitHub API with stored token

import { createSecretsManager } from "$lib/server/secrets";

export async function fetchGitHubRepos(env: Env, tenantId: string) {
	const secrets = await createSecretsManager(env);
	const token = await secrets.getSecret(tenantId, "github_token");

	if (!token) {
		throw new Error("GitHub token not configured. Please add your token in settings.");
	}

	const response = await fetch("https://api.github.com/user/repos", {
		headers: {
			Authorization: `Bearer ${token}`,
			"User-Agent": "Grove",
			Accept: "application/vnd.github+json",
		},
	});

	if (response.status === 401) {
		throw new Error("GitHub token is invalid or expired. Please update it in settings.");
	}

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	return response.json();
}
```

### 5.3 OpenRouter Example

```typescript
// Example: Using OpenRouter API key

import { createSecretsManager } from "$lib/server/secrets";

export async function callOpenRouter(
	env: Env,
	tenantId: string,
	messages: Array<{ role: string; content: string }>,
) {
	const secrets = await createSecretsManager(env);
	const apiKey = await secrets.getSecret(tenantId, "openrouter_key");

	if (!apiKey) {
		throw new Error("OpenRouter API key not configured");
	}

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "https://grove.place",
		},
		body: JSON.stringify({
			model: "anthropic/claude-3.5-sonnet",
			messages,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenRouter error: ${response.status} - ${error}`);
	}

	return response.json();
}
```

---

## Phase 6: Migration from Current System

If you have existing encrypted tokens using the old single-key system:

### 6.1 Migration Strategy

**Option A: Gradual Migration (Recommended)**

- Keep old `TOKEN_ENCRYPTION_KEY` during transition
- New secrets use envelope encryption
- Migrate old secrets on read (decrypt with old key, re-encrypt with new system)

**Option B: Bulk Migration**

- Run a script to migrate all secrets at once
- Requires downtime or careful coordination

### 6.2 Gradual Migration Helper

Add to SecretsManager:

```typescript
/**
 * Migrate a secret from old single-key encryption to envelope encryption.
 * Call this when reading a secret that might be in the old format.
 *
 * @param oldKeyHex - The old TOKEN_ENCRYPTION_KEY
 */
async migrateSecret(
  tenantId: string,
  keyName: string,
  oldEncryptedValue: string,
  oldKeyHex: string
): Promise<string> {
  // Decrypt with old key
  const plainValue = await decryptToken(oldEncryptedValue, oldKeyHex);

  // Re-encrypt with new envelope system
  await this.setSecret(tenantId, keyName, plainValue);

  return plainValue;
}
```

### 6.3 Bulk Migration Script

```typescript
// scripts/migrate-to-envelope.ts

import { SecretsManager } from "../src/lib/server/secrets-manager";
import { decryptToken } from "../src/lib/server/encryption";

interface OldSecret {
	tenant_id: string;
	key_name: string;
	encrypted_value: string;
}

export async function migrateToEnvelope(
	db: D1Database,
	kekHex: string,
	oldKeyHex: string,
): Promise<{ success: number; failed: number; errors: string[] }> {
	const manager = new SecretsManager(db, kekHex);

	// Fetch all secrets from old table/column
	// Adjust this query based on where your old secrets are stored
	const oldSecrets = await db
		.prepare(
			`
      SELECT tenant_id, key_name, encrypted_value 
      FROM old_secrets_table 
      WHERE encrypted_value IS NOT NULL
    `,
		)
		.all<OldSecret>();

	let success = 0;
	let failed = 0;
	const errors: string[] = [];

	for (const secret of oldSecrets.results) {
		try {
			// Decrypt with old key
			const plainValue = await decryptToken(secret.encrypted_value, oldKeyHex);

			// Re-encrypt with envelope system
			await manager.setSecret(secret.tenant_id, secret.key_name, plainValue);

			success++;
			console.log(`✓ Migrated ${secret.tenant_id}/${secret.key_name}`);
		} catch (error) {
			failed++;
			const msg = `✗ Failed ${secret.tenant_id}/${secret.key_name}: ${error}`;
			errors.push(msg);
			console.error(msg);
		}
	}

	return { success, failed, errors };
}
```

---

## Phase 7: Testing

### 7.1 Unit Tests

```typescript
// src/lib/server/__tests__/secrets-manager.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { SecretsManager } from "../secrets-manager";

// Generate a test KEK
function generateTestKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

describe("SecretsManager", () => {
	let db: D1Database;
	let kekHex: string;

	beforeEach(async () => {
		kekHex = generateTestKey();
		// Set up test database with miniflare or similar
		// Ensure 'tenants' table exists with a test tenant
	});

	it("should store and retrieve secrets", async () => {
		const manager = new SecretsManager(db, kekHex);

		await manager.setSecret("tenant1", "api_key", "sk-test-12345");
		const retrieved = await manager.getSecret("tenant1", "api_key");

		expect(retrieved).toBe("sk-test-12345");
	});

	it("should isolate secrets between tenants", async () => {
		const manager = new SecretsManager(db, kekHex);

		await manager.setSecret("tenant1", "token", "value-for-tenant-1");
		await manager.setSecret("tenant2", "token", "value-for-tenant-2");

		expect(await manager.getSecret("tenant1", "token")).toBe("value-for-tenant-1");
		expect(await manager.getSecret("tenant2", "token")).toBe("value-for-tenant-2");
	});

	it("should return null for non-existent secrets", async () => {
		const manager = new SecretsManager(db, kekHex);

		const result = await manager.getSecret("tenant1", "nonexistent");
		expect(result).toBeNull();
	});

	it("should overwrite existing secrets", async () => {
		const manager = new SecretsManager(db, kekHex);

		await manager.setSecret("tenant1", "key", "old-value");
		await manager.setSecret("tenant1", "key", "new-value");

		expect(await manager.getSecret("tenant1", "key")).toBe("new-value");
	});

	it("should delete secrets", async () => {
		const manager = new SecretsManager(db, kekHex);

		await manager.setSecret("tenant1", "key", "value");
		expect(await manager.hasSecret("tenant1", "key")).toBe(true);

		const deleted = await manager.deleteSecret("tenant1", "key");
		expect(deleted).toBe(true);
		expect(await manager.hasSecret("tenant1", "key")).toBe(false);
	});

	it("should list secret keys without values", async () => {
		const manager = new SecretsManager(db, kekHex);

		await manager.setSecret("tenant1", "github_token", "ghp_xxx");
		await manager.setSecret("tenant1", "openrouter_key", "sk_xxx");

		const list = await manager.listSecrets("tenant1");

		expect(list.map((s) => s.keyName)).toContain("github_token");
		expect(list.map((s) => s.keyName)).toContain("openrouter_key");
		// Values should not be included
		expect(list.some((s) => "value" in s)).toBe(false);
	});

	it("should handle special characters in values", async () => {
		const manager = new SecretsManager(db, kekHex);

		const testCases = [
			"simple-token",
			"token with spaces",
			"token\nwith\nnewlines",
			'{"json": "value", "nested": {"key": 123}}',
			"émojis 🔐 and ünïcödé",
			"a".repeat(10000), // long value
		];

		for (const value of testCases) {
			await manager.setSecret("tenant1", "test", value);
			const retrieved = await manager.getSecret("tenant1", "test");
			expect(retrieved).toBe(value);
		}
	});

	it("should fail with invalid KEK", () => {
		expect(() => new SecretsManager(db, "too-short")).toThrow();
		expect(() => new SecretsManager(db, "x".repeat(64))).toThrow(); // non-hex
	});

	it("should rotate DEK successfully", async () => {
		const manager = new SecretsManager(db, kekHex);

		// Store some secrets
		await manager.setSecret("tenant1", "key1", "value1");
		await manager.setSecret("tenant1", "key2", "value2");

		// Rotate
		const result = await manager.rotateTenantDEK("tenant1");
		expect(result.rotated).toBe(2);

		// Verify secrets still accessible
		expect(await manager.getSecret("tenant1", "key1")).toBe("value1");
		expect(await manager.getSecret("tenant1", "key2")).toBe("value2");
	});
});
```

---

## Security Checklist

### Before Deployment

- [ ] KEK generated with `openssl rand -hex 32` or equivalent
- [ ] KEK stored ONLY in Cloudflare Secrets Store
- [ ] KEK is NOT in any config files, logs, or version control
- [ ] Old `TOKEN_ENCRYPTION_KEY` scheduled for removal after migration
- [ ] Tests pass for encrypt/decrypt round-trips
- [ ] Tests pass for tenant isolation

### Ongoing Operations

- [ ] Monitor for decryption failures (may indicate key issues)
- [ ] Rotate KEK annually or after suspected compromise
- [ ] Have a documented process for KEK rotation
- [ ] Audit Secrets Store access via Cloudflare dashboard

---

## Troubleshooting

### "KEK must be 64 hex characters"

**Cause:** Secrets Store returned invalid value.

**Debug:**

```typescript
const kek = await env.GROVE_KEK.get();
console.log("KEK length:", kek.length);
console.log("KEK is hex:", /^[0-9a-fA-F]+$/.test(kek));
```

**Fix:** Re-create the secret with a proper 64-char hex value.

### "Tenant not found"

**Cause:** Trying to access secrets for non-existent tenant.

**Fix:** Ensure tenant exists in `tenants` table before calling SecretsManager.

### Decryption works locally but fails in production

**Cause:** Different KEK in each environment (this is actually correct!).

**Note:** Each environment should have its own KEK. Data encrypted in staging cannot be decrypted in production. This is a security feature.

### Old secrets can't be decrypted after migration

**Cause:** Old secrets use `TOKEN_ENCRYPTION_KEY`, new system uses envelope encryption.

**Fix:** Run migration script or implement gradual migration.

---

## File Summary

| File                                        | Purpose                                       |
| ------------------------------------------- | --------------------------------------------- |
| `src/lib/server/encryption.ts`              | **Existing** - Keep as-is, add debug function |
| `src/lib/server/secrets-manager.ts`         | **New** - SecretsManager class                |
| `src/lib/server/secrets.ts`                 | **New** - Factory function and exports        |
| `migrations/XXXX_add_encrypted_dek.sql`     | **New** - DEK column                          |
| `migrations/XXXX_create_tenant_secrets.sql` | **New** - Secrets table                       |
| `wrangler.toml`                             | **Update** - Add Secrets Store binding        |
| `src/types/env.ts`                          | **Update** - Add GROVE_KEK type               |

---

## Quick Reference

```typescript
// Create manager (once per request)
const secrets = await createSecretsManager(env);

// Store a secret
await secrets.setSecret(tenantId, "github_token", "ghp_xxx");

// Get a secret (throws on error)
const token = await secrets.getSecret(tenantId, "github_token");

// Get a secret (returns null on error)
const token = await secrets.safeGetSecret(tenantId, "github_token");

// Check if secret exists
const exists = await secrets.hasSecret(tenantId, "github_token");

// List all secret keys for a tenant
const keys = await secrets.listSecrets(tenantId);

// Delete a secret
await secrets.deleteSecret(tenantId, "github_token");

// Delete all secrets (on account deletion)
await secrets.deleteAllSecrets(tenantId);

// Rotate tenant's DEK (after potential compromise)
await secrets.rotateTenantDEK(tenantId);

// Debug DEK status
const status = await secrets.debugTenantDEK(tenantId);
```
