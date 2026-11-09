import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@autumnsgrove/lattice/services/short-links", () => ({
	listLinks: vi.fn(),
	createCustomLink: vi.fn(),
	disableLink: vi.fn(),
}));

import {
	listLinks,
	createCustomLink,
	disableLink,
} from "@autumnsgrove/lattice/services/short-links";
import { WAYFINDER_EMAILS } from "@autumnsgrove/lattice/platform/config";
import { LINK_ERRORS } from "@autumnsgrove/lattice/errors";
import { load, actions } from "./+page.server";

const list = vi.mocked(listLinks);
const create = vi.mocked(createCustomLink);
const disable = vi.mocked(disableLink);

const DB = {} as D1Database;
const wayfinder = { email: WAYFINDER_EMAILS[0] };
const stranger = { email: "someone@example.com" };

function formRequest(fields: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) body.set(key, value);
	return new Request("https://grove.place/arbor/links", { method: "POST", body });
}

function event(opts: { user?: object | null; fields?: Record<string, string>; db?: boolean }) {
	return {
		request: formRequest(opts.fields ?? {}),
		locals: { user: opts.user === undefined ? wayfinder : opts.user },
		platform: { env: opts.db === false ? {} : { DB } },
	} as never;
}

const run = (name: "createLink" | "disableLink", e: ReturnType<typeof event>) =>
	(actions[name] as (e: never) => Promise<unknown>)(e);

beforeEach(() => {
	vi.resetAllMocks();
});

describe("load", () => {
	const loadEvent = (isWayfinder: boolean, db = true) =>
		({
			parent: async () => ({ isWayfinder }),
			platform: { env: db ? { DB } : {} },
		}) as never;

	it("lists the Wayfinder's own links", async () => {
		list.mockResolvedValue([]);
		await expect(load(loadEvent(true))).resolves.toEqual({ links: [] });
		expect(list).toHaveBeenCalledWith(DB, { type: "wayfinder" });
	});

	it("turns everyone else away", async () => {
		await expect(load(loadEvent(false))).rejects.toMatchObject({ status: 403 });
		expect(list).not.toHaveBeenCalled();
	});

	it("reports a missing database", async () => {
		await expect(load(loadEvent(true, false))).rejects.toMatchObject({ status: 500 });
	});
});

describe("createLink", () => {
	it("makes a link owned by no grove and says where it lives", async () => {
		create.mockResolvedValue({
			ok: true,
			value: { slug: "docs", shortUrl: "https://link.grove.place/docs" },
		});
		const result = await run(
			"createLink",
			event({ fields: { target_url: "https://example.com/docs", slug: "docs" } }),
		);

		expect(create).toHaveBeenCalledWith(
			DB,
			{ type: "wayfinder" },
			{ targetUrl: "https://example.com/docs", slug: "docs" },
		);
		expect(result).toEqual({
			success: true,
			message: "Your short link is ready: link.grove.place/docs",
		});
	});

	it("lets the service pick a slug when none is typed", async () => {
		create.mockResolvedValue({
			ok: true,
			value: { slug: "k7m2xq", shortUrl: "https://link.grove.place/k7m2xq" },
		});
		await run("createLink", event({ fields: { target_url: "https://example.com", slug: "  " } }));
		expect(create.mock.calls[0][2]).toEqual({ targetUrl: "https://example.com", slug: null });
	});

	it("passes the service's friendly message through when it refuses", async () => {
		create.mockResolvedValue({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
		const result = await run(
			"createLink",
			event({ fields: { target_url: "https://example.com", slug: "taken" } }),
		);
		expect(result).toMatchObject({
			status: 400,
			data: {
				error: LINK_ERRORS.SLUG_TAKEN.userMessage,
				values: { target_url: "https://example.com", slug: "taken" },
			},
		});
	});

	it("asks for a destination", async () => {
		const result = await run("createLink", event({ fields: { target_url: "  " } }));
		expect(result).toMatchObject({ status: 400 });
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses people who aren't signed in or aren't the Wayfinder", async () => {
		const fields = { target_url: "https://example.com" };
		expect(await run("createLink", event({ user: null, fields }))).toMatchObject({ status: 403 });
		expect(await run("createLink", event({ user: stranger, fields }))).toMatchObject({
			status: 403,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("reports a missing database", async () => {
		const result = await run(
			"createLink",
			event({ fields: { target_url: "https://example.com" }, db: false }),
		);
		expect(result).toMatchObject({ status: 500 });
	});
});

describe("disableLink", () => {
	it("retires one of the Wayfinder's links", async () => {
		disable.mockResolvedValue({ ok: true, value: true });
		const result = await run("disableLink", event({ fields: { slug: "docs" } }));
		expect(disable).toHaveBeenCalledWith(DB, { type: "wayfinder" }, "docs");
		expect(result).toMatchObject({ success: true });
	});

	it("says so when the link isn't there", async () => {
		disable.mockResolvedValue({ ok: false, error: LINK_ERRORS.LINK_NOT_FOUND });
		const result = await run("disableLink", event({ fields: { slug: "ghost" } }));
		expect(result).toMatchObject({
			status: 404,
			data: { error: LINK_ERRORS.LINK_NOT_FOUND.userMessage },
		});
	});

	it("refuses people who aren't the Wayfinder", async () => {
		const result = await run("disableLink", event({ user: stranger, fields: { slug: "docs" } }));
		expect(result).toMatchObject({ status: 403 });
		expect(disable).not.toHaveBeenCalled();
	});
});
