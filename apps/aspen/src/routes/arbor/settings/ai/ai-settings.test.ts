/**
 * AI settings — the one key (#1801).
 *
 * What is worth asserting here is the contract, not the markup: the canonical
 * name is the one written, a key is never echoed back, Remove really removes both
 * names, and a bad paste is refused before it becomes a provider 401 in some
 * feature three screens away.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { setSecretMock, deleteSecretMock, hasSecretMock, createSecretsManagerMock } = vi.hoisted(
	() => ({
		setSecretMock: vi.fn(),
		deleteSecretMock: vi.fn(),
		hasSecretMock: vi.fn(),
		createSecretsManagerMock: vi.fn(),
	}),
);

vi.mock("@autumnsgrove/lattice/server/secrets", () => ({
	createSecretsManager: createSecretsManagerMock,
}));

import { load, actions } from "./+page.server";

const KEK = "a".repeat(64);

/** `load` is typed as `void | PageData` because a route may write its own response. */
type AiPageData = { keySource?: "settings" | "timeline"; kekConfigured: boolean };

async function runLoad(context: unknown): Promise<AiPageData> {
	return (await load(context as never)) as AiPageData;
}

function env(overrides: Record<string, unknown> = {}) {
	return {
		env: { DB: {}, GROVE_KEK: KEK, ...overrides },
	} as never;
}

function post(fields: Record<string, string>) {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) body.set(name, value);
	return new Request("https://autumn.grove.place/arbor/settings/ai", { method: "POST", body });
}

function ctx(fields: Record<string, string>, options: { signedIn?: boolean; env?: unknown } = {}) {
	return {
		request: post(fields),
		platform: options.env ?? env(),
		locals: {
			user: options.signedIn === false ? null : { id: "user_1" },
			tenantId: "tenant-1",
		},
	} as never;
}

beforeEach(() => {
	vi.clearAllMocks();
	createSecretsManagerMock.mockResolvedValue({
		setSecret: setSecretMock,
		deleteSecret: deleteSecretMock,
		hasSecret: hasSecretMock,
	});
	hasSecretMock.mockResolvedValue(false);
});

describe("load", () => {
	it("AI01 reports where the key lives without reading it", async () => {
		hasSecretMock.mockImplementation(async (_tenant: string, name: string) => {
			return name === "openrouter_api_key";
		});

		const data = await runLoad(ctx({}));

		expect(data).toMatchObject({ keySource: "settings", kekConfigured: true });
		expect(hasSecretMock).toHaveBeenCalledWith("tenant-1", "openrouter_api_key");
	});

	it("AI02 says 'timeline' when only the legacy name answers, so the page can explain why", async () => {
		hasSecretMock.mockImplementation(async (_tenant: string, name: string) => {
			return name === "timeline_openrouter_key";
		});

		const data = await runLoad(ctx({}));

		expect(data.keySource).toBe("timeline");
	});

	it("AI03 still renders when the deployment cannot hold secrets", async () => {
		const data = await runLoad(ctx({}, { env: { env: { DB: {} } } }));

		expect(data).toMatchObject({ keySource: undefined, kekConfigured: false });
	});
});

describe("save", () => {
	it("AI04 writes the canonical name, trimmed, and never echoes the key", async () => {
		const result = await actions.save(ctx({ openrouterKey: "  sk-or-v1-abc123\n" }) as never);

		expect(setSecretMock).toHaveBeenCalledWith("tenant-1", "openrouter_api_key", "sk-or-v1-abc123");
		expect(JSON.stringify(result)).not.toContain("sk-or-v1-abc123");
		expect(result).toMatchObject({ success: expect.stringContaining("Saved") });
	});

	it("AI05 refuses an empty field without touching storage", async () => {
		const result = await actions.save(ctx({ openrouterKey: "   " }) as never);

		expect(result).toMatchObject({ status: 400 });
		expect(setSecretMock).not.toHaveBeenCalled();
	});

	it("AI06 refuses a token that is not an OpenRouter key, before it becomes a 401", async () => {
		// The commonest mistake is pasting a GitHub token here. Catching it now is
		// cheaper than finding out when a timeline run fails.
		const result = await actions.save(ctx({ openrouterKey: "ghp_abc" }) as never);

		expect(result).toMatchObject({ status: 400 });
		expect(setSecretMock).not.toHaveBeenCalled();
	});

	it("AI07 refuses an unauthenticated save", async () => {
		const result = await actions.save(
			ctx({ openrouterKey: "sk-or-v1-abc" }, { signedIn: false }) as never,
		);

		expect(result).toMatchObject({ status: 403 });
		expect(setSecretMock).not.toHaveBeenCalled();
	});

	it("AI08 says the key was not saved when encryption is unavailable", async () => {
		const result = await actions.save(
			ctx({ openrouterKey: "sk-or-v1-abc" }, { env: { env: { DB: {} } } }) as never,
		);

		expect(result).toMatchObject({ status: 500 });
		expect(setSecretMock).not.toHaveBeenCalled();
	});
});

describe("remove", () => {
	it("AI09 removes both names, so 'there is one key' is true on the way out", async () => {
		const result = await actions.remove(ctx({}) as never);

		expect(deleteSecretMock).toHaveBeenCalledWith("tenant-1", "openrouter_api_key");
		expect(deleteSecretMock).toHaveBeenCalledWith("tenant-1", "timeline_openrouter_key");
		expect(result).toMatchObject({ success: expect.stringContaining("Removed") });
	});

	it("AI10 refuses an unauthenticated remove", async () => {
		const result = await actions.remove(ctx({}, { signedIn: false }) as never);

		expect(result).toMatchObject({ status: 403 });
		expect(deleteSecretMock).not.toHaveBeenCalled();
	});
});
