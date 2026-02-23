import { readFileSync } from "fs";
import { join } from "path";
import type { IndexStats } from "../types.ts";

const CSS_PATH = join(import.meta.dir, "..", "style.css");

function loadCss(): string {
	try {
		return readFileSync(CSS_PATH, "utf8");
	} catch {
		return "";
	}
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────

interface NavItem {
	href: string;
	label: string;
	icon: string;
	count?: number;
}

function buildNav(stats: IndexStats, currentPath: string): NavItem[][] {
	const biomes = stats.biomes;

	return [
		[
			{ href: "/", label: "Dashboard", icon: "layout-dashboard" },
			{ href: "/search", label: "Search", icon: "search" },
		],
		[
			{ href: "/browse/specs", label: "Specs", icon: "ruler", count: biomes["specs"] },
			{ href: "/browse/plans", label: "Plans", icon: "clipboard-list", count: biomes["plans"] },
			{ href: "/browse/museum", label: "Museum", icon: "landmark", count: biomes["museum"] },
			{ href: "/browse/safaris", label: "Safaris", icon: "map", count: biomes["safaris"] },
			{
				href: "/browse/help-center",
				label: "Help Center",
				icon: "book-open",
				count: biomes["help-center"],
			},
			{ href: "/browse/security", label: "Security", icon: "shield", count: biomes["security"] },
			{
				href: "/browse/philosophy",
				label: "Philosophy",
				icon: "leaf",
				count: biomes["philosophy"],
			},
			{ href: "/browse/guides", label: "Guides", icon: "book-marked", count: biomes["guides"] },
			{ href: "/browse/patterns", label: "Patterns", icon: "component", count: biomes["patterns"] },
			{
				href: "/browse/design-system",
				label: "Design",
				icon: "palette",
				count: biomes["design-system"],
			},
			{
				href: "/browse/developer",
				label: "Developer",
				icon: "terminal",
				count: biomes["developer"],
			},
			{ href: "/browse/scratch", label: "Scratch", icon: "pen-line", count: biomes["scratch"] },
		],
		[
			{ href: "/skills", label: "Skills", icon: "sparkles", count: stats.skills },
			{ href: "/agents", label: "Agents", icon: "bot" },
			{
				href: "/agents/crush",
				label: "Crush Sessions",
				icon: "message-circle",
				count: stats.crushSessions,
			},
			{
				href: "/agents/claude",
				label: "Claude Sessions",
				icon: "scroll",
				count: stats.claudeSessions,
			},
			{ href: "/timeline", label: "Timeline", icon: "clock" },
		],
		[
			{
				href: "/browse/agent-usage",
				label: "Agent Guides",
				icon: "key-round",
				count: biomes["agent-usage"],
			},
			{ href: "/browse/snapshots", label: "Snapshots", icon: "camera", count: biomes["snapshots"] },
		],
	];
}

// ─── Layout template ──────────────────────────────────────────────────────────

export function layout(opts: {
	title: string;
	content: string;
	stats: IndexStats;
	currentPath: string;
}): string {
	const { title, content, stats, currentPath } = opts;
	const css = loadCss();
	const navGroups = buildNav(stats, currentPath);

	const labels = ["", "Documentation", "Agent Activity", "Guides & Snapshots"];

	const sidebarHtml = navGroups
		.map((group, i) => {
			const label = labels[i];
			const items = group
				.map(({ href, label: itemLabel, icon, count }) => {
					const isActive = href === currentPath || (href !== "/" && currentPath.startsWith(href));
					return `<a href="${href}" class="${isActive ? "active" : ""}">
					<i data-lucide="${icon}" aria-hidden="true"></i>
					<span>${itemLabel}</span>
					${count !== undefined && count > 0 ? `<span class="sidebar-count" aria-label="${count} documents">${count}</span>` : ""}
				</a>`;
				})
				.join("\n");
			return `<div class="sidebar-section">
				${label ? `<div class="sidebar-label">${label}</div>` : ""}
				${items}
			</div>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escHtml(title)} · Cairn</title>
	<style>${css}</style>
	<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" crossorigin="anonymous"></script>
</head>
<body>
<div class="layout">

	<!-- Skip link for keyboard/screen reader users -->
	<a href="#main-content" style="position:absolute;top:-100px;left:1rem;z-index:9999;padding:0.5rem 1rem;background:var(--accent-warm);color:var(--bg-deep);border-radius:var(--radius-sm);font-size:0.85rem;font-weight:600;transition:top 0.1s;" onfocus="this.style.top='0.5rem'" onblur="this.style.top='-100px'">Skip to content</a>

	<!-- Topbar -->
	<header class="topbar" role="banner">
		<a href="/" class="topbar-brand" style="text-decoration:none;" aria-label="Cairn home">
			<i data-lucide="mountain" class="topbar-icon" aria-hidden="true"></i>
			<span>Cairn</span>
		</a>
		<span class="topbar-tagline" aria-hidden="true">Follow the cairns. Find your way.</span>
		<div class="search-bar" role="search">
			<label for="global-search" class="visually-hidden">Search documentation</label>
			<input
				type="search"
				id="global-search"
				placeholder="Search docs, specs, skills… (press /)"
				autocomplete="off"
				aria-label="Search documentation"
			/>
		</div>
	</header>

	<!-- Sidebar -->
	<nav class="sidebar" aria-label="Site navigation">
		${sidebarHtml}
	</nav>

	<!-- Main -->
	<main class="main" id="main-content">
		${content}
	</main>

</div>

<script>
// Keyboard shortcut: / focuses search
document.addEventListener('keydown', e => {
	if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
		e.preventDefault();
		document.getElementById('global-search')?.focus();
	}
	if (e.key === 'Escape') {
		const el = document.getElementById('global-search');
		if (document.activeElement === el) el?.blur();
	}
});

// Global search navigates to /search?q=
const searchInput = document.getElementById('global-search');
searchInput?.addEventListener('keydown', e => {
	if (e.key === 'Enter') {
		const q = searchInput.value.trim();
		if (q) window.location.href = '/search?q=' + encodeURIComponent(q);
	}
});

if (typeof lucide !== 'undefined') lucide.createIcons();
</script>
</body>
</html>`;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function escHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function formatDate(d: Date | string | undefined): string {
	if (!d) return "";
	const date = typeof d === "string" ? new Date(d) : d;
	if (isNaN(date.getTime())) return String(d);
	return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function biomeBadge(biome: string): string {
	const cls = ["specs", "plans", "museum", "safaris", "skills"].includes(biome)
		? `biome-${biome}`
		: "biome-default";
	const icons: Record<string, string> = {
		specs: "📐",
		plans: "📋",
		museum: "🏛️",
		safaris: "🗺️",
		skills: "🦎",
		"help-center": "📖",
		security: "🔒",
		philosophy: "🌿",
		guides: "📚",
		patterns: "🧩",
		snapshots: "📸",
		"agent-usage": "🗝️",
		"design-system": "🎨",
		developer: "⚙️",
		scratch: "✏️",
		root: "🌱",
	};
	const icon = icons[biome] ?? "📄";
	return `<span class="biome-badge ${cls}">${icon} ${biome}</span>`;
}

export function tagBadge(tag: string, i: number): string {
	const colors = ["tag-warm", "tag-green", "tag-blue", "tag-purple"];
	const cls = colors[i % colors.length];
	return `<span class="tag ${cls}">${escHtml(tag)}</span>`;
}

export function emptyState(icon: string, msg: string): string {
	return `<div class="empty-state">
		<div class="empty-state-icon">${icon}</div>
		<div class="empty-state-msg">${escHtml(msg)}</div>
	</div>`;
}
