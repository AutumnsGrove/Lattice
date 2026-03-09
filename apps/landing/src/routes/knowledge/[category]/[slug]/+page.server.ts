import { getArticle, listAllArticles } from "$lib/server/kb-d1";
import { loadDocBySlug } from "$lib/utils/docs-loader";
import { scanAllDocs } from "$lib/server/docs-scanner";
import type { Doc, DocCategory } from "$lib/types/docs";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { readFileSync } from "fs";
import { resolve } from "path";

// No prerender — articles are loaded from D1 at runtime (SSR at the edge).
// This replaces the filesystem-based prerender which caused hydration failures
// on large articles (95KB+ markdown). D1 queries are fast (<5ms) and the response
// is streamed, avoiding the massive inline data payload that choked hydration.

// Load grove term manifest at build time for "what-is-*" article banners.
// In production (Workers runtime), readFileSync won't work — the manifest
// is loaded during the build and bundled into the Worker.
let groveTermManifest: Record<string, Record<string, unknown>> = {};
try {
	const manifestPath = resolve(process.cwd(), "libs/engine/src/lib/data/grove-term-manifest.json");
	groveTermManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
} catch {
	// Expected in production — manifest is bundled, not read from filesystem
}

const validCategories: DocCategory[] = [
	"specs",
	"help",
	"legal",
	"marketing",
	"patterns",
	"philosophy",
	"design",
	"exhibit",
];

export const load: PageServerLoad = async ({ params, platform }) => {
	const { category, slug } = params;

	if (!validCategories.includes(category as DocCategory)) {
		throw error(404, "Category not found");
	}

	const db = platform?.env?.DB;

	// D1 runtime path (production)
	if (db) {
		const doc = await getArticle(db, category, slug);
		if (!doc) throw error(404, "Document not found");

		// Resolve related articles from D1
		let relatedArticles: Doc[] = [];
		if (doc.related && doc.related.length > 0) {
			const allDocs = await listAllArticles(db);
			relatedArticles = doc.related
				.slice(0, 3)
				.map((relatedSlug) => allDocs.find((d) => d.slug === relatedSlug))
				.filter((d): d is Doc => d !== undefined);
		}

		const groveTermEntry = resolveGroveTermEntry(slug);

		// Strip raw markdown (not stored in D1 anyway) — keep html and headers
		const { content: _raw, ...docForClient } = doc;

		return {
			doc: docForClient,
			relatedArticles,
			groveTermEntry,
		};
	}

	// Filesystem fallback (local development — no D1 available)
	return loadFromFilesystem(category as DocCategory, slug);
};

/** Filesystem-based loading for local development (preserves existing dev experience) */
function loadFromFilesystem(category: DocCategory, slug: string) {
	const doc = loadDocBySlug(slug, category);
	if (!doc) throw error(404, "Document not found");

	const { allDocs } = scanAllDocs();

	let relatedArticles: Doc[] = [];
	if (doc.related && doc.related.length > 0) {
		relatedArticles = doc.related
			.slice(0, 3)
			.map((relatedSlug) => allDocs.find((d) => d.slug === relatedSlug))
			.filter((d): d is Doc => d !== undefined);
	}

	const groveTermEntry = resolveGroveTermEntry(slug);
	const { content: _rawMarkdown, ...docForClient } = doc;

	return {
		doc: docForClient,
		relatedArticles,
		groveTermEntry,
	};
}

/** Resolve grove term banner data for "what-is-*" articles */
function resolveGroveTermEntry(slug: string) {
	if (!slug.startsWith("what-is-")) return null;

	const termPart = slug.replace("what-is-", "").replace("my-", "your-");
	const entry = groveTermManifest[termPart] || groveTermManifest[`your-${termPart}`];

	if (entry && entry.standardTerm) {
		return {
			term: entry.term as string,
			standardTerm: entry.standardTerm as string,
			alwaysGrove: entry.alwaysGrove as boolean | undefined,
			slug: entry.slug as string,
		};
	}
	return null;
}
