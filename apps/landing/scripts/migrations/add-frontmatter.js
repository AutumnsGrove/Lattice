#!/usr/bin/env node
/**
 * Migration: Add frontmatter to knowledge base markdown files
 *
 * This script migrates document metadata from the centralized knowledge-base.ts
 * registry into frontmatter of each markdown file, making the filesystem the
 * single source of truth.
 *
 * Usage:
 *   node scripts/migrations/add-frontmatter.js [options]
 *
 * Options:
 *   --dry-run           Show what would change without modifying files
 *   --category=specs    Only migrate a specific category
 *   --verbose           Show detailed output
 *   --force             Overwrite existing frontmatter fields
 *
 * Categories: specs, help, legal, marketing, patterns, philosophy, design, exhibit
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "@11ty/gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const FORCE = args.includes("--force");
const CATEGORY_ARG = args.find((a) => a.startsWith("--category="));
const TARGET_CATEGORY = CATEGORY_ARG ? CATEGORY_ARG.split("=")[1] : null;

// Paths - adjusted for running from apps/landing/
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..", "..");
const DOCS_ROOT = resolve(PROJECT_ROOT, "docs");
const KNOWLEDGE_BASE_PATH = resolve(
	__dirname,
	"..",
	"..",
	"src",
	"lib",
	"data",
	"knowledge-base.ts",
);

// Category directory mappings
const CATEGORY_PATHS = {
	specs: "specs",
	help: "help-center/articles",
	legal: "legal",
	marketing: "marketing",
	patterns: "patterns",
	philosophy: "philosophy",
	design: "design-system",
	exhibit: "museum",
};

// Stats
let stats = {
	total: 0,
	updated: 0,
	skipped: 0,
	notFound: 0,
	errors: 0,
};

/**
 * Parse the knowledge-base.ts file to extract document metadata.
 * This is a simplified parser that extracts the hardcoded arrays.
 */
function parseKnowledgeBase() {
	const content = readFileSync(KNOWLEDGE_BASE_PATH, "utf-8");

	// Extract each array using regex (simplified approach)
	const extractArray = (name) => {
		// Match the array declaration and its contents
		const regex = new RegExp(`export const ${name}:\\s*Doc\\[\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`, "m");
		const match = content.match(regex);
		if (!match) return [];

		// Parse the array content (this is a simplified parser)
		const arrayContent = match[1];
		const docs = [];
		let currentDoc = null;
		let braceDepth = 0;
		let docStart = -1;

		for (let i = 0; i < arrayContent.length; i++) {
			const char = arrayContent[i];
			if (char === "{") {
				if (braceDepth === 0) {
					docStart = i;
				}
				braceDepth++;
			} else if (char === "}") {
				braceDepth--;
				if (braceDepth === 0 && docStart !== -1) {
					const docStr = arrayContent.slice(docStart, i + 1);
					const doc = parseDocObject(docStr);
					if (doc) docs.push(doc);
					docStart = -1;
				}
			}
		}

		return docs;
	};

	return {
		specs: extractArray("specs"),
		helpArticles: extractArray("helpArticles"),
		legalDocs: extractArray("legalDocs"),
		marketingDocs: extractArray("marketingDocs"),
		patterns: extractArray("patterns"),
		philosophyDocs: extractArray("philosophyDocs"),
		designDocs: extractArray("designDocs"),
		exhibitDocs: extractArray("exhibitDocs"),
	};
}

/**
 * Parse a single document object string into a JS object.
 */
function parseDocObject(str) {
	try {
		// Extract key-value pairs using regex
		const doc = {};

		// slug
		const slugMatch = str.match(/slug:\s*["']([^"']+)["']/);
		if (slugMatch) doc.slug = slugMatch[1];

		// title
		const titleMatch = str.match(/title:\s*["']([^"']+)["']/);
		if (titleMatch) doc.title = titleMatch[1];

		// description (can be multi-line)
		const descMatch = str.match(/description:\s*["'](.+?)["'],?\s*\n/s);
		if (descMatch) doc.description = descMatch[1].replace(/\s+/g, " ").trim();

		// excerpt (can be multi-line, but we don't need it for frontmatter)

		// category
		const catMatch = str.match(/category:\s*["']([^"']+)["']/);
		if (catMatch) doc.category = catMatch[1];

		// specCategory
		const specCatMatch = str.match(/specCategory:\s*["']([^"']+)["']/);
		if (specCatMatch) doc.specCategory = specCatMatch[1];

		// section (for help articles)
		const sectionMatch = str.match(/section:\s*["']([^"']+)["']/);
		if (sectionMatch) doc.section = sectionMatch[1];

		// exhibitWing
		const wingMatch = str.match(/exhibitWing:\s*["']([^"']+)["']/);
		if (wingMatch) doc.exhibitWing = wingMatch[1];

		// icon
		const iconMatch = str.match(/icon:\s*["']([^"']+)["']/);
		if (iconMatch) doc.icon = iconMatch[1];

		// lastUpdated
		const dateMatch = str.match(/lastUpdated:\s*["']([^"']+)["']/);
		if (dateMatch) doc.lastUpdated = dateMatch[1];

		// related (array)
		const relatedMatch = str.match(/related:\s*\[([^\]]+)\]/);
		if (relatedMatch) {
			const relatedStr = relatedMatch[1];
			doc.related = relatedStr.match(/["']([^"']+)["']/g)?.map((s) => s.replace(/["']/g, ""));
		}

		return doc.slug ? doc : null;
	} catch (error) {
		console.error("Error parsing doc object:", error);
		return null;
	}
}

/**
 * Find the markdown file for a document.
 */
function findMarkdownFile(slug, category) {
	const categoryPath = CATEGORY_PATHS[category];
	if (!categoryPath) return null;

	const basePath = join(DOCS_ROOT, categoryPath);

	// Try direct path first
	const directPath = join(basePath, `${slug}.md`);
	if (existsSync(directPath)) return directPath;

	// For specs, also check completed/ subdirectory
	if (category === "specs") {
		const completedPath = join(basePath, "completed", `${slug}.md`);
		if (existsSync(completedPath)) return completedPath;
	}

	return null;
}

/**
 * Build frontmatter object from document metadata.
 */
function buildFrontmatter(doc, existingFrontmatter = {}) {
	const fm = {};

	// Required fields
	fm.title = doc.title;
	fm.description = doc.description;
	fm.category = doc.category;

	// Category-specific fields
	if (doc.specCategory) fm.specCategory = doc.specCategory;
	if (doc.section) fm.section = doc.section;
	if (doc.exhibitWing) fm.exhibitWing = doc.exhibitWing;

	// Optional fields
	if (doc.icon) fm.icon = doc.icon;
	if (doc.lastUpdated) fm.lastUpdated = doc.lastUpdated;
	if (doc.related && doc.related.length > 0) fm.related = doc.related;

	// Preserve existing Obsidian-style fields
	if (existingFrontmatter.aliases) fm.aliases = existingFrontmatter.aliases;
	if (existingFrontmatter.tags) fm.tags = existingFrontmatter.tags;
	if (existingFrontmatter.keywords) fm.keywords = existingFrontmatter.keywords;
	if (existingFrontmatter.order !== undefined) fm.order = existingFrontmatter.order;

	// Preserve published flag if explicitly set to false
	if (existingFrontmatter.published === false) fm.published = false;

	return fm;
}

/**
 * Update a single markdown file with new frontmatter.
 */
function updateMarkdownFile(filePath, doc) {
	try {
		const content = readFileSync(filePath, "utf-8");
		const { data: existingFrontmatter, content: markdownContent } = matter(content);

		// Check if required fields already exist and FORCE not set
		if (
			!FORCE &&
			existingFrontmatter.title &&
			existingFrontmatter.description &&
			existingFrontmatter.category
		) {
			if (VERBOSE) {
				console.log(`  Skipping ${doc.slug} - already has frontmatter`);
			}
			stats.skipped++;
			return;
		}

		// Build new frontmatter
		const newFrontmatter = buildFrontmatter(doc, existingFrontmatter);

		// Generate new file content
		const newContent = matter.stringify(markdownContent, newFrontmatter);

		if (DRY_RUN) {
			console.log(`\n[DRY RUN] Would update: ${filePath}`);
			console.log("New frontmatter:");
			console.log(JSON.stringify(newFrontmatter, null, 2));
		} else {
			writeFileSync(filePath, newContent, "utf-8");
			if (VERBOSE) {
				console.log(`  Updated: ${doc.slug}`);
			}
		}

		stats.updated++;
	} catch (error) {
		console.error(`Error updating ${filePath}:`, error.message);
		stats.errors++;
	}
}

/**
 * Migrate documents for a single category.
 */
function migrateCategory(categoryName, docs) {
	console.log(`\n=== Migrating ${categoryName} (${docs.length} docs) ===`);

	for (const doc of docs) {
		stats.total++;

		const filePath = findMarkdownFile(doc.slug, doc.category);

		if (!filePath) {
			console.warn(`  NOT FOUND: ${doc.slug} (${doc.category})`);
			stats.notFound++;
			continue;
		}

		updateMarkdownFile(filePath, doc);
	}
}

/**
 * Main migration function.
 */
function main() {
	console.log("=".repeat(60));
	console.log("Knowledge Base Frontmatter Migration");
	console.log("=".repeat(60));

	if (DRY_RUN) {
		console.log("\n*** DRY RUN MODE - No files will be modified ***\n");
	}

	if (FORCE) {
		console.log("*** FORCE MODE - Will overwrite existing frontmatter ***\n");
	}

	// Parse knowledge-base.ts
	console.log("Parsing knowledge-base.ts...");
	const docs = parseKnowledgeBase();

	// Map category names to document arrays
	const categoryMap = {
		specs: { name: "specs", docs: docs.specs },
		help: { name: "helpArticles", docs: docs.helpArticles },
		legal: { name: "legalDocs", docs: docs.legalDocs },
		marketing: { name: "marketingDocs", docs: docs.marketingDocs },
		patterns: { name: "patterns", docs: docs.patterns },
		philosophy: { name: "philosophyDocs", docs: docs.philosophyDocs },
		design: { name: "designDocs", docs: docs.designDocs },
		exhibit: { name: "exhibitDocs", docs: docs.exhibitDocs },
	};

	// Migrate selected category or all
	if (TARGET_CATEGORY) {
		const category = categoryMap[TARGET_CATEGORY];
		if (!category) {
			console.error(`Unknown category: ${TARGET_CATEGORY}`);
			console.error(`Valid categories: ${Object.keys(categoryMap).join(", ")}`);
			process.exit(1);
		}
		migrateCategory(category.name, category.docs);
	} else {
		for (const [key, category] of Object.entries(categoryMap)) {
			migrateCategory(category.name, category.docs);
		}
	}

	// Print summary
	console.log("\n" + "=".repeat(60));
	console.log("Migration Summary");
	console.log("=".repeat(60));
	console.log(`Total documents:  ${stats.total}`);
	console.log(`Updated:          ${stats.updated}`);
	console.log(`Skipped:          ${stats.skipped}`);
	console.log(`Not found:        ${stats.notFound}`);
	console.log(`Errors:           ${stats.errors}`);

	if (DRY_RUN) {
		console.log("\n*** This was a DRY RUN - run without --dry-run to apply ***");
	}
}

main();
