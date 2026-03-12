import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the encryption module
vi.mock("./encryption", () => ({
	encryptToken: vi.fn().mockResolvedValue("v1:mockiv:mockciphertext"),
	decryptToken: vi.fn().mockResolvedValue("decrypted-value"),
	isEncryptedToken: vi.fn().mockReturnValue(true),
}));

import { SecretsManager, createSecretsManager } from "./secrets-manager";
import { encryptToken, decryptToken, isEncryptedToken } from "./encryption";

const VALID_KEK = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const INVALID_KEK_SHORT = "0123456789abcdef";
const INVALID_KEK_NON_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg";

/**
 * Creates a mock D1Database with separate statement tracking per prepare() call.
 * Each prepare() call returns a fresh statement mock so sequential DB queries
 * return different values.
 */
function createMockDb(firstResponses: Array<unknown>) {
	let callIndex = 0;
	const runMock = vi.fn().mockResolvedValue({ success: true });
	const db = {
		prepare: vi.fn().mockImplementation(() => {
			const responseIndex = callIndex++;
			const response = firstResponses[responseIndex] ?? null;
			return {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValue(response),
				run: runMock,
			};
		}),
		_run: runMock,
	};
	return db as any;
}

describe("SecretsManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Re-establish defaults after clearAllMocks
		vi.mocked(isEncryptedToken).mockReturnValue(true);
		vi.mocked(decryptToken).mockResolvedValue("decrypted-value");
		vi.mocked(encryptToken).mockResolvedValue("v1:mockiv:mockciphertext");
	});

	describe("constructor", () => {
		it("throws on short KEK", () => {
			expect(() => new SecretsManager({} as any, INVALID_KEK_SHORT)).toThrow(
				"KEK must be 64 hex characters",
			);
		});

		it("throws on non-hex KEK", () => {
			expect(() => new SecretsManager({} as any, INVALID_KEK_NON_HEX)).toThrow(
				"KEK must be 64 hex characters",
			);
		});

		it("throws on too-long KEK", () => {
			expect(() => new SecretsManager({} as any, VALID_KEK + "00")).toThrow(
				"KEK must be 64 hex characters",
			);
		});

		it("succeeds with valid lowercase hex KEK", () => {
			expect(() => new SecretsManager({} as any, VALID_KEK)).not.toThrow();
		});

		it("succeeds with valid mixed-case hex KEK", () => {
			const mixedKek = "0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789ABCDEF";
			expect(() => new SecretsManager({} as any, mixedKek)).not.toThrow();
		});
	});

	describe("getTenantDEK", () => {
		it("decrypts and returns existing DEK", async () => {
			const db = createMockDb([{ encrypted_dek: "v1:iv:encrypted_dek" }]);
			vi.mocked(decryptToken).mockResolvedValue("my_dek_hex");

			const sm = new SecretsManager(db, VALID_KEK);
			const dek = await sm.getTenantDEK("tenant_123");

			expect(dek).toBe("my_dek_hex");
			expect(decryptToken).toHaveBeenCalledWith("v1:iv:encrypted_dek", VALID_KEK);
		});

		it("generates new DEK when encrypted_dek is null", async () => {
			const db = createMockDb([{ encrypted_dek: null }]);
			vi.mocked(isEncryptedToken).mockReturnValue(false);

			const sm = new SecretsManager(db, VALID_KEK);
			const dek = await sm.getTenantDEK("tenant_456");

			// Should be a random 64-char hex string
			expect(dek).toMatch(/^[0-9a-f]{64}$/);
			// Should encrypt and store the new DEK
			expect(encryptToken).toHaveBeenCalledWith(dek, VALID_KEK);
			expect(db._run).toHaveBeenCalled();
		});

		it("caches DEK — second call skips DB", async () => {
			const db = createMockDb([{ encrypted_dek: "v1:iv:enc" }]);
			vi.mocked(decryptToken).mockResolvedValue("cached_dek");

			const sm = new SecretsManager(db, VALID_KEK);
			const dek1 = await sm.getTenantDEK("tenant_789");
			const prepareCallsBefore = db.prepare.mock.calls.length;

			const dek2 = await sm.getTenantDEK("tenant_789");

			expect(dek1).toBe("cached_dek");
			expect(dek2).toBe("cached_dek");
			expect(db.prepare.mock.calls.length).toBe(prepareCallsBefore); // No new DB call
		});

		it("throws when tenant not found", async () => {
			const db = createMockDb([null]); // first() returns null
			const sm = new SecretsManager(db, VALID_KEK);

			await expect(sm.getTenantDEK("nonexistent")).rejects.toThrow("Tenant not found: nonexistent");
		});

		it("handles different tenants separately in cache", async () => {
			// Two prepare() calls, each returning a tenant with encrypted_dek
			const db = createMockDb([{ encrypted_dek: "v1:iv:dek_a" }, { encrypted_dek: "v1:iv:dek_b" }]);
			vi.mocked(decryptToken)
				.mockResolvedValueOnce("dek_tenant_a")
				.mockResolvedValueOnce("dek_tenant_b");

			const sm = new SecretsManager(db, VALID_KEK);
			const dekA = await sm.getTenantDEK("tenant_a");
			const dekB = await sm.getTenantDEK("tenant_b");

			expect(dekA).toBe("dek_tenant_a");
			expect(dekB).toBe("dek_tenant_b");
		});
	});

	describe("getSecret", () => {
		it("decrypts and returns existing secret", async () => {
			// Call 1: getTenantDEK query, Call 2: getSecret query
			const db = createMockDb([
				{ encrypted_dek: "v1:iv:dek" },
				{ encrypted_value: "v1:iv:secret" },
			]);
			vi.mocked(decryptToken)
				.mockResolvedValueOnce("my_dek_hex") // DEK decryption
				.mockResolvedValueOnce("my_secret_value"); // Secret decryption

			const sm = new SecretsManager(db, VALID_KEK);
			const secret = await sm.getSecret("tenant_123", "github_token");

			expect(secret).toBe("my_secret_value");
		});

		it("returns null when secret not found", async () => {
			const db = createMockDb([
				{ encrypted_dek: "v1:iv:dek" },
				null, // No secret row
			]);
			vi.mocked(decryptToken).mockResolvedValueOnce("dek_hex");

			const sm = new SecretsManager(db, VALID_KEK);
			const secret = await sm.getSecret("tenant_456", "missing_key");

			expect(secret).toBeNull();
		});

		it("passes DEK (not KEK) to decrypt the secret", async () => {
			const db = createMockDb([
				{ encrypted_dek: "v1:iv:dek" },
				{ encrypted_value: "v1:iv:secret_enc" },
			]);
			vi.mocked(decryptToken).mockResolvedValueOnce("the_dek").mockResolvedValueOnce("plaintext");

			const sm = new SecretsManager(db, VALID_KEK);
			await sm.getSecret("t1", "key1");

			// First decrypt: DEK with KEK
			expect(decryptToken).toHaveBeenNthCalledWith(1, "v1:iv:dek", VALID_KEK);
			// Second decrypt: secret with DEK
			expect(decryptToken).toHaveBeenNthCalledWith(2, "v1:iv:secret_enc", "the_dek");
		});

		it("throws if tenant not found (propagates from getTenantDEK)", async () => {
			const db = createMockDb([null]);
			const sm = new SecretsManager(db, VALID_KEK);

			await expect(sm.getSecret("nonexistent", "any_key")).rejects.toThrow("Tenant not found");
		});

		it("throws if secret decryption fails", async () => {
			const db = createMockDb([
				{ encrypted_dek: "v1:iv:dek" },
				{ encrypted_value: "v1:corrupted:data" },
			]);
			vi.mocked(decryptToken)
				.mockResolvedValueOnce("dek_value")
				.mockRejectedValueOnce(new Error("Decryption failed"));

			const sm = new SecretsManager(db, VALID_KEK);

			await expect(sm.getSecret("tenant_bad", "key")).rejects.toThrow("Decryption failed");
		});
	});

	describe("safeGetSecret", () => {
		it("returns decrypted secret on success", async () => {
			const db = createMockDb([
				{ encrypted_dek: "v1:iv:dek" },
				{ encrypted_value: "v1:iv:secret" },
			]);
			vi.mocked(decryptToken).mockResolvedValueOnce("dek").mockResolvedValueOnce("safe_secret");

			const sm = new SecretsManager(db, VALID_KEK);
			const secret = await sm.safeGetSecret("tenant_safe", "key");

			expect(secret).toBe("safe_secret");
		});

		it("returns null when tenant not found", async () => {
			const db = createMockDb([null]);
			const sm = new SecretsManager(db, VALID_KEK);

			const secret = await sm.safeGetSecret("nonexistent", "key");
			expect(secret).toBeNull();
		});

		it("returns null when secret not found", async () => {
			const db = createMockDb([{ encrypted_dek: "v1:iv:dek" }, null]);
			vi.mocked(decryptToken).mockResolvedValueOnce("dek");

			const sm = new SecretsManager(db, VALID_KEK);
			const secret = await sm.safeGetSecret("t1", "missing");

			expect(secret).toBeNull();
		});

		it("returns null on decryption failure", async () => {
			const db = createMockDb([{ encrypted_dek: "v1:iv:dek" }, { encrypted_value: "v1:iv:bad" }]);
			vi.mocked(decryptToken)
				.mockResolvedValueOnce("dek")
				.mockRejectedValueOnce(new Error("Corrupt"));

			const sm = new SecretsManager(db, VALID_KEK);
			const secret = await sm.safeGetSecret("tenant_bad", "key");

			expect(secret).toBeNull();
		});
	});
});

describe("createSecretsManager", () => {
	it("returns null for undefined KEK", () => {
		expect(createSecretsManager({} as any, undefined)).toBeNull();
	});

	it("returns null for empty KEK", () => {
		expect(createSecretsManager({} as any, "")).toBeNull();
	});

	it("returns null for invalid KEK (catches constructor throw)", () => {
		expect(createSecretsManager({} as any, INVALID_KEK_SHORT)).toBeNull();
	});

	it("returns SecretsManager for valid KEK", () => {
		const sm = createSecretsManager({} as any, VALID_KEK);
		expect(sm).toBeInstanceOf(SecretsManager);
	});

	it("returns functional instance that can getTenantDEK", async () => {
		const db = createMockDb([{ encrypted_dek: "v1:iv:dek" }]);
		vi.mocked(isEncryptedToken).mockReturnValue(true);
		vi.mocked(decryptToken).mockResolvedValue("dek_value");

		const sm = createSecretsManager(db, VALID_KEK);
		expect(sm).not.toBeNull();

		const dek = await sm!.getTenantDEK("tenant_test");
		expect(dek).toBe("dek_value");
	});
});
