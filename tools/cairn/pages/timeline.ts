import type { CairnIndex } from "../index.ts";
import { escHtml, formatDate, emptyState } from "./layout.ts";

export function timelinePage(idx: CairnIndex): string {
	const snapshots = [...idx.documents.values()]
		.filter((d) => d.biome === "snapshots")
		.sort((a, b) => (b.lastUpdated ?? b.path).localeCompare(a.lastUpdated ?? a.path));

	if (snapshots.length === 0) {
		return emptyState("⏱️", "No snapshots found in snapshots/");
	}

	// Extract version from filename: 2026-01-04_23-23-38_v0.8.5.md → v0.8.5
	function extractVersion(path: string): string | undefined {
		const m = path.match(/_(v[\d.]+(?:-\w+)?)\.md$/);
		return m?.[1];
	}

	function extractDateFromPath(path: string): string | undefined {
		const m = path.match(/(\d{4}-\d{2}-\d{2})/);
		return m?.[1];
	}

	const items = snapshots.map((doc) => {
		const version = extractVersion(doc.path);
		const dateStr = extractDateFromPath(doc.path) ?? doc.lastUpdated;
		const date = dateStr ? new Date(dateStr) : undefined;

		// Extract first paragraph as summary
		const firstPara = doc.content.match(/^[^#\n].*$/m)?.[0]?.trim() ?? "";

		return { doc, version, date, firstPara };
	});

	const timelineHtml = items
		.map(
			({ doc, version, date, firstPara }) => `
		<div class="timeline-item">
			<div class="timeline-dot"></div>
			<div class="timeline-date">${date ? formatDate(date) : "—"}</div>
			<a href="/docs/${escHtml(doc.slug)}" style="text-decoration:none;">
				<div class="timeline-title">
					${version ? `<span class="tag tag-warm" style="margin-right:0.4rem;">${escHtml(version)}</span>` : ""}
					${escHtml(doc.title ?? doc.path)}
				</div>
			</a>
			${firstPara ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem;">${escHtml(firstPara.slice(0, 120))}${firstPara.length > 120 ? "…" : ""}</div>` : ""}
		</div>`,
		)
		.join("");

	return `
<div class="page-header">
	<h1 class="page-title">⏱️ Project Timeline</h1>
	<p class="page-subtitle">${snapshots.length} snapshots — the path walked</p>
</div>

<div class="timeline">
	${timelineHtml}
</div>
`;
}
