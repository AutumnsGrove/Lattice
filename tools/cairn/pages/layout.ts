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
			{ href: "/", label: "Dashboard", icon: "🏔️" },
			{ href: "/search", label: "Search", icon: "🔍" },
		],
		[
			{ href: "/browse/specs", label: "Specs", icon: "📐", count: biomes["specs"] },
			{ href: "/browse/plans", label: "Plans", icon: "📋", count: biomes["plans"] },
			{ href: "/browse/museum", label: "Museum", icon: "🏛️", count: biomes["museum"] },
			{ href: "/browse/safaris", label: "Safaris", icon: "🗺️", count: biomes["safaris"] },
			{
				href: "/browse/help-center",
				label: "Help Center",
				icon: "📖",
				count: biomes["help-center"],
			},
			{ href: "/browse/security", label: "Security", icon: "🔒", count: biomes["security"] },
			{ href: "/browse/philosophy", label: "Philosophy", icon: "🌿", count: biomes["philosophy"] },
			{ href: "/browse/guides", label: "Guides", icon: "📚", count: biomes["guides"] },
			{ href: "/browse/patterns", label: "Patterns", icon: "🧩", count: biomes["patterns"] },
			{
				href: "/browse/design-system",
				label: "Design",
				icon: "🎨",
				count: biomes["design-system"],
			},
			{ href: "/browse/developer", label: "Developer", icon: "⚙️", count: biomes["developer"] },
			{ href: "/browse/scratch", label: "Scratch", icon: "✏️", count: biomes["scratch"] },
		],
		[
			{ href: "/skills", label: "Skills", icon: "🦎", count: stats.skills },
			{ href: "/agents", label: "Agents", icon: "🤖" },
			{ href: "/agents/crush", label: "Crush Sessions", icon: "💬", count: stats.crushSessions },
			{ href: "/agents/claude", label: "Claude Sessions", icon: "📜", count: stats.claudeSessions },
			{ href: "/timeline", label: "Timeline", icon: "⏱️" },
		],
		[
			{
				href: "/browse/agent-usage",
				label: "Agent Guides",
				icon: "🗝️",
				count: biomes["agent-usage"],
			},
			{ href: "/browse/snapshots", label: "Snapshots", icon: "📸", count: biomes["snapshots"] },
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
					<span>${icon}</span>
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
</head>
<body>
<div class="layout">

	<!-- Skip link for keyboard/screen reader users -->
	<a href="#main-content" style="position:absolute;top:-100px;left:1rem;z-index:9999;padding:0.5rem 1rem;background:var(--accent-warm);color:var(--bg-deep);border-radius:var(--radius-sm);font-size:0.85rem;font-weight:600;transition:top 0.1s;" onfocus="this.style.top='0.5rem'" onblur="this.style.top='-100px'">Skip to content</a>

	<!-- Topbar -->
	<header class="topbar" role="banner">
		<a href="/" class="topbar-brand" style="text-decoration:none;" aria-label="Cairn home">
			<span class="stone" aria-hidden="true">🏔️</span>
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
