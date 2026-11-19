import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * These assert the contract the app depends on: one store, no fallback, and a
 * refusal rather than a downgrade when the key encryption key is missing.
 *
 * The previous test file for this behaviour lived in `apps/aspen` and mirrored
 * the route's token logic line for line, so it verified a copy of the code
 * against the legacy `TOKEN_ENCRYPTION_KEY` path that #1475 removed.
 */

const store = new Map<string, string>();

vi.mock("@autumnsgrove/grove-crypto/secrets", () => ({
	createSecretsManager: vi.fn(async () => ({
		safeGetSecret: async (tenantId: string, key: string) => store.get(`${tenantId}:${key}`) ?? null,
		setSecret: async (tenantId: string, key: string, value: string) => {
			store.set(`${tenantId}:${key}`, value);
		},
		hasSecret: async (tenantId: string, key: string) => store.has(`${tenantId}:${key}`),
		deleteSecret: async (tenantId: string, key: string) => store.delete(`${tenantId}:${key}`),
	})),
}));

import {
	deleteTimelineToken,
	getTimelineToken,
	hasTimelineToken,
	setTimelineToken,
	TIMELINE_SECRET_KEYS,
} from "./secrets.server";

const KEK = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const TENANT = "tenant-1";

function env(kek: string | undefined): { DB: D1Database; GROVE_KEK?: string } {
	return { DB: {} as D1Database, GROVE_KEK: kek };
}

const withKey = (): { DB: D1Database; GROVE_KEK?: string } => env(KEK);

describe("timeline secrets", () => {
	beforeEach(() => {
		store.clear();
	});

	it("round-trips a token through SecretsManager", async () => {
		const saved = await setTimelineToken(
			withKey(),
			TENANT,
			TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
			"ghp_x",
		);
		expect(saved.system).toBe("secrets_manager");

		const read = await getTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN);
		expect(read).toEqual({ token: "ghp_x", source: "secrets_manager" });
	});

	it("reports a missing token as none, not as an error", async () => {
		const read = await getTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.OPENROUTER_KEY);
		expect(read).toEqual({ token: null, source: "none" });
	});

	it("refuses to save when the key encryption key is missing", async () => {
		await expect(
			setTimelineToken(env(undefined), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN, "ghp_x"),
		).rejects.toThrow(/GROVE_KEK/);
	});

	it("does not throw on read when the key encryption key is missing", async () => {
		const read = await getTimelineToken(env(undefined), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN);
		expect(read).toEqual({ token: null, source: "none" });
	});

	it("knows whether a token is stored", async () => {
		expect(await hasTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN)).toBe(
			false,
		);

		await setTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN, "ghp_x");
		expect(await hasTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN)).toBe(true);
	});

	it("deletes a stored token", async () => {
		await setTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN, "ghp_x");

		expect(await deleteTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN)).toBe(
			true,
		);
		expect(await getTimelineToken(withKey(), TENANT, TIMELINE_SECRET_KEYS.GITHUB_TOKEN)).toEqual({
			token: null,
			source: "none",
		});
	});

	it("keeps tenants apart", async () => {
		await setTimelineToken(withKey(), "tenant-a", TIMELINE_SECRET_KEYS.GITHUB_TOKEN, "ghp_a");

		const other = await getTimelineToken(withKey(), "tenant-b", TIMELINE_SECRET_KEYS.GITHUB_TOKEN);
		expect(other.token).toBeNull();
	});
});
