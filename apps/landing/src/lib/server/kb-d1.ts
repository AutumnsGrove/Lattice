/**
 * D1-backed Knowledge Base loader.
 *
 * Replaces the filesystem-based docs-scanner.ts and docs-loader.ts for runtime use.
 * Articles are synced from docs/ markdown files to D1 at build time (see tools/kb-sync/).
 * At runtime, queries D1 for article metadata and content — fast, reliable, no
 * hydration of massive inline HTML that plagued the prerendered filesystem approach.
 */
import type { Doc, DocCategory, DocHeader, DocWithContent } from "$lib/types/docs";

/** Row shape from the kb_articles table */
interface KBArticleRow {
	slug: string;
	category: string;
	title: string;
	description: string;
	html: string;
	headers_json: string;
	excerpt: string;
	reading_time: number;
	last_updated: string | null;
	content_hash: string;
	related_json: string;
	spec_category: string | null;
	help_section: string | null;
	exhibit_wing: string | null;
	icon: string | null;
	sort_order: number;
}

/** Convert a D1 row to a Doc (listing metadata, no HTML) */
function rowToDoc(row: KBArticleRow): Doc {
	const doc: Doc = {
		slug: row.slug,
		title: row.title,
		description: row.description || undefined,
		excerpt: row.excerpt,
		category: row.category as DocCategory,
		lastUpdated: row.last_updated || undefined,
		readingTime: row.reading_time,
		icon: row.icon || undefined,
		related: safeParseJson<string[]>(row.related_json) || undefined,
	};

	if (row.spec_category) doc.specCategory = row.spec_category as Doc["specCategory"];
	if (row.help_section) doc.section = row.help_section as Doc["section"];
	if (row.exhibit_wing) doc.exhibitWing = row.exhibit_wing as Doc["exhibitWing"];

	return doc;
}

/** Convert a D1 row to a DocWithContent (full article with HTML + headers) */
function rowToDocWithContent(row: KBArticleRow): DocWithContent {
	return {
		...rowToDoc(row),
		content: "", // raw markdown not stored in D1 — not needed at runtime
		html: row.html,
		headers: safeParseJson<DocHeader[]>(row.headers_json) || [],
	};
}

/** Safely parse JSON with a fallback */
function safeParseJson<T>(json: string | null | undefined): T | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

const LISTING_COLUMNS = `slug, category, title, description, excerpt,
	reading_time, last_updated, related_json, spec_category, help_section,
	exhibit_wing, icon, sort_order`;

/**
 * Get a single article by category and slug.
 * Returns the full article with rendered HTML and headers for TOC.
 */
export async function getArticle(
	db: D1Database,
	category: string,
	slug: string,
): Promise<DocWithContent | null> {
	const row = await db
		.prepare(
			`SELECT slug, category, title, description, html, headers_json,
				excerpt, reading_time, last_updated, content_hash, related_json,
				spec_category, help_section, exhibit_wing, icon, sort_order
			FROM kb_articles
			WHERE category = ?1 AND slug = ?2 AND published = 1`,
		)
		.bind(category, slug)
		.first<KBArticleRow>();

	if (!row) return null;
	return rowToDocWithContent(row);
}

/**
 * List articles in a category (metadata only, no HTML).
 * Returns docs sorted by sort_order then title.
 */
export async function listArticles(db: D1Database, category: DocCategory): Promise<Doc[]> {
	const { results } = await db
		.prepare(
			`SELECT ${LISTING_COLUMNS}
			FROM kb_articles
			WHERE category = ?1 AND published = 1
			ORDER BY sort_order ASC, title ASC`,
		)
		.bind(category)
		.all<KBArticleRow>();

	return (results || []).map(rowToDoc);
}

/**
 * List all published articles across all categories (metadata only).
 */
export async function listAllArticles(db: D1Database): Promise<Doc[]> {
	const { results } = await db
		.prepare(
			`SELECT ${LISTING_COLUMNS}
			FROM kb_articles
			WHERE published = 1
			ORDER BY category ASC, sort_order ASC, title ASC`,
		)
		.all<KBArticleRow>();

	return (results || []).map(rowToDoc);
}

/**
 * Get content hashes for all articles (used by sync script to detect changes).
 */
export async function getContentHashes(db: D1Database): Promise<Map<string, string>> {
	const { results } = await db
		.prepare(`SELECT category, slug, content_hash FROM kb_articles`)
		.all<{ category: string; slug: string; content_hash: string }>();

	const map = new Map<string, string>();
	for (const row of results || []) {
		map.set(`${row.category}:${row.slug}`, row.content_hash);
	}
	return map;
}
