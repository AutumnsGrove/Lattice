#!/usr/bin/env tsx
/**
 * KB Sync — Syncs Knowledge Base markdown files to D1.
 *
 * Scans docs/ directories, renders markdown to HTML, and upserts changed
 * articles into the kb_articles table. Unchanged articles (matching content
 * hash) are skipped to avoid unnecessary writes.
 *
 * Uses the Cloudflare D1 REST API with parameterized queries to handle
 * large HTML payloads that exceed D1's 100KB per-statement limit for raw SQL.
 *
 * Usage:
 *   pnpm run kb:sync                    # sync all categories
 *   pnpm run kb:sync:dry                # preview changes only
 *   pnpm run kb:sync -- --category specs # sync one category
 *
 * Required environment variables:
 *   CLOUDFLARE_ACCOUNT_ID — Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN  — API token with D1 write permissions
 *
 * The D1 database ID is read from apps/landing/wrangler.toml (DB binding).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import matter from "@11ty/gray-matter";
import MarkdownIt from "markdown-it";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../..");
const DOCS_ROOT = resolve(PROJECT_ROOT, "docs");

// Database ID from wrangler.toml (DB binding = grove-engine-db)
const D1_DATABASE_ID = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68";

/** Category → docs directory mapping (mirrors docs-scanner.ts) */
const CATEGORY_PATHS: Record<string, string> = {
	specs: join(DOCS_ROOT, "specs"),
	help: join(DOCS_ROOT, "help-center/articles"),
	legal: join(DOCS_ROOT, "legal"),
	marketing: join(DOCS_ROOT, "marketing"),
	patterns: join(DOCS_ROOT, "patterns"),
	philosophy: join(DOCS_ROOT, "philosophy"),
	design: join(DOCS_ROOT, "design-system"),
	exhibit: join(DOCS_ROOT, "museum"),
};

/** Categories that recursively scan subdirectories */
const RECURSIVE_CATEGORIES = new Set(["specs", "exhibit"]);

// ---------------------------------------------------------------------------
// Markdown rendering (mirrors docs-loader.ts)
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function generateHeadingId(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

const md = new MarkdownIt({ html: false, linkify: true });

// GroveTerm plugin — replaces [[term]] with <abbr> tags
let groveTermManifest: Record<string, Record<string, unknown>> = {};
try {
	const manifestPath = resolve(PROJECT_ROOT, "libs/engine/src/lib/data/grove-term-manifest.json");
	groveTermManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
} catch {
	console.warn("⚠ Could not load grove-term-manifest.json — term links disabled");
}

// Inline rule for [[term]] and [[term|display]]
md.inline.ruler.push("grove_term", (state, silent) => {
	if (state.src.charCodeAt(state.pos) !== 0x5b) return false; // [
	if (state.src.charCodeAt(state.pos + 1) !== 0x5b) return false; // [

	const start = state.pos + 2;
	const end = state.src.indexOf("]]", start);
	if (end === -1) return false;

	if (!silent) {
		const fullMatch = state.src.slice(start, end);
		const pipeIdx = fullMatch.indexOf("|");
		const termSlug = pipeIdx >= 0 ? fullMatch.slice(0, pipeIdx).trim() : fullMatch.trim();
		const displayText = pipeIdx >= 0 ? fullMatch.slice(pipeIdx + 1).trim() : fullMatch.trim();

		// Look up term in manifest
		const entry =
			groveTermManifest[termSlug] ||
			groveTermManifest[`your-${termSlug}`] ||
			groveTermManifest[termSlug.replace(/s$/, "")] ||
			groveTermManifest[`${termSlug}s`];

		const title = entry
			? `${entry.tagline || ""} — ${entry.definition || ""}`.trim().replace(/^— |— $/g, "")
			: termSlug;

		const token = state.push("grove_term", "abbr", 0);
		token.content = displayText;
		token.meta = { slug: termSlug, title };
	}

	state.pos = end + 2;
	return true;
});

md.renderer.rules.grove_term = (tokens, idx) => {
	const token = tokens[idx];
	const slug = escapeHtml(token.meta.slug);
	const title = escapeHtml(token.meta.title);
	const text = escapeHtml(token.content);
	return `<abbr class="grove-term" data-term="${slug}" title="${title}">${text}</abbr>`;
};

// Heading renderer — adds IDs for TOC navigation
md.renderer.rules.heading_open = function (tokens, idx, options, _env, self) {
	const token = tokens[idx];
	const inlineToken = tokens[idx + 1];
	const headingText = inlineToken?.content || "";
	token.attrSet("id", generateHeadingId(headingText));
	return self.renderToken(tokens, idx, options);
};

// Code block renderer — wraps with copy button UI
md.renderer.rules.fence = function (tokens, idx) {
	const token = tokens[idx];
	const lang = token.info || "text";
	const escapedCode = escapeHtml(token.content);

	return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-block-language">${lang}</span>
    <button class="code-block-copy" aria-label="Copy code to clipboard">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre><code class="language-${lang}">${escapedCode}</code></pre>
</div>\n`;
};

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

interface ScannedArticle {
	slug: string;
	category: string;
	title: string;
	description: string;
	html: string;
	headersJson: string;
	excerpt: string;
	readingTime: number;
	lastUpdated: string | null;
	contentHash: string;
	relatedJson: string;
	specCategory: string | null;
	helpSection: string | null;
	exhibitWing: string | null;
	icon: string | null;
	sortOrder: number;
}

function extractHeaders(markdown: string): Array<{ level: number; text: string; id: string }> {
	const headers: Array<{ level: number; text: string; id: string }> = [];
	const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
	const headerRegex = /^(#{1,6})\s+(.+)$/gm;
	let match;
	while ((match = headerRegex.exec(withoutCode)) !== null) {
		const level = match[1].length;
		const text = match[2].trim();
		headers.push({ level, text, id: generateHeadingId(text) });
	}
	return headers;
}

function calculateReadingTime(content: string): number {
	return Math.ceil(content.split(/\s+/).length / 200);
}

function generateExcerpt(content: string): string {
	const clean = content
		.replace(/^#+\s+.*$/gm, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.trim();
	const first = clean.split("\n\n")[0];
	return first.substring(0, 200).trim() + (first.length > 200 ? "..." : "");
}

function scanDirectory(dirPath: string, category: string): ScannedArticle[] {
	const articles: ScannedArticle[] = [];
	const seenSlugs = new Set<string>();
	const shouldRecurse = RECURSIVE_CATEGORIES.has(category);

	function walk(currentPath: string) {
		let items: string[];
		try {
			items = readdirSync(currentPath);
		} catch {
			return;
		}

		for (const item of items) {
			const fullPath = join(currentPath, item);
			let stat;
			try {
				stat = statSync(fullPath);
			} catch {
				continue;
			}

			if (stat.isDirectory() && shouldRecurse) {
				walk(fullPath);
			} else if (stat.isFile() && item.endsWith(".md")) {
				try {
					const raw = readFileSync(fullPath, "utf-8");
					const { data, content: markdownContent } = matter(raw);
					const slug = item.replace(".md", "");

					if (seenSlugs.has(slug)) continue;
					seenSlugs.add(slug);

					const contentHash = createHash("sha256").update(raw).digest("hex");
					const headers = extractHeaders(markdownContent);
					const html = md.render(markdownContent);

					const title =
						data.title || slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

					articles.push({
						slug,
						category,
						title,
						description: data.description || "",
						html,
						headersJson: JSON.stringify(headers),
						excerpt: data.description || generateExcerpt(markdownContent),
						readingTime: calculateReadingTime(markdownContent),
						lastUpdated: data.lastUpdated || null,
						contentHash,
						relatedJson: JSON.stringify(data.related || []),
						specCategory: data.specCategory || null,
						helpSection: data.section || null,
						exhibitWing: data.exhibitWing || null,
						icon: data.icon || null,
						sortOrder: data.order ?? 0,
					});
				} catch (err) {
					console.error(`  ✗ Error processing ${fullPath}:`, (err as Error).message);
				}
			}
		}
	}

	walk(dirPath);
	return articles.sort((a, b) => a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// D1 REST API
// ---------------------------------------------------------------------------

async function d1Query(
	sql: string,
	params: unknown[] = [],
): Promise<{ success: boolean; results?: unknown[] }> {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;

	if (!accountId || !apiToken) {
		throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN environment variables");
	}

	const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${D1_DATABASE_ID}/query`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sql, params }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`D1 API error (${response.status}): ${text}`);
	}

	const json = (await response.json()) as {
		success: boolean;
		result: Array<{ success: boolean; results: unknown[] }>;
		errors: unknown[];
	};

	if (!json.success) {
		throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
	}

	return { success: true, results: json.result?.[0]?.results };
}

/** Get existing content hashes from D1 */
async function getExistingHashes(): Promise<Map<string, string>> {
	const result = await d1Query("SELECT category, slug, content_hash FROM kb_articles");
	const map = new Map<string, string>();
	for (const row of (result.results || []) as Array<{
		category: string;
		slug: string;
		content_hash: string;
	}>) {
		map.set(`${row.category}:${row.slug}`, row.content_hash);
	}
	return map;
}

/** Upsert a single article to D1 via parameterized query */
async function upsertArticle(article: ScannedArticle): Promise<void> {
	await d1Query(
		`INSERT OR REPLACE INTO kb_articles
			(slug, category, title, description, html, headers_json, excerpt,
			 reading_time, last_updated, content_hash, related_json,
			 spec_category, help_section, exhibit_wing, icon, sort_order,
			 published, updated_at)
		VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1, datetime('now'))`,
		[
			article.slug,
			article.category,
			article.title,
			article.description,
			article.html,
			article.headersJson,
			article.excerpt,
			article.readingTime,
			article.lastUpdated,
			article.contentHash,
			article.relatedJson,
			article.specCategory,
			article.helpSection,
			article.exhibitWing,
			article.icon,
			article.sortOrder,
		],
	);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const categoryFilter = args.includes("--category") ? args[args.indexOf("--category") + 1] : null;

	console.log("🌿 KB Sync — Knowledge Base → D1\n");

	if (dryRun) {
		console.log("  (dry run — no changes will be written)\n");
	}

	// Scan all categories
	const allArticles: ScannedArticle[] = [];
	const categories = categoryFilter
		? { [categoryFilter]: CATEGORY_PATHS[categoryFilter] }
		: CATEGORY_PATHS;

	for (const [category, dirPath] of Object.entries(categories)) {
		if (!dirPath) {
			console.error(`  ✗ Unknown category: ${category}`);
			continue;
		}
		const articles = scanDirectory(dirPath, category);
		console.log(`  ${category}: ${articles.length} articles scanned`);
		allArticles.push(...articles);
	}

	console.log(`\n  Total: ${allArticles.length} articles\n`);

	if (dryRun) {
		// In dry-run mode, just show what would be synced
		for (const a of allArticles) {
			const htmlSize = new Blob([a.html]).size;
			console.log(
				`  ${a.category}/${a.slug} — ${a.title} (${(htmlSize / 1024).toFixed(1)}KB HTML)`,
			);
		}
		console.log("\n✓ Dry run complete");
		return;
	}

	// Get existing hashes to skip unchanged articles
	let existingHashes: Map<string, string>;
	try {
		existingHashes = await getExistingHashes();
		console.log(`  ${existingHashes.size} existing articles in D1\n`);
	} catch (err) {
		console.error("  ✗ Could not query existing hashes:", (err as Error).message);
		console.error("    Is the kb_articles table created? Run the migration first.");
		process.exit(1);
	}

	// Sync changed articles
	let synced = 0;
	let skipped = 0;
	let errors = 0;

	for (const article of allArticles) {
		const key = `${article.category}:${article.slug}`;
		const existingHash = existingHashes.get(key);

		if (existingHash === article.contentHash) {
			skipped++;
			continue;
		}

		const action = existingHash ? "update" : "insert";
		try {
			await upsertArticle(article);
			console.log(`  ✓ ${action}: ${article.category}/${article.slug}`);
			synced++;
		} catch (err) {
			console.error(
				`  ✗ ${action} failed: ${article.category}/${article.slug}:`,
				(err as Error).message,
			);
			errors++;
		}
	}

	// Detect deleted articles (in D1 but not in filesystem)
	const currentKeys = new Set(allArticles.map((a) => `${a.category}:${a.slug}`));
	const deleted: string[] = [];
	for (const key of existingHashes.keys()) {
		if (!currentKeys.has(key)) {
			deleted.push(key);
		}
	}

	if (deleted.length > 0) {
		console.log(`\n  Marking ${deleted.length} deleted articles as unpublished:`);
		for (const key of deleted) {
			const [category, slug] = key.split(":");
			try {
				await d1Query(
					"UPDATE kb_articles SET published = 0, updated_at = datetime('now') WHERE category = ?1 AND slug = ?2",
					[category, slug],
				);
				console.log(`  ✓ unpublished: ${key}`);
			} catch (err) {
				console.error(`  ✗ unpublish failed: ${key}:`, (err as Error).message);
				errors++;
			}
		}
	}

	console.log(`\n✓ Sync complete: ${synced} synced, ${skipped} unchanged, ${errors} errors`);
	if (errors > 0) process.exit(1);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
