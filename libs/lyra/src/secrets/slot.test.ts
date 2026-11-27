import { describe, expect, it } from "vitest";
import { createTenantSecretsSlot, TIMELINE_SECRETS } from "./slot.js";

const KEK = "a".repeat(64);
const TENANT = "tenant-1";

/**
 * Just enough D1 to answer the two questions `SecretsManager` asks: a tenant's
 * encrypted data key, and one named secret. Everything else is a real decrypt
 * through the real encryption helpers, so the test would catch a format change.
 */
class FakeD1 {
	readonly tenants = new Map<string, { encrypted_dek: string | null }>();
	readonly secrets = new Map<string, string>();

	prepare(sql: string) {
		const db = this;
		return {
			bind(...args: unknown[]) {
				return {
					async first<T>(): Promise<T | null> {
						if (sql.includes("encrypted_dek FROM tenants")) {
							const row = db.tenants.get(String(args[0]));
							return (row as T) ?? null;
						}
						if (sql.includes("encrypted_value FROM tenant_secrets")) {
							const value = db.secrets.get(`${args[0]}/${args[1]}`);
							return (value === undefined ? null : { encrypted_value: value }) as T | null;
						}
						return null;
					},
					async run() {
						return { meta: { changes: 1 } };
					},
				};
			},
		};
	}
}

/** Seed a tenant the way the real table holds one: a KEK-wrapped data key. */
async function seeded(): Promise<{ db: FakeD1; dek: string }> {
	const { encryptToken } = await import("@autumnsgrove/grove-crypto/encryption");
	// A 32-byte data key, hex, the shape generateDEKHex produces.
	const dek = Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[i % 16]).join("");
	const db = new FakeD1();
	db.tenants.set(TENANT, { encrypted_dek: await encryptToken(dek, KEK) });
	return { db, dek };
}

async function store(db: FakeD1, dek: string, name: string, value: string): Promise<void> {
	const { encryptToken } = await import("@autumnsgrove/grove-crypto/encryption");
	db.secrets.set(`${TENANT}/${name}`, await encryptToken(value, dek));
}

describe("createTenantSecretsSlot", () => {
	it("SEC01 answers with the tenant's own secret", async () => {
		const { db, dek } = await seeded();
		await store(db, dek, TIMELINE_SECRETS.githubToken, "ghp_live_token");

		const slot = createTenantSecretsSlot({
			db: db as unknown as D1Database,
			kek: KEK,
			tenantId: TENANT,
		});
		expect(await slot.get(TIMELINE_SECRETS.githubToken)).toBe("ghp_live_token");
	});

	it("SEC02 a name that is not held is undefined, not an error", async () => {
		const { db } = await seeded();
		const slot = createTenantSecretsSlot({
			db: db as unknown as D1Database,
			kek: KEK,
			tenantId: TENANT,
		});

		expect(await slot.get("timeline_github_token")).toBeUndefined();
	});

	it("SEC03 a tenant that does not exist answers undefined rather than throwing", async () => {
		const { db } = await seeded();
		const slot = createTenantSecretsSlot({
			db: db as unknown as D1Database,
			kek: KEK,
			tenantId: "nobody",
		});

		await expect(slot.get("timeline_github_token")).resolves.toBeUndefined();
	});

	it("SEC04 a prefix keeps one feature's names away from another's", async () => {
		const { db, dek } = await seeded();
		await store(db, dek, "timeline_github_token", "ghp_prefixed");
		await store(db, dek, "github_token", "ghp_bare");

		const prefixed = createTenantSecretsSlot({
			db: db as unknown as D1Database,
			kek: KEK,
			tenantId: TENANT,
			prefix: "timeline_",
		});

		expect(await prefixed.get("github_token")).toBe("ghp_prefixed");
		expect(await prefixed.get("timeline_github_token")).toBeUndefined();
	});

	it("SEC05 an empty stored value reads as nothing held", async () => {
		const { db, dek } = await seeded();
		await store(db, dek, "timeline_openrouter_key", "");

		const slot = createTenantSecretsSlot({
			db: db as unknown as D1Database,
			kek: KEK,
			tenantId: TENANT,
		});
		expect(await slot.get("timeline_openrouter_key")).toBeUndefined();
	});

	it("SEC06 the names are the ones the timeline already writes", () => {
		// workers/timeline-sync/src/generator.ts reads both of these from
		// tenant_secrets; a rename here without one there would break the worker.
		expect(TIMELINE_SECRETS).toEqual({
			githubToken: "timeline_github_token",
			openRouterKey: "timeline_openrouter_key",
		});
	});
});
