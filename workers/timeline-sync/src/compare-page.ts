/**
 * The side-by-side page (#1798, slice 4).
 *
 * The comparison is a thing to look at, not a thing to score. Both pages are
 * rendered by the same renderer the site uses, so vines land where a visitor would
 * see them and the only difference left is what was written.
 *
 * Everything here is a pure function of the two days, so it can be tested without
 * a worker, a database or a model.
 */

import { renderTimelineHtml, type TimelineVine } from "@autumnsgrove/curios/timeline/render";

/** A day as the current path stored it (`timeline_summaries`). */
export interface OldDay {
	brief: string | null;
	markdown: string;
	gutter: TimelineVine[];
	commitCount: number;
	/** The preset the old prompt was built from. The new path is compared in its default voice. */
	voice: string | null;
	model: string | null;
	cost: number;
}

/** A day as the new path produced it, in memory rather than from a row. */
export interface NewDay {
	/** `done`, `parked`, `failed`, or `empty` for a day with no activity. */
	status: string;
	brief: string | null;
	markdown: string;
	gutter: TimelineVine[];
	turns: number;
	cost: number;
	warnings: string[];
	error: string | null;
}

export interface ComparisonPageInput {
	tenantId: string;
	date: string;
	githubUsername: string;
	/** The tenant's preset, which the new side is written in. */
	voice: string | null;
	old: OldDay | null;
	next: NewDay;
}

export function buildComparisonPage(input: ComparisonPageInput): string {
	const { tenantId, date, githubUsername, voice, old, next } = input;

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Timeline comparison — ${escapeHtml(date)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
	<header>
		<p class="kicker">Timeline comparison</p>
		<h1>${escapeHtml(date)}</h1>
		<p class="meta">${escapeHtml(tenantId)} · ${escapeHtml(githubUsername)} · rendered with the site's own renderer</p>
	</header>

	<div class="columns">
		<section>
			<h2>The current path <span>one long prompt</span></h2>
			${old === null ? `<p class="missing">Nothing was stored for this day by the current path, so there is nothing to compare against.</p>` : renderOld(old, githubUsername)}
		</section>

		<section>
			<h2>The new path <span>Lyra, with tools</span></h2>
			${renderNew(next, githubUsername, voice)}
		</section>
	</div>
</main>
</body>
</html>`;
}

function renderOld(old: OldDay, githubUsername: string): string {
	const body = renderTimelineHtml({
		markdown: old.markdown,
		gutterItems: old.gutter,
		githubUsername,
	});
	const stats = [
		`${old.commitCount} commit${old.commitCount === 1 ? "" : "s"}`,
		old.voice === null ? null : `${escapeHtml(old.voice)} voice`,
		old.model === null ? null : escapeHtml(old.model),
		old.cost > 0 ? `$${old.cost.toFixed(4)}` : null,
	].filter((part) => part !== null);

	return `<article class="day">
	${old.brief === null ? "" : `<p class="brief">${escapeHtml(old.brief)}</p>`}
	<div class="prose">${body || `<p class="missing">An empty day.</p>`}</div>
	<p class="stats">${stats.join(" · ")}</p>
</article>`;
}

function renderNew(next: NewDay, githubUsername: string, voice: string | null): string {
	if (next.status === "empty") {
		return `<p class="missing">Nothing happened on any repo that day, so no run was made. The current path stores a day with no commits the same way: nothing at all.</p>`;
	}

	const body = renderTimelineHtml({
		markdown: next.markdown,
		gutterItems: next.gutter,
		githubUsername,
	});
	const stats = [
		`${next.turns} turn${next.turns === 1 ? "" : "s"}`,
		voice === null ? null : `${escapeHtml(voice)} voice`,
		next.cost > 0 ? `$${next.cost.toFixed(4)}` : null,
		next.status === "done" ? null : escapeHtml(next.status),
	].filter((part) => part !== null);

	return `<article class="day">
	${next.brief === null ? "" : `<p class="brief">${escapeHtml(next.brief)}</p>`}
	<div class="prose">${body || `<p class="missing">The run wrote no lines.</p>`}</div>
	<p class="stats">${stats.join(" · ")}</p>
	${next.error === null ? "" : `<p class="error">${escapeHtml(next.error)}</p>`}
	${renderWarnings(next.warnings)}
</article>`;
}

function renderWarnings(warnings: string[]): string {
	if (warnings.length === 0) {
		return "";
	}
	const items = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
	return `<div class="warnings"><p>Warnings</p><ul>${items}</ul></div>`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Warm and plain, the way the grove looks: two pages, nothing scored. */
const STYLES = `
	:root {
		--ink: #2b2a26;
		--ink-soft: #6b675e;
		--paper: #f7f4ec;
		--line: #e2dccd;
		--accent: #4a6b4f;
		--note: #fbf8ef;
		--error: #8c3b34;
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font: 16px/1.6 ui-serif, Georgia, "Iowan Old Style", serif;
	}
	main { max-width: 76rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
	header { margin-bottom: 2rem; }
	h1 { font-size: 2rem; margin: 0.2rem 0; }
	.kicker {
		margin: 0;
		font: 0.75rem/1.4 ui-monospace, monospace;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.meta { margin: 0.2rem 0 0; color: var(--ink-soft); font-size: 0.9rem; }
	.columns { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
	@media (min-width: 60rem) { .columns { grid-template-columns: 1fr 1fr; } }
	section {
		background: #fffdf8;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.25rem 1.35rem 1.5rem;
	}
	h2 { font-size: 1rem; margin: 0 0 1rem; }
	h2 span {
		display: block;
		font: 0.7rem/1.4 ui-monospace, monospace;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}
	h3 { font-size: 1.05rem; margin: 1.4rem 0 0.5rem; }
	.brief { font-size: 1.05rem; margin: 0 0 1.1rem; }
	.prose { position: relative; }
	.prose ul { padding-left: 1.2rem; }
	.prose li { margin: 0.35rem 0; }
	.header-gutter-group {
		margin: 0.35rem 0 0.8rem;
		padding: 0.4rem 0.7rem;
		background: var(--note);
		border-left: 2px solid var(--accent);
		border-radius: 0 0.5rem 0.5rem 0;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}
	.inline-gutter-comment {
		display: inline-flex;
		gap: 0.35rem;
		align-items: baseline;
		margin-left: 0.4rem;
		padding: 0.1rem 0.5rem;
		background: var(--note);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}
	.inline-gutter-comment svg { flex: none; opacity: 0.6; }
	.anchor-marker { display: inline; }
	.stats {
		margin: 1.2rem 0 0;
		font: 0.78rem/1.5 ui-monospace, monospace;
		color: var(--ink-soft);
	}
	.missing { color: var(--ink-soft); font-style: italic; }
	.error { color: var(--error); font-size: 0.9rem; }
	.warnings { margin-top: 1rem; font-size: 0.85rem; color: var(--ink-soft); }
	.warnings p { margin: 0 0 0.3rem; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; }
	.warnings ul { margin: 0; padding-left: 1.1rem; }
	a { color: var(--accent); }
`;
