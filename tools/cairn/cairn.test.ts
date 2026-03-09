// Cairn tests — Bun test runner
// Run: cd tools/cairn && bun test

import { describe, test, expect, beforeAll } from "bun:test";
import { buildIndex } from "./index.ts";
import { dashboardPage } from "./pages/dashboard.ts";
import { browsePage } from "./pages/browse.ts";
import { searchPage } from "./pages/search.ts";
import { skillsPage } from "./pages/skills.ts";
import { agentsDashboard, crushSessionsPage, claudeSessionsPage } from "./pages/agents.ts";
import { timelinePage } from "./pages/timeline.ts";
import { layout, escHtml, formatDate } from "./pages/layout.ts";
import type { CairnIndex } from "./index.ts";

// ─── Index ────────────────────────────────────────────────────────────────────

describe("buildIndex", () => {
	let idx: CairnIndex;

	beforeAll(async () => {
		idx = await buildIndex();
	});

	test("indexes documents", () => {
		expect(idx.stats.documents).toBeGreaterThan(0);
		expect(idx.documents.size).toBe(idx.stats.documents);
	});

	test("indexes skills", () => {
		expect(idx.stats.skills).toBeGreaterThan(0);
		expect(idx.skills.length).toBe(idx.stats.skills);
	});

	test("all documents have required fields", () => {
		for (const doc of idx.documents.values()) {
			expect(doc.path).toBeTruthy();
			expect(doc.slug).toBeTruthy();
			expect(doc.biome).toBeTruthy();
			expect(typeof doc.wordCount).toBe("number");
			expect(Array.isArray(doc.headings)).toBe(true);
		}
	});

	test("document dates are always strings (not Date objects)", () => {
		for (const doc of idx.documents.values()) {
			if (doc.lastUpdated !== undefined) {
				expect(typeof doc.lastUpdated).toBe("string");
			}
			if (doc.dateCreated !== undefined) {
				expect(typeof doc.dateCreated).toBe("string");
			}
		}
	});

	test("document slugs contain no raw slashes that break routing", () => {
		// Slugs CAN contain slashes (that's intentional for nested paths)
		// but should not start with a slash
		for (const doc of idx.documents.values()) {
			expect(doc.slug.startsWith("/")).toBe(false);
		}
	});

	test("tags are always arrays of strings when present", () => {
		for (const doc of idx.documents.values()) {
			if (doc.tags) {
				expect(Array.isArray(doc.tags)).toBe(true);
				for (const t of doc.tags) {
					expect(typeof t).toBe("string");
				}
			}
		}
	});

	test("search index returns results for common terms", () => {
		const results = idx.searchIndex.search("spec");
		expect(results.length).toBeGreaterThan(0);
	});

	test("search returns fewer results for gibberish than common terms", () => {
		// MiniSearch fuzzy matching may return a handful of approximate results,
		// but gibberish should match far fewer documents than real terms.
		const gibberishResults = idx.searchIndex.search("xyzzy_notaword_12345");
		const realResults = idx.searchIndex.search("spec");
		expect(gibberishResults.length).toBeLessThan(realResults.length);
	});

	test("biomes are populated in stats", () => {
		expect(Object.keys(idx.stats.biomes).length).toBeGreaterThan(0);
	});

	test("crush sessions loaded (may be 0 if DB unavailable)", () => {
		expect(Array.isArray(idx.crushSessions)).toBe(true);
	});

	test("claude sessions loaded (may be 0 if dir unavailable)", () => {
		expect(Array.isArray(idx.claudeSessions)).toBe(true);
	});
});

// ─── Page Rendering ───────────────────────────────────────────────────────────

describe("page rendering", () => {
	let idx: CairnIndex;

	beforeAll(async () => {
		idx = await buildIndex();
	});

	test("dashboard renders without throwing", () => {
		const html = dashboardPage(idx);
		expect(typeof html).toBe("string");
		expect(html.length).toBeGreaterThan(100);
	});

	test("dashboard contains expected sections", () => {
		const html = dashboardPage(idx);
		expect(html).toContain("stat-number");
		expect(html).toContain("Recently Updated");
	});

	test("browse page renders for known biomes", () => {
		const biomes = ["specs", "plans", "museum", "safaris", "skills", "philosophy"];
		for (const biome of biomes) {
			const html = browsePage(idx, biome, new URLSearchParams());
			expect(typeof html).toBe("string");
			// Should not throw or be empty
			expect(html.length).toBeGreaterThan(50);
		}
	});

	test("browse page handles unknown biome gracefully (empty state)", () => {
		const html = browsePage(idx, "nonexistent-biome-xyz", new URLSearchParams());
		expect(typeof html).toBe("string");
		// Should render empty state, not throw
		expect(html).toContain("0 document");
	});

	test("search page renders with no query", () => {
		const html = searchPage(idx, "");
		expect(html).toContain("Search");
		expect(typeof html).toBe("string");
	});

	test("search page renders with query", () => {
		const html = searchPage(idx, "cairn");
		expect(typeof html).toBe("string");
		expect(html).toContain("cairn");
	});

	test("skills page renders", () => {
		const html = skillsPage(idx);
		expect(typeof html).toBe("string");
		expect(html.length).toBeGreaterThan(100);
	});

	test("agents dashboard renders", () => {
		const html = agentsDashboard(idx);
		expect(typeof html).toBe("string");
		expect(html).toContain("Agent Activity");
	});

	test("crush sessions page renders", () => {
		const html = crushSessionsPage(idx);
		expect(typeof html).toBe("string");
	});

	test("claude sessions page renders", () => {
		const html = claudeSessionsPage(idx);
		expect(typeof html).toBe("string");
	});

	test("timeline page renders", () => {
		const html = timelinePage(idx);
		expect(typeof html).toBe("string");
	});
});

// ─── Layout helpers ───────────────────────────────────────────────────────────

describe("escHtml", () => {
	test("escapes ampersand", () => {
		expect(escHtml("a & b")).toBe("a &amp; b");
	});

	test("escapes angle brackets", () => {
		expect(escHtml("<script>")).toBe("&lt;script&gt;");
	});

	test("escapes double quotes", () => {
		expect(escHtml('say "hello"')).toBe("say &quot;hello&quot;");
	});

	test("leaves safe strings unchanged", () => {
		expect(escHtml("hello world")).toBe("hello world");
	});

	test("escapes XSS payload", () => {
		const payload = '"><script>alert(1)</script>';
		const escaped = escHtml(payload);
		expect(escaped).not.toContain("<script>");
		expect(escaped).not.toContain(">");
	});
});

describe("formatDate", () => {
	test("formats a Date object", () => {
		const result = formatDate(new Date("2026-02-23"));
		expect(result).toContain("2026");
	});

	test("formats an ISO string", () => {
		const result = formatDate("2026-02-23");
		expect(result).toContain("2026");
	});

	test("returns empty string for undefined", () => {
		expect(formatDate(undefined)).toBe("");
	});

	test("handles invalid date strings gracefully", () => {
		const result = formatDate("not-a-date");
		expect(typeof result).toBe("string");
	});
});

describe("layout", () => {
	let idx: CairnIndex;

	beforeAll(async () => {
		idx = await buildIndex();
	});

	test("produces valid HTML skeleton", () => {
		const html = layout({
			title: "Test",
			content: "<p>hello</p>",
			stats: idx.stats,
			currentPath: "/",
		});
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<title>Test · Cairn</title>");
		expect(html).toContain("<p>hello</p>");
	});

	test("escapes title in <title> tag", () => {
		const html = layout({
			title: "<script>alert(1)</script>",
			content: "",
			stats: idx.stats,
			currentPath: "/",
		});
		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).toContain("&lt;script&gt;");
	});

	test("marks the current path as active in sidebar", () => {
		const html = layout({
			title: "Skills",
			content: "",
			stats: idx.stats,
			currentPath: "/skills",
		});
		expect(html).toContain('class="active"');
	});
});

// ─── Security: input sanitization ────────────────────────────────────────────

describe("security: URL parameter sanitization", () => {
	let idx: CairnIndex;

	beforeAll(async () => {
		idx = await buildIndex();
	});

	test("browse page with injected tag filter does not render raw HTML", () => {
		const params = new URLSearchParams({ tag: "<script>alert(1)</script>" });
		const html = browsePage(idx, "specs", params);
		// The tag filter value goes through escHtml in the clear filter link
		expect(html).not.toContain("<script>alert(1)</script>");
	});

	test("search page with XSS query does not render executable HTML", () => {
		const html = searchPage(idx, "<img src=x onerror=alert(1)>");
		// The raw unescaped payload must not appear — angle brackets must be escaped.
		// It's fine for "onerror=" to appear inside a properly escaped attribute value
		// (e.g. value="&lt;img ... onerror=...&gt;") — the browser won't execute it.
		expect(html).not.toContain("<img src=x onerror=alert(1)>");
		expect(html).not.toContain("<img src=x");
	});
});
