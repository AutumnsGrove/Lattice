import { loadDocBySlug } from "$lib/utils/docs-loader";
import { scanAllDocs } from "$lib/server/docs-scanner";
import type { Doc, DocCategory } from "$lib/types/docs";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { readFileSync } from "fs";
import { resolve } from "path";

// Prerender all knowledge base articles at build time
// This is required because Cloudflare Workers don't have filesystem access at runtime
// The docs-loader uses Node.js fs APIs which only work during the build process
export const prerender = true;

// Cache scanned docs at module level for entries + load
const { allDocs } = scanAllDocs();

// Load grove term manifest at build time for "what-is-*" article banners
let groveTermManifest: Record<string, any> = {};
try {
	const manifestPath = resolve(process.cwd(), "libs/engine/src/lib/data/grove-term-manifest.json");
	groveTermManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
} catch (e) {
	console.warn(
		"[Grove Mode] Could not load grove-term-manifest.json — article banners will be disabled:",
		(e as Error).message,
	);
}

// Generate entries for all known documents (scanned from filesystem)
export const entries: EntryGenerator = () => {
	return allDocs.map((doc) => ({
		category: doc.category,
		slug: doc.slug,
	}));
};

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

export const load: PageServerLoad = async ({ params }) => {
	const { category, slug } = params;

	// Validate category
	if (!validCategories.includes(category as DocCategory)) {
		throw error(404, "Category not found");
	}

	const doc = loadDocBySlug(slug, category as DocCategory);

	if (!doc) {
		throw error(404, "Document not found");
	}

	// Resolve related articles by slug (limit to 3 for clean presentation)
	let relatedArticles: Doc[] = [];
	if (doc.related && doc.related.length > 0) {
		relatedArticles = doc.related
			.slice(0, 3)
			.map((relatedSlug) => allDocs.find((d) => d.slug === relatedSlug))
			.filter((d): d is Doc => d !== undefined);
	}

	// For "what-is-*" articles, pass matching grove term data for the banner
	let groveTermEntry: {
		term: string;
		standardTerm?: string;
		alwaysGrove?: boolean;
		slug: string;
	} | null = null;
	if (slug.startsWith("what-is-")) {
		const termPart = slug.replace("what-is-", "").replace("my-", "your-");
		const entry = groveTermManifest[termPart] || groveTermManifest[`your-${termPart}`];
		if (entry && entry.standardTerm) {
			groveTermEntry = {
				term: entry.term,
				standardTerm: entry.standardTerm,
				alwaysGrove: entry.alwaysGrove,
				slug: entry.slug,
			};
		}
	}

	// Strip raw markdown content from the client payload — it's only needed for
	// server-side rendering. The page component uses doc.html and doc.headers.
	// For code-heavy specs like lattice-spec this saves ~47 KB of transfer.
	const { content: _rawMarkdown, ...docForClient } = doc;

	return {
		doc: docForClient,
		relatedArticles,
		groveTermEntry,
	};
};
