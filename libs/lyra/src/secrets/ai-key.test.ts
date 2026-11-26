import { describe, expect, it, vi } from "vitest";
import {
	AI_SECRETS,
	hasOpenRouterKey,
	MISSING_AI_KEY_MESSAGE,
	resolveOpenRouterKey,
	type SecretPresenceReader,
	type SecretReader,
} from "./ai-key.js";

/** A reader over a fixed map, which records what it was asked for. */
function readerOf(secrets: Record<string, string | undefined>) {
	const asked: string[] = [];
	const read: SecretReader = async (name) => {
		asked.push(name);
		return secrets[name];
	};
	return { read, asked };
}

describe("AI_SECRETS", () => {
	it("KEY01 names the canonical key the way Warden does, and keeps the timeline's name", () => {
		// The two names are load-bearing: Warden's alias chain spells them the same
		// way, and the timeline's save-token route dual-writes the canonical one.
		expect(AI_SECRETS.openRouterKey).toBe("openrouter_api_key");
		expect(AI_SECRETS.legacyOpenRouterKey).toBe("timeline_openrouter_key");
	});
});

describe("resolveOpenRouterKey", () => {
	it("KEY02 prefers the key set in Settings, and does not touch the legacy name", async () => {
		const { read, asked } = readerOf({
			openrouter_api_key: "sk-or-v1-settings",
			timeline_openrouter_key: "sk-or-v1-timeline",
		});

		expect(await resolveOpenRouterKey(read)).toEqual({
			key: "sk-or-v1-settings",
			source: "settings",
		});
		expect(asked).toEqual(["openrouter_api_key"]);
	});

	it("KEY03 falls back to the timeline's key, so nothing has to be rotated to ship this", async () => {
		const { read, asked } = readerOf({ timeline_openrouter_key: "sk-or-v1-timeline" });

		expect(await resolveOpenRouterKey(read)).toEqual({
			key: "sk-or-v1-timeline",
			source: "timeline",
		});
		expect(asked).toEqual(["openrouter_api_key", "timeline_openrouter_key"]);
	});

	it("KEY04 answers absent when neither name holds a key", async () => {
		const { read } = readerOf({});

		expect(await resolveOpenRouterKey(read)).toBeUndefined();
	});

	it("KEY05 treats an empty or whitespace-only value as not set", async () => {
		// `setSecret` will store "", and a key of one space must fail loudly as
		// "not set" rather than quietly as a provider 401.
		const blank = readerOf({ openrouter_api_key: "   " });
		expect(await resolveOpenRouterKey(blank.read)).toBeUndefined();

		const empty = readerOf({ openrouter_api_key: "", timeline_openrouter_key: "sk-or-v1-t" });
		expect(await resolveOpenRouterKey(empty.read)).toEqual({
			key: "sk-or-v1-t",
			source: "timeline",
		});
	});

	it("KEY06 trims a key that was pasted with a newline", async () => {
		const { read } = readerOf({ openrouter_api_key: "  sk-or-v1-pasted\n" });

		expect(await resolveOpenRouterKey(read)).toEqual({
			key: "sk-or-v1-pasted",
			source: "settings",
		});
	});

	it("KEY07 asks each name once, in order, and never more than the two", async () => {
		const calls: string[] = [];
		const read: SecretReader = vi.fn(async (name: string) => {
			calls.push(name);
			return undefined;
		});

		await resolveOpenRouterKey(read);

		expect(calls).toEqual(["openrouter_api_key", "timeline_openrouter_key"]);
	});

	it("KEY08 says where to fix a missing key, not just that it is missing", () => {
		// #1801's acceptance: the failure names Settings, so it is a ten-second fix
		// rather than a support request.
		expect(MISSING_AI_KEY_MESSAGE).toContain("Settings");
	});
});

describe("hasOpenRouterKey", () => {
	/** A presence reader over a fixed set, which records what it was asked. */
	function presenceOf(present: string[]) {
		const asked: string[] = [];
		const has: SecretPresenceReader = async (name) => {
			asked.push(name);
			return present.includes(name);
		};
		return { has, asked };
	}

	it("KEY09 answers which name holds the key, canonical first", async () => {
		const both = presenceOf(["openrouter_api_key", "timeline_openrouter_key"]);
		expect(await hasOpenRouterKey(both.has)).toBe("settings");
		expect(both.asked).toEqual(["openrouter_api_key"]);

		const legacy = presenceOf(["timeline_openrouter_key"]);
		expect(await hasOpenRouterKey(legacy.has)).toBe("timeline");

		const none = presenceOf([]);
		expect(await hasOpenRouterKey(none.has)).toBeUndefined();
	});

	it("KEY10 asks only which name is present, and never for the value", async () => {
		// The page that calls this can say "saved" and nothing more. The reader's
		// contract is a boolean, so there is no plaintext to leak even by accident.
		const read: SecretPresenceReader = vi.fn<(name: string) => Promise<boolean>>(async () => true);
		await hasOpenRouterKey(read);

		expect(read).toHaveBeenCalledTimes(1);
		expect(read).toHaveBeenCalledWith("openrouter_api_key");
	});
});
