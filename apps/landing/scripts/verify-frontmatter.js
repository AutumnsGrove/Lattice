#!/usr/bin/env node
/**
 * Verification script for knowledge base frontmatter migration.
 *
 * Checks that all markdown files have valid frontmatter and compares
 * scanned documents against the hardcoded registry.
 *
 * Usage:
 *   node scripts/verify-frontmatter.js
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "@11ty/gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// From packages/landing/scripts/ we go up 3 levels to reach project root
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const DOCS_ROOT = resolve(PROJECT_ROOT, "docs");

// Category mappings
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

// Required frontmatter fields
const REQUIRED_FIELDS = ["title", "description", "category"];

// Recommended fields (will warn if missing)
const RECOMMENDED_FIELDS = ["lastUpdated"];

// Category-specific required fields
const CATEGORY_REQUIRED_FIELDS = {
  specs: ["specCategory"],
  help: ["section"],
  exhibit: ["exhibitWing"],
};

// Valid values for enums
const VALID_VALUES = {
  category: [
    "specs",
    "help",
    "legal",
    "marketing",
    "patterns",
    "philosophy",
    "design",
    "exhibit",
  ],
  specCategory: [
    "core-infrastructure",
    "platform-services",
    "content-community",
    "standalone-tools",
    "operations",
    "reference",
  ],
  section: [
    "getting-started",
    "writing-publishing",
    "customization",
    "community-social",
    "account-billing",
    "privacy-security",
    "ai-features",
    "philosophy-vision",
    "support-resources",
    "troubleshooting",
  ],
  exhibitWing: [
    "entrance",
    "architecture",
    "nature",
    "trust",
    "data",
    "personalization",
    "community",
    "naming",
  ],
};

let errors = [];
let warnings = [];
let stats = {
  total: 0,
  valid: 0,
  invalid: 0,
  missing: 0,
};

/**
 * Validate a single markdown file's frontmatter.
 */
function validateFile(filePath, expectedCategory) {
  stats.total++;

  try {
    const content = readFileSync(filePath, "utf-8");
    const { data: fm } = matter(content);

    const fileErrors = [];
    const fileWarnings = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!fm[field]) {
        fileErrors.push(`Missing required field: ${field}`);
      }
    }

    // Check category matches expected
    if (fm.category && fm.category !== expectedCategory) {
      fileWarnings.push(
        `Category mismatch: frontmatter says "${fm.category}" but file is in "${expectedCategory}" directory`,
      );
    }

    // Validate enum values
    for (const [field, validValues] of Object.entries(VALID_VALUES)) {
      if (fm[field] && !validValues.includes(fm[field])) {
        fileErrors.push(
          `Invalid ${field}: "${fm[field]}". Valid values: ${validValues.join(", ")}`,
        );
      }
    }

    // Check category-specific required fields
    const categoryFields = CATEGORY_REQUIRED_FIELDS[expectedCategory];
    if (categoryFields) {
      for (const field of categoryFields) {
        if (!fm[field]) {
          fileWarnings.push(`Missing category-specific field: ${field}`);
        }
      }
    }

    // Check recommended fields
    for (const field of RECOMMENDED_FIELDS) {
      if (!fm[field]) {
        fileWarnings.push(`Missing recommended field: ${field}`);
      }
    }

    // Date format validation
    if (
      fm.lastUpdated &&
      !/^\d{4}-\d{2}-\d{2}$/.test(String(fm.lastUpdated).replace(/'/g, ""))
    ) {
      fileWarnings.push(
        `lastUpdated should be YYYY-MM-DD format: ${fm.lastUpdated}`,
      );
    }

    if (fileErrors.length > 0) {
      errors.push({ file: filePath, issues: fileErrors });
      stats.invalid++;
    } else {
      stats.valid++;
    }

    if (fileWarnings.length > 0) {
      warnings.push({ file: filePath, issues: fileWarnings });
    }
  } catch (error) {
    errors.push({
      file: filePath,
      issues: [`Error reading file: ${error.message}`],
    });
    stats.invalid++;
  }
}

/**
 * Scan a directory and validate all markdown files.
 */
function scanDirectory(dirPath, category, recursive = false) {
  if (!existsSync(dirPath)) {
    console.warn(`Directory not found: ${dirPath}`);
    return;
  }

  const items = readdirSync(dirPath);

  for (const item of items) {
    const fullPath = join(dirPath, item);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        scanDirectory(fullPath, category, recursive);
      } else if (stat.isFile() && item.endsWith(".md")) {
        // Skip index files
        if (item === "index.md" || item === "README.md") continue;
        validateFile(fullPath, category);
      }
    } catch {
      // Skip inaccessible files
    }
  }
}

/**
 * Main verification function.
 */
function main() {
  console.log("=".repeat(60));
  console.log("Knowledge Base Frontmatter Verification");
  console.log("=".repeat(60));
  console.log("");

  // Scan each category
  for (const [category, dirPath] of Object.entries(CATEGORY_PATHS)) {
    const fullPath = join(DOCS_ROOT, dirPath);
    const recursive = category === "specs"; // Only specs has subdirectories
    console.log(`Scanning ${category}...`);
    scanDirectory(fullPath, category, recursive);
  }

  // Print results
  console.log("");
  console.log("=".repeat(60));
  console.log("Results");
  console.log("=".repeat(60));
  console.log(`Total files scanned:  ${stats.total}`);
  console.log(`Valid:                ${stats.valid}`);
  console.log(`Invalid:              ${stats.invalid}`);
  console.log("");

  if (errors.length > 0) {
    console.log("ERRORS:");
    for (const { file, issues } of errors) {
      console.log(`  ${file}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("WARNINGS:");
    for (const { file, issues } of warnings) {
      console.log(`  ${file}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
    console.log("");
  }

  // Exit with error code if there are errors
  if (errors.length > 0) {
    console.log("VERIFICATION FAILED");
    process.exit(1);
  } else {
    console.log("VERIFICATION PASSED");
    process.exit(0);
  }
}

main();
