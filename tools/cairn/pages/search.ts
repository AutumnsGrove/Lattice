import type { CairnIndex } from "../index.ts";
import { escHtml, biomeBadge, emptyState } from "./layout.ts";

export function searchPage(idx: CairnIndex, query: string): string {
	const q = query.trim();

	if (!q) {
		return `
<div class="page-header">
	<h1 class="page-title">🔍 Search</h1>
	<p class="page-subtitle">Search across all documentation, specs, and skills.</p>
</div>
<div style="max-width:600px;margin:2rem auto;">
	<form method="GET" action="/search">
		<input
			name="q"
			type="search"
			placeholder="Search docs, specs, plans, skills…"
			autofocus
			style="width:100%;padding:0.75rem 1rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font-body);font-size:1rem;outline:none;"
		/>
	</form>
	<p style="margin-top:1rem;color:var(--text-muted);font-size:0.8rem;text-align:center;">
		<span class="kbd">/</span> to focus search from anywhere
	</p>
</div>`;
	}

	// Run search
	const rawResults = idx.searchIndex.search(q, { limit: 40 });

	// Group by biome
	const grouped = new Map<string, typeof rawResults>();
	for (const r of rawResults) {
		const biome = ((r as Record<string, unknown>).biome as string) ?? "other";
		if (!grouped.has(biome)) grouped.set(biome, []);
		grouped.get(biome)!.push(r);
	}

	const resultCount = rawResults.length;

	if (resultCount === 0) {
		return `
<div class="page-header">
	<h1 class="page-title">🔍 Search: "${escHtml(q)}"</h1>
	<p class="page-subtitle">No results found.</p>
</div>
<form method="GET" action="/search" style="margin-bottom:2rem;">
	<input name="q" type="search" value="${escHtml(q)}" style="padding:0.5rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-body);font-size:0.875rem;outline:none;width:360px;" />
</form>
${emptyState("🍂", `No documents match "${q}". Try fewer words or a simpler term.`)}`;
	}

	const biomeOrder = [
		"specs",
		"plans",
		"museum",
		"safaris",
		"skills",
		"help-center",
		"security",
		"philosophy",
		"guides",
		"patterns",
		"design-system",
		"developer",
		"agent-usage",
		"snapshots",
		"scratch",
		"root",
	];

	// Sort grouped by biome order — unknown biomes (-1) sort to the end
	const sortedBiomes = [...grouped.keys()].sort((a, b) => {
		const ia = biomeOrder.indexOf(a);
		const ib = biomeOrder.indexOf(b);
		return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
	});

	const resultsHtml = sortedBiomes
		.map((biome) => {
			const items = grouped.get(biome)!;
			const itemsHtml = items
				.map((r) => {
					const doc = idx.documents.get(r.id);
					const desc =
						((r as Record<string, unknown>).description as string | undefined) ?? doc?.description;
					return `
				<a href="/docs/${escHtml(r.id)}" class="search-result">
					<div class="search-result-title">${escHtml(((r as Record<string, unknown>).title as string) ?? r.id)}</div>
					<div class="search-result-path">${escHtml(((r as Record<string, unknown>).path as string) ?? r.id)}</div>
					${desc ? `<div class="search-result-desc">${escHtml(desc)}</div>` : ""}
				</a>`;
				})
				.join("");

			return `
		<div style="margin-bottom:2rem;">
			<div class="section-header mb-2">
				${biomeBadge(biome)}
				<span style="color:var(--text-muted);font-size:0.72rem;">${items.length} result${items.length !== 1 ? "s" : ""}</span>
			</div>
			${itemsHtml}
		</div>`;
		})
		.join("");

	return `
<div class="page-header">
	<h1 class="page-title">🔍 "${escHtml(q)}"</h1>
	<p class="page-subtitle">${resultCount} result${resultCount !== 1 ? "s" : ""} across ${grouped.size} categories</p>
</div>

<form method="GET" action="/search" style="margin-bottom:2rem;">
	<input name="q" type="search" value="${escHtml(q)}" autofocus
		style="padding:0.5rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-body);font-size:0.875rem;outline:none;width:400px;" />
</form>

${resultsHtml}`;
}
