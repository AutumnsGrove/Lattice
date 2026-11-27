/**
 * The sanitizer's environment branches.
 *
 * In a Worker, `esm-env` picks its browser entry, so `BROWSER` is true and the
 * dynamic `dompurify` import runs — but what it resolves to there is not an
 * instance. Assigning it anyway made `sanitizeMarkdown` call
 * `DOMPurify.sanitize`, which is not a function, and the timeline's comparison
 * page died on it in production. This pins the fallback: an import that is not an
 * instance leaves the sanitizer null, and the server-safe path does the work.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	vi.doUnmock("esm-env");
	vi.doUnmock("dompurify");
	vi.resetModules();
});

describe("sanitizeMarkdown in a worker-shaped environment", () => {
	it("uses the server-safe path when dompurify resolves to something that is not an instance", async () => {
		vi.resetModules();
		vi.doMock("esm-env", () => ({ BROWSER: true }));
		vi.doMock("dompurify", () => ({ default: { somethingElse: true } }));

		const { sanitizeMarkdown } = await import("./sanitize");

		// Let the dynamic import settle, which is when the bad assignment used to happen.
		await new Promise((resolve) => setTimeout(resolve, 10));

		const html = sanitizeMarkdown("<p>fine</p><script>alert(1)</script>");

		expect(html).toContain("fine");
		expect(html).not.toContain("<script>");
	});

	it("keeps the link policy on the server-safe path", async () => {
		vi.resetModules();
		vi.doMock("esm-env", () => ({ BROWSER: true }));
		vi.doMock("dompurify", () => ({ default: { somethingElse: true } }));

		const { sanitizeMarkdown } = await import("./sanitize");
		await new Promise((resolve) => setTimeout(resolve, 10));

		const html = sanitizeMarkdown('<p><a href="https://example.com/x">x</a></p>');

		expect(html).toContain('href="https://example.com/x"');
		expect(html).toContain("noopener");
	});
});
