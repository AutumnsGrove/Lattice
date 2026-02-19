/**
 * Frontmatter-based document scanner for the knowledge base.
 *
 * This module scans markdown files and extracts metadata from frontmatter,
 * making the filesystem the single source of truth for document listings.
 *
 * Drop a .md file with proper frontmatter in the right directory and it
 * automatically appears in the knowledge base. No registry updates needed.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import matter from "@11ty/gray-matter";
import type {
	Doc,
	DocCategory,
	DocFrontmatter,
	SpecCategory,
	HelpSection,
	ExhibitWing,
} from "$lib/types/docs";

// Docs are at project root - landing is at apps/landing/
// so we need to go up two levels to reach the repo root
const DOCS_ROOT = resolve(process.cwd(), "..", "..", "docs");

/**
 * Category directory mappings.
 * Maps DocCategory to the actual directory path relative to DOCS_ROOT.
 */
const CATEGORY_PATHS: Record<DocCategory, string> = {
	specs: "specs",
	help: "help-center/articles",
	legal: "legal",
	marketing: "marketing",
	patterns: "patterns",
	philosophy: "philosophy",
	design: "design-system",
	exhibit: "museum",
};

/**
 * Categories that should recursively include subdirectories.
 * - specs: includes completed specs in specs/completed/
 * - exhibit: museum wings organized in subdirectories (architecture/, nature/, etc.)
 * - philosophy: naming-research journeys in subdirectory (published: false keeps them out of listings)
 * - Other categories may have internal scratch folders that shouldn't be public
 */
const RECURSIVE_CATEGORIES: DocCategory[] = ["specs", "exhibit", "philosophy"];

/**
 * Valid values for category-specific fields.
 * Used for validation during scanning.
 */
const VALID_SPEC_CATEGORIES: SpecCategory[] = [
	"core-infrastructure",
	"platform-services",
	"content-community",
	"standalone-tools",
	"operations",
	"reference",
];

const VALID_HELP_SECTIONS: HelpSection[] = [
	"getting-started",
	"how-it-works",
	"writing-publishing",
	"customization",
	"community-social",
	"account-billing",
	"privacy-security",
	"ai-features",
	"philosophy-vision",
	"support-resources",
	"troubleshooting",
];

const VALID_EXHIBIT_WINGS: ExhibitWing[] = [
	"entrance",
	"architecture",
	"nature",
	"trust",
	"data",
	"personalization",
	"community",
	"naming",
];

/**
 * Calculate reading time based on word count.
 */
function calculateReadingTime(content: string): number {
	const wordsPerMinute = 200;
	const wordCount = content.split(/\s+/).length;
	return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Generate an excerpt from markdown content.
 */
function generateExcerpt(content: string, maxLength = 200): string {
	// Remove markdown headers and formatting
	const cleanContent = content
		.replace(/^#+\s+.*$/gm, "") // Remove headers
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
		.replace(/[*_`]/g, "") // Remove emphasis markers
		.trim();

	const firstParagraph = cleanContent.split("\n\n")[0];
	const excerpt = firstParagraph.substring(0, maxLength).trim();

	return excerpt + (firstParagraph.length > maxLength ? "..." : "");
}

/**
 * Validation result for frontmatter parsing.
 */
interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validate frontmatter fields for a document.
 */
function validateFrontmatter(
	frontmatter: Partial<DocFrontmatter>,
	filePath: string,
): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Required fields
	if (!frontmatter.title) {
		errors.push(`Missing required field: title`);
	}
	if (!frontmatter.description) {
		errors.push(`Missing required field: description`);
	}
	if (!frontmatter.category) {
		errors.push(`Missing required field: category`);
	} else if (!Object.keys(CATEGORY_PATHS).includes(frontmatter.category)) {
		errors.push(`Invalid category: ${frontmatter.category}`);
	}

	// Category-specific validation
	if (frontmatter.category === "specs") {
		if (!frontmatter.specCategory) {
			warnings.push(`Spec missing specCategory`);
		} else if (!VALID_SPEC_CATEGORIES.includes(frontmatter.specCategory as SpecCategory)) {
			errors.push(`Invalid specCategory: ${frontmatter.specCategory}`);
		}
	}

	if (frontmatter.category === "help") {
		if (!frontmatter.section) {
			warnings.push(`Help article missing section`);
		} else if (!VALID_HELP_SECTIONS.includes(frontmatter.section as HelpSection)) {
			errors.push(`Invalid section: ${frontmatter.section}`);
		}
	}

	if (frontmatter.category === "exhibit") {
		if (!frontmatter.exhibitWing) {
			warnings.push(`Exhibit missing exhibitWing`);
		} else if (!VALID_EXHIBIT_WINGS.includes(frontmatter.exhibitWing as ExhibitWing)) {
			errors.push(`Invalid exhibitWing: ${frontmatter.exhibitWing}`);
		}
	}

	// Date format validation
	if (frontmatter.lastUpdated) {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(frontmatter.lastUpdated)) {
			warnings.push(`lastUpdated should be in YYYY-MM-DD format: ${frontmatter.lastUpdated}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Internal doc type with file path for content loading.
 */
interface ScannedDoc extends Doc {
	_filePath: string;
}

/**
 * Parse a single markdown file and extract document metadata from frontmatter.
 * Returns null if the document should be skipped (unpublished, invalid, etc.)
 */
function parseDocFromFile(filePath: string, category: DocCategory): ScannedDoc | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const { data: frontmatter, content: markdownContent } = matter(content);

		// Skip if explicitly unpublished
		if (frontmatter.published === false) {
			return null;
		}

		// Skip index files
		const filename = filePath.split("/").pop() || "";
		if (filename === "index.md" || filename === "README.md") {
			return null;
		}

		// Validate frontmatter
		const validation = validateFrontmatter(frontmatter, filePath);
		if (!validation.valid) {
			console.warn(`Skipping ${filePath}: ${validation.errors.join(", ")}`);
			return null;
		}
		if (validation.warnings.length > 0) {
			console.warn(`Warnings in ${filePath}: ${validation.warnings.join(", ")}`);
		}

		// Extract slug from filename
		const slug = filename.replace(".md", "");

		// Build the Doc object from frontmatter
		const doc: ScannedDoc = {
			slug,
			title: frontmatter.title,
			description: frontmatter.description,
			excerpt: frontmatter.description || generateExcerpt(markdownContent),
			category: frontmatter.category || category,
			lastUpdated: frontmatter.lastUpdated || new Date().toISOString().split("T")[0],
			readingTime: calculateReadingTime(markdownContent),
			_filePath: filePath,
		};

		// Add optional fields if present
		if (frontmatter.icon) doc.icon = frontmatter.icon;
		if (frontmatter.specCategory) doc.specCategory = frontmatter.specCategory;
		if (frontmatter.section) doc.section = frontmatter.section;
		if (frontmatter.exhibitWing) doc.exhibitWing = frontmatter.exhibitWing;
		if (frontmatter.related) doc.related = frontmatter.related;
		if (frontmatter.keywords) doc.keywords = frontmatter.keywords;
		if (frontmatter.order !== undefined) doc.order = frontmatter.order;

		return doc;
	} catch (error) {
		console.error(`Error parsing ${filePath}:`, error);
		return null;
	}
}

/**
 * Scan a directory for markdown documents.
 * Optionally recurses into subdirectories for certain categories.
 */
function scanDirectory(dirPath: string, category: DocCategory): ScannedDoc[] {
	const docs: ScannedDoc[] = [];
	const seenSlugs = new Set<string>();
	const shouldRecurse = RECURSIVE_CATEGORIES.includes(category);

	function readDirRecursive(currentPath: string) {
		if (!existsSync(currentPath)) {
			console.warn(`Directory not found: ${currentPath}`);
			return;
		}

		let items: string[];
		try {
			items = readdirSync(currentPath);
		} catch (error) {
			console.error(`Error reading directory ${currentPath}:`, error);
			return;
		}

		for (const item of items) {
			const fullPath = join(currentPath, item);

			// Gracefully handle broken symlinks or inaccessible files
			let stat;
			try {
				stat = statSync(fullPath);
			} catch {
				console.warn(`Skipping inaccessible file: ${fullPath}`);
				continue;
			}

			if (stat.isDirectory() && shouldRecurse) {
				readDirRecursive(fullPath);
			} else if (stat.isFile() && item.endsWith(".md")) {
				const doc = parseDocFromFile(fullPath, category);

				if (doc) {
					// Detect duplicate slugs
					if (seenSlugs.has(doc.slug)) {
						console.warn(`Duplicate slug "${doc.slug}" found at ${fullPath}, skipping`);
						continue;
					}

					seenSlugs.add(doc.slug);
					docs.push(doc);
				}
			}
		}
	}

	readDirRecursive(dirPath);

	// Sort by order field (if present), then by title
	return docs.sort((a, b) => {
		if (a.order !== undefined && b.order !== undefined) {
			return a.order - b.order;
		}
		if (a.order !== undefined) return -1;
		if (b.order !== undefined) return 1;
		return a.title.localeCompare(b.title);
	});
}

/**
 * Scan a single category and return documents.
 */
export function scanDocsCategory(category: DocCategory): Doc[] {
	const dirPath = join(DOCS_ROOT, CATEGORY_PATHS[category]);
	const docs = scanDirectory(dirPath, category);

	// Remove internal _filePath from returned docs
	return docs.map(({ _filePath, ...doc }) => doc);
}

/**
 * Scan all categories and return the complete document collections.
 */
export function scanAllDocs(): {
	specs: Doc[];
	helpArticles: Doc[];
	legalDocs: Doc[];
	marketingDocs: Doc[];
	patterns: Doc[];
	philosophyDocs: Doc[];
	designDocs: Doc[];
	exhibitDocs: Doc[];
	allDocs: Doc[];
} {
	const specs = scanDocsCategory("specs");
	const helpArticles = scanDocsCategory("help");
	const legalDocs = scanDocsCategory("legal");
	const marketingDocs = scanDocsCategory("marketing");
	const patterns = scanDocsCategory("patterns");
	const philosophyDocs = scanDocsCategory("philosophy");
	const designDocs = scanDocsCategory("design");
	const exhibitDocs = scanDocsCategory("exhibit");

	const allDocs = [
		...specs,
		...helpArticles,
		...legalDocs,
		...marketingDocs,
		...patterns,
		...philosophyDocs,
		...designDocs,
		...exhibitDocs,
	];

	return {
		specs,
		helpArticles,
		legalDocs,
		marketingDocs,
		patterns,
		philosophyDocs,
		designDocs,
		exhibitDocs,
		allDocs,
	};
}

/**
 * Find a document by slug within a category.
 * Returns the document with its file path for content loading.
 */
export function findDocBySlug(slug: string, category: DocCategory): ScannedDoc | null {
	// Sanitize slug to prevent path traversal attacks
	if (!slug || slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
		return null;
	}

	const dirPath = join(DOCS_ROOT, CATEGORY_PATHS[category]);
	const docs = scanDirectory(dirPath, category);

	return docs.find((d) => d.slug === slug) || null;
}

/**
 * Get the file path for a document.
 * Used by docs-loader.ts to load full content.
 */
export function getDocFilePath(slug: string, category: DocCategory): string | null {
	const doc = findDocBySlug(slug, category);
	return doc?._filePath || null;
}
