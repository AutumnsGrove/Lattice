import { describe, it, expect } from "vitest";
import { applyLinkPolicy, externalLinkRel, isExternalLink } from "./link-rel";

describe("isExternalLink", () => {
	it("treats absolute URLs and _blank as external", () => {
		expect(isExternalLink("https://example.com", undefined)).toBe(true);
		expect(isExternalLink("http://example.com", undefined)).toBe(true);
		expect(isExternalLink("/garden/hello", "_blank")).toBe(true);
	});

	it("treats internal paths as internal", () => {
		expect(isExternalLink("/garden/hello", undefined)).toBe(false);
		expect(isExternalLink("#anchor", undefined)).toBe(false);
		expect(isExternalLink("mailto:a@b.com", undefined)).toBe(false);
		expect(isExternalLink(undefined, undefined)).toBe(false);
	});
});

describe("externalLinkRel", () => {
	it("always adds tabnabbing protection", () => {
		expect(externalLinkRel(undefined, "standard")).toBe("noopener noreferrer");
	});

	it("keeps existing tokens", () => {
		expect(externalLinkRel("mention", "standard")).toBe("mention noopener noreferrer");
	});

	it("adds nofollow ugc under the young/free policy", () => {
		const rel = externalLinkRel(undefined, "nofollow-ugc");
		expect(rel).toContain("nofollow");
		expect(rel).toContain("ugc");
		expect(rel).toContain("noopener");
		expect(rel).toContain("noreferrer");
	});

	it("does not duplicate tokens that are already present", () => {
		const rel = externalLinkRel("nofollow ugc", "nofollow-ugc");
		expect(rel.split(" ").filter((t) => t === "nofollow")).toHaveLength(1);
		expect(rel.split(" ").filter((t) => t === "ugc")).toHaveLength(1);
	});
});

describe("applyLinkPolicy", () => {
	const html =
		'<p><a href="https://evil.example/promo">buy</a> <a href="/garden/mine">mine</a></p>';

	it("leaves HTML untouched under the standard policy", () => {
		expect(applyLinkPolicy(html, "standard")).toBe(html);
	});

	it("adds rel to external links only", () => {
		const out = applyLinkPolicy(html, "nofollow-ugc");
		expect(out).toContain(
			'<a href="https://evil.example/promo" rel="noopener noreferrer nofollow ugc">',
		);
		expect(out).toContain('<a href="/garden/mine">');
	});

	it("replaces an existing rel rather than appending a second one", () => {
		const out = applyLinkPolicy('<a href="https://x.dev" rel="noopener">x</a>', "nofollow-ugc");
		expect(out.match(/rel=/g)).toHaveLength(1);
		expect(out).toContain("nofollow");
	});

	it("is safe on empty input", () => {
		expect(applyLinkPolicy("", "nofollow-ugc")).toBe("");
	});
});
