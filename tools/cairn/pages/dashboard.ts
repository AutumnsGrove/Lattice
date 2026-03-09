import type { CairnIndex } from "../index.ts";
import { escHtml, formatDate, biomeBadge } from "./layout.ts";

export function dashboardPage(idx: CairnIndex): string {
	const { stats, documents, crushSessions, claudeSessions, ccUsageMonthly } = idx;

	// Recently updated documents (sorted by mtime)
	const recentDocs = [...documents.values()]
		.sort((a, b) => b.modifiedAt - a.modifiedAt)
		.slice(0, 12);

	// Crush session totals
	const crushTotalCost = crushSessions.reduce((s, c) => s + (c.cost ?? 0), 0);
	const crushTotalTokens = crushSessions.reduce(
		(s, c) => s + (c.promptTokens ?? 0) + (c.completionTokens ?? 0),
		0,
	);

	// Stats cards
	const statsCards = [
		{ n: stats.documents, label: "Documents" },
		{ n: stats.biomes["specs"] ?? 0, label: "Specs" },
		{ n: stats.biomes["plans"] ?? 0, label: "Plans" },
		{ n: stats.biomes["help-center"] ?? 0, label: "Help Articles" },
		{ n: stats.biomes["museum"] ?? 0, label: "Museum Exhibits" },
		{ n: stats.biomes["safaris"] ?? 0, label: "Safaris" },
		{ n: stats.skills, label: "Skills" },
		{ n: stats.crushSessions, label: "Crush Sessions" },
		{ n: stats.claudeSessions, label: "Claude Sessions" },
		{ n: stats.biomes["snapshots"] ?? 0, label: "Snapshots" },
	]
		.map(
			({ n, label }) => `
		<div class="stat-card">
			<div class="stat-number">${n}</div>
			<div class="stat-label">${label}</div>
		</div>`,
		)
		.join("");

	// Biome quick-links grid
	const biomeLinks = [
		{ href: "/browse/specs", icon: "ruler", label: "Specs", biome: "specs" },
		{ href: "/browse/plans", icon: "clipboard-list", label: "Plans", biome: "plans" },
		{ href: "/browse/museum", icon: "landmark", label: "Museum", biome: "museum" },
		{ href: "/browse/safaris", icon: "map", label: "Safaris", biome: "safaris" },
		{ href: "/browse/help-center", icon: "book-open", label: "Help Center", biome: "help-center" },
		{ href: "/browse/security", icon: "shield", label: "Security", biome: "security" },
		{ href: "/browse/philosophy", icon: "leaf", label: "Philosophy", biome: "philosophy" },
		{ href: "/browse/guides", icon: "book-marked", label: "Guides", biome: "guides" },
		{ href: "/skills", icon: "sparkles", label: "Skills", biome: "skills" },
		{ href: "/agents", icon: "bot", label: "Agent Activity", biome: "agents" },
		{ href: "/timeline", icon: "clock", label: "Timeline", biome: "snapshots" },
		{ href: "/browse/scratch", icon: "pen-line", label: "Scratch", biome: "scratch" },
	]
		.map(
			({ href, icon, label, biome }) => `
		<a href="${href}" class="doc-card">
			<i data-lucide="${icon}" style="width:22px;height:22px;color:var(--accent-warm);margin-bottom:0.4rem;display:block;" aria-hidden="true"></i>
			<div class="doc-card-title">${label}</div>
			<div class="doc-card-footer">
				${biomeBadge(biome)}
				<span class="tag">${stats.biomes[biome] ?? 0} docs</span>
			</div>
		</a>`,
		)
		.join("");

	// Recent documents list
	const recentList = recentDocs
		.map(
			(doc) => `
		<a href="/docs/${escHtml(doc.slug)}" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border-subtle);text-decoration:none;color:inherit;">
			<span style="font-size:0.85rem;min-width:80px;color:var(--text-muted);font-family:var(--font-mono);">${escHtml(doc.lastUpdated?.slice(0, 10) ?? formatDate(new Date(doc.modifiedAt)).slice(0, 6))}</span>
			<span style="font-size:0.82rem;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(doc.title ?? doc.path)}</span>
			${biomeBadge(doc.biome)}
		</a>`,
		)
		.join("");

	// ccusage monthly table (most recent 6 months)
	const ccMonths = [...ccUsageMonthly].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
	const ccTotalCost = ccMonths.reduce((s, m) => s + m.totalCost, 0);
	const ccTotalInput = ccMonths.reduce((s, m) => s + (m.inputTokens ?? 0), 0);
	const ccTotalOutput = ccMonths.reduce((s, m) => s + (m.outputTokens ?? 0), 0);
	const ccTotalCacheWrite = ccMonths.reduce((s, m) => s + (m.cacheCreationTokens ?? 0), 0);
	const ccTotalCacheRead = ccMonths.reduce((s, m) => s + (m.cacheReadTokens ?? 0), 0);

	function fmtTok(n: number): string {
		if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
		return String(n);
	}

	const ccMonthRows = ccMonths
		.map((m) => {
			const [year, mo] = m.month.split("-");
			const monthLabel = new Date(Number(year), Number(mo) - 1).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			});
			const models = (m.modelsUsed ?? [])
				.slice(0, 2)
				.map(
					(model) =>
						`<span class="tag" style="font-size:0.65rem;">${escHtml(model.replace("claude-", "").replace(/-\d{8}$/, ""))}</span>`,
				)
				.join("");
			return `
		<div style="display:grid;grid-template-columns:80px 1fr 60px 60px 72px 72px 68px;gap:0.6rem;align-items:center;padding:0.35rem 0;border-bottom:1px solid var(--border-subtle);">
			<span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);">${escHtml(monthLabel)}</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">${models}</div>
			<span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);text-align:right;" title="Input tokens">${fmtTok(m.inputTokens ?? 0)}</span>
			<span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);text-align:right;" title="Output tokens">${fmtTok(m.outputTokens ?? 0)}</span>
			<span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-purple);text-align:right;" title="Cache write tokens">${fmtTok(m.cacheCreationTokens ?? 0)}</span>
			<span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-blue);text-align:right;" title="Cache read tokens">${fmtTok(m.cacheReadTokens ?? 0)}</span>
			<span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--accent-green);font-weight:500;text-align:right;">$${m.totalCost.toFixed(2)}</span>
		</div>`;
		})
		.join("");

	const ccSection =
		ccMonths.length === 0
			? ""
			: `
<div class="section-header mb-2">
	<span class="section-title">Claude API Usage</span>
	<span style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">via ccusage · last ${ccMonths.length} months</span>
</div>
<div class="glass-card mb-3" style="padding:0.75rem 1.25rem;">
	<!-- Aggregate totals -->
	<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-subtle);">
		<div>
			<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.2rem;">Total Cost</div>
			<div style="font-size:1.25rem;font-family:var(--font-display);color:var(--accent-green);">$${ccTotalCost.toFixed(2)}</div>
		</div>
		<div>
			<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.2rem;">Input</div>
			<div style="font-size:1.25rem;font-family:var(--font-display);color:var(--text-primary);">${fmtTok(ccTotalInput)}</div>
		</div>
		<div>
			<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.2rem;">Output</div>
			<div style="font-size:1.25rem;font-family:var(--font-display);color:var(--text-primary);">${fmtTok(ccTotalOutput)}</div>
		</div>
		<div>
			<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.2rem;">Cache Write ↑</div>
			<div style="font-size:1.25rem;font-family:var(--font-display);color:var(--accent-purple);">${fmtTok(ccTotalCacheWrite)}</div>
		</div>
		<div>
			<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.2rem;">Cache Read ↓</div>
			<div style="font-size:1.25rem;font-family:var(--font-display);color:var(--accent-blue);">${fmtTok(ccTotalCacheRead)}</div>
		</div>
	</div>
	<!-- Column headers -->
	<div style="display:grid;grid-template-columns:80px 1fr 60px 60px 72px 72px 68px;gap:0.6rem;padding-bottom:0.3rem;margin-bottom:0.1rem;border-bottom:1px solid var(--border-subtle);">
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">Month</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">Models</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);text-align:right;">Input</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);text-align:right;">Output</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent-purple);text-align:right;">Cache↑</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent-blue);text-align:right;">Cache↓</span>
		<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);text-align:right;">Cost</span>
	</div>
	${ccMonthRows}
</div>`;

	// Crush session snippets
	const crushRecent = crushSessions
		.slice(0, 6)
		.map(
			(s) => `
		<a href="/agents/crush/${escHtml(s.id)}" class="session-row" style="display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:0.65rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.title)}</div>
				<div class="session-meta">${formatDate(s.updatedAt)}</div>
			</div>
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-cost">$${(s.cost ?? 0).toFixed(2)}</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
		<div>
			<h1 class="page-title">🏔️ Cairn</h1>
			<p class="page-subtitle">Every stone: a session, a spec, a path taken.</p>
		</div>
		<div style="font-size:0.72rem;color:var(--text-muted);">
			Indexed ${formatDate(stats.indexedAt)} · <span class="kbd">/</span> to search
		</div>
	</div>
</div>

<!-- Stats -->
<div class="stats-grid">${statsCards}</div>

<!-- Agent activity summary -->
<div class="glass-card mb-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;padding:1rem 1.25rem;">
	<div>
		<div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Crush Total Cost</div>
		<div style="font-size:1.4rem;font-family:var(--font-display);color:var(--accent-green);">$${crushTotalCost.toFixed(2)}</div>
	</div>
	<div>
		<div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Total Tokens</div>
		<div style="font-size:1.4rem;font-family:var(--font-display);color:var(--accent-blue);">${(crushTotalTokens / 1000).toFixed(0)}k</div>
	</div>
	<div>
		<div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Claude Sessions</div>
		<div style="font-size:1.4rem;font-family:var(--font-display);color:var(--accent-warm);">${claudeSessions.length}</div>
	</div>
	<div>
		<div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Skills Available</div>
		<div style="font-size:1.4rem;font-family:var(--font-display);color:var(--accent-purple);">${stats.skills}</div>
	</div>
</div>

<!-- Browse grid -->
<div class="section-header mb-2">
	<span class="section-title">Browse</span>
</div>
<div class="doc-grid mb-3">${biomeLinks}</div>

<!-- ccusage monthly breakdown -->
${ccSection}

<!-- Two column: recent docs + crush sessions -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">

	<div>
		<div class="section-header mb-2">
			<span class="section-title">Recently Updated</span>
			<a href="/browse/specs" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">browse all →</a>
		</div>
		${recentList}
	</div>

	<div>
		<div class="section-header mb-2">
			<span class="section-title">Recent Crush Sessions</span>
			<a href="/agents/crush" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">all sessions →</a>
		</div>
		${crushRecent || '<div class="text-muted" style="font-style:italic;">No Crush sessions found.</div>'}
	</div>

</div>
`;
}
