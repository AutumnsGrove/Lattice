import { buildIndex } from "./index.ts";
import { initRenderer } from "./render.ts";
import { layout } from "./pages/layout.ts";
import { dashboardPage } from "./pages/dashboard.ts";
import { documentPage } from "./pages/document.ts";
import { browsePage } from "./pages/browse.ts";
import { searchPage } from "./pages/search.ts";
import { skillsPage, skillDetailPage } from "./pages/skills.ts";
import {
	agentsDashboard,
	crushSessionsPage,
	crushSessionDetailPage,
	claudeSessionsPage,
	claudeSessionDetailPage,
} from "./pages/agents.ts";
import { timelinePage } from "./pages/timeline.ts";

const PORT = 4321;

// ─── Boot ─────────────────────────────────────────────────────────────────────

console.log("🏔️  Cairn is waking up…");
// Run shiki init and document indexing in parallel — they're fully independent
const [, idx] = await Promise.all([initRenderer(), buildIndex()]);

console.log(`\n✧ Cairn — http://localhost:${PORT}`);
console.log(`  Follow the cairns. Find your way.\n`);

// ─── Router ───────────────────────────────────────────────────────────────────

function notFound(msg = "Not found"): Response {
	return new Response(
		layout({
			title: "404",
			content: `
			<div class="empty-state">
				<div class="empty-state-icon">🍂</div>
				<div style="font-size:1.1rem;color:var(--text-secondary);margin-bottom:0.5rem;">Path not found</div>
				<div class="empty-state-msg">${msg}</div>
				<a href="/" style="display:inline-block;margin-top:1rem;font-size:0.85rem;">← Back to Cairn</a>
			</div>`,
			stats: idx.stats,
			currentPath: "/404",
		}),
		{ status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
	);
}

function html(content: string, title: string, currentPath: string): Response {
	return new Response(layout({ title, content, stats: idx.stats, currentPath }), {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function json(data: unknown): Response {
	return new Response(JSON.stringify(data, null, 2), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = Bun.serve({
	port: PORT,
	hostname: "localhost",

	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		try {
			// ── Dashboard ────────────────────────────────────────────────────
			if (path === "/" || path === "") {
				return html(dashboardPage(idx), "Dashboard", "/");
			}

			// ── Document viewer ──────────────────────────────────────────────
			if (path.startsWith("/docs/")) {
				const slug = decodeURIComponent(path.slice("/docs/".length));
				const content = documentPage(idx, slug);
				if (!content) return notFound(`No document found for: ${slug}`);
				const doc = idx.documents.get(slug);
				return html(content, doc?.title ?? slug, path);
			}

			// ── Search ───────────────────────────────────────────────────────
			if (path === "/search") {
				const q = url.searchParams.get("q") ?? "";
				return html(searchPage(idx, q), q ? `"${q}" — Search` : "Search", "/search");
			}

			// ── Browse category ───────────────────────────────────────────────
			if (path.startsWith("/browse/")) {
				const rawBiome = decodeURIComponent(path.slice("/browse/".length));
				// Sanitize: only allow alphanumeric, dash, underscore — no HTML injection
				const biome = rawBiome.replace(/[^a-z0-9-_]/gi, "");
				if (!biome) return notFound("Invalid category.");
				return html(
					browsePage(idx, biome, url.searchParams),
					biome.charAt(0).toUpperCase() + biome.slice(1),
					path,
				);
			}

			// ── Skills ────────────────────────────────────────────────────────
			if (path === "/skills") {
				return html(skillsPage(idx), "Skills", "/skills");
			}

			if (path.startsWith("/skills/")) {
				const skillName = decodeURIComponent(path.slice("/skills/".length)).replace(
					/[^a-z0-9-_]/gi,
					"",
				);
				if (!skillName) return notFound("Invalid skill name.");
				const content = skillDetailPage(idx, skillName);
				if (!content) return notFound(`Skill not found: ${skillName}`);
				return html(content, skillName, path);
			}

			// ── Agent activity ────────────────────────────────────────────────
			if (path === "/agents") {
				return html(agentsDashboard(idx), "Agent Activity", "/agents");
			}

			if (path === "/agents/crush") {
				return html(crushSessionsPage(idx), "Crush Sessions", "/agents/crush");
			}

			if (path.startsWith("/agents/crush/")) {
				const sessionId = decodeURIComponent(path.slice("/agents/crush/".length)).replace(
					/[^a-z0-9-]/gi,
					"",
				);
				if (!sessionId) return notFound("Invalid session ID.");
				const content = crushSessionDetailPage(idx, sessionId);
				if (!content) return notFound(`Crush session not found: ${sessionId}`);
				return html(content, `Session: ${sessionId.slice(0, 8)}…`, path);
			}

			if (path === "/agents/claude") {
				return html(claudeSessionsPage(idx), "Claude Sessions", "/agents/claude");
			}

			if (path.startsWith("/agents/claude/")) {
				const sessionId = decodeURIComponent(path.slice("/agents/claude/".length)).replace(
					/[^a-z0-9-]/gi,
					"",
				);
				if (!sessionId) return notFound("Invalid session ID.");
				const content = claudeSessionDetailPage(idx, sessionId);
				if (!content) return notFound(`Claude session not found: ${sessionId}`);
				return html(content, `Session: ${sessionId.slice(0, 8)}…`, path);
			}

			// ── Timeline ──────────────────────────────────────────────────────
			if (path === "/timeline") {
				return html(timelinePage(idx), "Timeline", "/timeline");
			}

			// ── JSON API ──────────────────────────────────────────────────────

			if (path === "/api/stats") {
				return json(idx.stats);
			}

			if (path === "/api/search") {
				const q = url.searchParams.get("q") ?? "";
				if (!q) return json([]);
				const results = idx.searchIndex.search(q, { limit: 20 });
				return json(results);
			}

			if (path.startsWith("/api/docs/")) {
				const slug = decodeURIComponent(path.slice("/api/docs/".length));
				const doc = idx.documents.get(slug);
				if (!doc) return new Response("Not found", { status: 404 });
				// Return doc without full content for size
				const { content: _content, ...meta } = doc;
				return json(meta);
			}

			// ── Favicon ───────────────────────────────────────────────────────
			if (path === "/favicon.ico") {
				return new Response(null, { status: 204 });
			}

			return notFound();
		} catch (err) {
			console.error("Server error:", err);
			return new Response("Internal server error", { status: 500 });
		}
	},
});

console.log(`  Serving ${idx.stats.documents} documents · ${idx.stats.skills} skills`);
console.log(
	`  Crush: ${idx.stats.crushSessions} sessions · Claude: ${idx.stats.claudeSessions} sessions\n`,
);
