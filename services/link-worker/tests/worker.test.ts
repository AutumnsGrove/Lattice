import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@autumnsgrove/lattice/services/short-links", () => ({
	resolveShortLink: vi.fn(),
	recordClick: vi.fn(),
}));

import { resolveShortLink, recordClick } from "@autumnsgrove/lattice/services/short-links";
import worker, { extractSlug, type Env } from "../src/index";

const resolve = vi.mocked(resolveShortLink);
const click = vi.mocked(recordClick);

const env = { DB: {} as D1Database } as Env;

function run(path: string, method = "GET") {
	const waiting: Promise<unknown>[] = [];
	const ctx = {
		waitUntil: (p: Promise<unknown>) => waiting.push(p),
	} as unknown as ExecutionContext;
	const response = worker.fetch(
		new Request(`https://link.grove.place${path}`, { method }),
		env,
		ctx,
	);
	return { response, settled: () => Promise.all(waiting) };
}

beforeEach(() => {
	vi.resetAllMocks();
	click.mockResolvedValue(undefined);
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("extractSlug", () => {
	it.each([
		["/abc123", "abc123"],
		["/abc123/", "abc123"],
		["/my-bloom", "my-bloom"],
		["/", null],
		["", null],
		["/a/b", null],
		["/abc123/extra/", null],
	])("%j → %j", (path, slug) => {
		expect(extractSlug(path)).toBe(slug);
	});
});

describe("redirects", () => {
	it("sends a found link to its destination with a temporary redirect", async () => {
		resolve.mockResolvedValue({ status: "found", url: "https://autumn.grove.place/garden/hello" });
		const response = await run("/abc123").response;

		expect(resolve).toHaveBeenCalledWith(env.DB, "abc123");
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe("https://autumn.grove.place/garden/hello");
		expect(response.headers.get("Cache-Control")).toBe("private, max-age=0");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
	});

	it("counts the click without holding up the redirect", async () => {
		resolve.mockResolvedValue({ status: "found", url: "https://example.com/" });
		const { response, settled } = run("/abc123");
		await response;
		await settled();
		expect(click).toHaveBeenCalledWith(env.DB, "abc123");
	});

	it("still redirects when the click count fails", async () => {
		resolve.mockResolvedValue({ status: "found", url: "https://example.com/" });
		click.mockRejectedValue(new Error("db down"));
		const { response, settled } = run("/abc123");
		expect((await response).status).toBe(302);
		await expect(settled()).resolves.toBeDefined();
	});

	it("serves HEAD requests without counting them", async () => {
		resolve.mockResolvedValue({ status: "found", url: "https://example.com/" });
		const { response, settled } = run("/abc123", "HEAD");
		expect((await response).status).toBe(302);
		await settled();
		expect(click).not.toHaveBeenCalled();
	});

	it("accepts a trailing slash", async () => {
		resolve.mockResolvedValue({ status: "found", url: "https://example.com/" });
		await run("/abc123/").response;
		expect(resolve).toHaveBeenCalledWith(env.DB, "abc123");
	});

	it("sends the bare host to grove.place", async () => {
		const response = await run("/").response;
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe("https://grove.place");
		expect(resolve).not.toHaveBeenCalled();
	});
});

describe("links that lead nowhere", () => {
	it("answers 410 with a gentle page for a link that's gone", async () => {
		resolve.mockResolvedValue({ status: "gone" });
		const response = await run("/abc123").response;
		expect(response.status).toBe(410);
		expect(response.headers.get("Content-Type")).toContain("text/html");
		expect(await response.text()).toContain("This link has gone quiet");
		expect(click).not.toHaveBeenCalled();
	});

	it("answers 404 for a slug nobody made", async () => {
		resolve.mockResolvedValue({ status: "not_found" });
		const response = await run("/nothing").response;
		expect(response.status).toBe(404);
		expect(await response.text()).toContain("find that link");
	});

	it("answers 404 for paths that can't be slugs, without a lookup", async () => {
		const response = await run("/a/b/c").response;
		expect(response.status).toBe(404);
		expect(resolve).not.toHaveBeenCalled();
	});

	it("never redirects to a destination that isn't https", async () => {
		for (const url of ["http://example.com/", "javascript:alert(1)", "//evil.com", ""]) {
			resolve.mockResolvedValue({ status: "found", url });
			const response = await run("/abc123").response;
			expect(response.status).toBe(410);
			expect(response.headers.get("Location")).toBeNull();
		}
		expect(click).not.toHaveBeenCalled();
	});
});

describe("failures and other methods", () => {
	it("shows a friendly error when the lookup throws", async () => {
		resolve.mockRejectedValue(new Error("D1 unavailable"));
		const response = await run("/abc123").response;
		expect(response.status).toBe(500);
		expect(await response.text()).toContain("Something stumbled");
		expect(console.error).toHaveBeenCalled();
	});

	it.each(["POST", "PUT", "DELETE", "PATCH"])("refuses %s", async (method) => {
		const response = await run("/abc123", method).response;
		expect(response.status).toBe(405);
		expect(response.headers.get("Allow")).toBe("GET, HEAD");
		expect(resolve).not.toHaveBeenCalled();
	});
});
