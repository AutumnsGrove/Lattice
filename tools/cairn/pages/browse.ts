import type { CairnIndex } from "../index.ts";
import { escHtml, biomeBadge, tagBadge, emptyState } from "./layout.ts";
import type { Document } from "../types.ts";

export function browsePage(idx: CairnIndex, biome: string, query: URLSearchParams): string {
	// Collect docs for this biome
	let docs = [...idx.documents.values()].filter((d) => d.biome === biome);

	// Filter by tag
	const tagFilter = query.get("tag");
	if (tagFilter) {
		docs = docs.filter((d) => d.tags?.includes(tagFilter));
	}

	// Sort
	const sortBy = query.get("sort") ?? "updated";
	if (sortBy === "title") {
		docs.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
	} else if (sortBy === "created") {
		docs.sort((a, b) => (b.dateCreated ?? "").localeCompare(a.dateCreated ?? ""));
	} else {
		docs.sort((a, b) => b.modifiedAt - a.modifiedAt);
	}

	// Collect all tags in this biome
	const allTags = new Map<string, number>();
	for (const d of [...idx.documents.values()].filter((d) => d.biome === biome)) {
		for (const t of d.tags ?? []) {
			allTags.set(t, (allTags.get(t) ?? 0) + 1);
		}
	}
	const sortedTags = [...allTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

	const biomeIcons: Record<string, string> = {
		specs: "📐",
		plans: "📋",
		museum: "🏛️",
		safaris: "🗺️",
		"help-center": "📖",
		security: "🔒",
		philosophy: "🌿",
		guides: "📚",
		patterns: "🧩",
		"design-system": "🎨",
		developer: "⚙️",
		scratch: "✏️",
		snapshots: "📸",
		"agent-usage": "🗝️",
		root: "🌱",
	};
	const icon = biomeIcons[biome] ?? "📄";

	// For plans: kanban view grouped by status
	const isPlans = biome === "plans";

	const tagSidebar =
		sortedTags.length > 0
			? `<div style="width:160px;flex-shrink:0;">
			<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Filter by tag</div>
			${tagFilter ? `<a href="/browse/${biome}" style="display:block;font-size:0.75rem;color:var(--accent-warm);margin-bottom:0.4rem;">✕ clear filter</a>` : ""}
			${sortedTags
				.map(
					([tag, count]) => `
				<a href="/browse/${biome}?tag=${encodeURIComponent(tag)}" style="display:flex;justify-content:space-between;align-items:center;padding:0.2rem 0;font-size:0.75rem;color:${tag === tagFilter ? "var(--accent-warm)" : "var(--text-secondary)"};text-decoration:none;">
					<span>${escHtml(tag)}</span>
					<span style="font-size:0.68rem;color:var(--text-muted);">${count}</span>
				</a>`,
				)
				.join("")}
		</div>`
			: "";

	const sortBar = `
	<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;font-size:0.78rem;color:var(--text-muted);">
		<span>Sort:</span>
		${["updated", "title", "created"]
			.map(
				(s) =>
					`<a href="/browse/${biome}?sort=${s}${tagFilter ? `&tag=${encodeURIComponent(tagFilter)}` : ""}"
					style="color:${sortBy === s ? "var(--accent-warm)" : "var(--text-secondary)"};text-decoration:none;">${s}</a>`,
			)
			.join(" · ")}
	</div>`;

	let mainContent: string;

	if (isPlans) {
		mainContent = planKanban(docs, biome);
	} else {
		mainContent =
			docs.length === 0
				? emptyState("🍃", `No documents found in ${biome}.`)
				: `<div class="doc-grid">
				${docs.map((d) => docCard(d, biome)).join("")}
			</div>`;
	}

	return `
<div class="page-header">
	<div style="display:flex;align-items:center;gap:0.75rem;">
		<span style="font-size:1.8rem;">${icon}</span>
		<div>
			<h1 class="page-title">${escHtml(biome.charAt(0).toUpperCase() + biome.slice(1))}</h1>
			<p class="page-subtitle">${docs.length} document${docs.length !== 1 ? "s" : ""} ${tagFilter ? `tagged "${escHtml(tagFilter)}"` : ""}</p>
		</div>
	</div>
</div>

${sortBar}

<div style="display:flex;gap:2rem;align-items:start;">
	<div style="flex:1;min-width:0;">
		${mainContent}
	</div>
	${tagSidebar}
</div>
`;
}

function docCard(doc: Document, biome: string): string {
	const tagsHtml = (doc.tags ?? [])
		.slice(0, 3)
		.map((t, i) => tagBadge(t, i))
		.join(" ");

	return `
<a href="/docs/${escHtml(doc.slug)}" class="doc-card">
	${doc.icon ? `<div class="doc-card-icon">${doc.icon}</div>` : ""}
	<div class="doc-card-title">${escHtml(doc.title ?? doc.path)}</div>
	${doc.description ? `<div class="doc-card-desc">${escHtml(doc.description)}</div>` : ""}
	<div class="doc-card-footer">
		${tagsHtml}
		${doc.lastUpdated ? `<span class="tag" style="margin-left:auto;">${escHtml(doc.lastUpdated.slice(0, 10))}</span>` : ""}
		${doc.status ? `<span class="kanban-col-title status-${doc.status}">${doc.status}</span>` : ""}
	</div>
</a>`;
}

function planKanban(docs: Document[], biome: string): string {
	const statusOrder = ["active", "planning", "planned", "completed"] as const;
	type Status = (typeof statusOrder)[number];

	const groups: Record<Status | "other", Document[]> = {
		active: [],
		planning: [],
		planned: [],
		completed: [],
		other: [],
	};

	for (const d of docs) {
		const s = d.status as Status | undefined;
		if (s && s in groups) {
			groups[s].push(d);
		} else {
			groups.other.push(d);
		}
	}

	const cols = [...statusOrder, "other" as const].filter((s) => groups[s].length > 0);

	return `<div class="kanban">
		${cols
			.map(
				(status) => `
			<div>
				<div class="kanban-col-title status-${status}">${status} (${groups[status].length})</div>
				${groups[status].map((d) => docCard(d, biome)).join("")}
			</div>`,
			)
			.join("")}
	</div>`;
}
