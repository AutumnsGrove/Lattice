#!/usr/bin/env node
/**
 * Update: AutumnsGrove Posts with actual content from source D1
 *
 * The original migration created post records but content wasn't transferred.
 * This script pulls content from the source database and updates the destination.
 *
 * Usage:
 *   node scripts/migrations/update-autumnsgrove-posts.js [--dry-run]
 *
 * Source: autumnsgrove-posts (510badf3-457a-4892-bf2a-45d4bfd7a7bb)
 * Destination: grove-engine-db (a6394da2-b7a6-48ce-b7fe-b1eb3e730e68)
 * Tenant: autumn-primary (subdomain: autumn)
 */

import { execFileSync } from "child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_DB = "autumnsgrove-posts";
const DEST_DB = "grove-engine-db";
const TENANT_ID = "autumn-primary";

/**
 * Execute a wrangler D1 command and return JSON results
 */
function d1Execute(database, sql) {
  const args = [
    "d1",
    "execute",
    database,
    "--command",
    sql,
    "--remote",
    "--json",
  ];

  try {
    const output = execFileSync("wrangler", args, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large content
    });
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      return results[0]?.results || [];
    }
    return [];
  } catch (error) {
    console.error("D1 Execute Error:", error.message);
    console.error(
      "SQL:",
      sql.substring(0, 200) + (sql.length > 200 ? "..." : ""),
    );
    throw error;
  }
}

/**
 * Escape a string for SQL (single quotes)
 */
function sqlEscape(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

/**
 * Calculate word count from markdown content
 */
function getWordCount(markdown) {
  if (!markdown) return 0;
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/<!--.*?-->/g, "");

  return plainText.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate reading time in minutes (~200 words per minute)
 */
function getReadingTime(wordCount) {
  return Math.ceil(wordCount / 200);
}

async function main() {
  console.log("=".repeat(60));
  console.log("  AutumnsGrove Posts Content Update");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Source DB: ${SOURCE_DB}`);
  console.log(`Dest DB: ${DEST_DB}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log("");

  // Step 1: Get all posts from source with their content
  console.log("📥 Fetching posts from source database...");

  // Fetch posts one at a time to avoid buffer issues
  const slugResults = d1Execute(SOURCE_DB, "SELECT slug FROM posts");
  const slugs = slugResults.map((r) => r.slug);
  console.log(`   Found ${slugs.length} posts in source`);
  console.log("");

  // Step 2: Get existing posts in destination to match IDs
  console.log("🔍 Fetching destination posts for ID matching...");
  const destPosts = d1Execute(
    DEST_DB,
    `SELECT id, slug FROM posts WHERE tenant_id = '${TENANT_ID}'`,
  );
  const destIdMap = new Map(destPosts.map((p) => [p.slug, p.id]));
  console.log(`   Found ${destIdMap.size} posts in destination`);
  console.log("");

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Step 3: For each post, fetch full content and update destination
  console.log("📝 Updating posts with content...");
  console.log("-".repeat(40));

  for (const slug of slugs) {
    const destId = destIdMap.get(slug);

    if (!destId) {
      console.log(`⏭️  Skipping "${slug}" (not in destination)`);
      skipped++;
      continue;
    }

    try {
      // Fetch the full post content from source
      const [sourcePost] = d1Execute(
        SOURCE_DB,
        `SELECT * FROM posts WHERE slug = ${sqlEscape(slug)}`,
      );

      if (!sourcePost) {
        console.log(`⚠️  No source data for "${slug}"`);
        skipped++;
        continue;
      }

      const { title, markdown_content, html_content, gutter_content } =
        sourcePost;

      // Skip if no content
      if (!markdown_content || markdown_content.length === 0) {
        console.log(`⏭️  Skipping "${title}" (no source content)`);
        skipped++;
        continue;
      }

      console.log(`📝 Updating "${title}"...`);
      console.log(`   Source content: ${markdown_content.length} chars`);

      const wordCount = getWordCount(markdown_content);
      const readingTime = getReadingTime(wordCount);
      const now = Math.floor(Date.now() / 1000);

      // Ensure gutter_content is valid JSON
      let gutterJson = gutter_content || "[]";
      try {
        JSON.parse(gutterJson);
      } catch {
        gutterJson = "[]";
      }

      const updateSql = `
        UPDATE posts SET
          markdown_content = ${sqlEscape(markdown_content)},
          html_content = ${sqlEscape(html_content)},
          gutter_content = ${sqlEscape(gutterJson)},
          word_count = ${wordCount},
          reading_time = ${readingTime},
          updated_at = ${now}
        WHERE id = ${sqlEscape(destId)}
      `
        .replace(/\n/g, " ")
        .trim();

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would update post ${destId}`);
        console.log(
          `   - Content: ${markdown_content.length} chars markdown, ${(html_content || "").length} chars HTML`,
        );
        console.log(
          `   - Words: ${wordCount}, Reading time: ${readingTime} min`,
        );
        updated++;
      } else {
        d1Execute(DEST_DB, updateSql);
        console.log(
          `   ✅ Updated (${wordCount} words, ${readingTime} min read)`,
        );
        updated++;
      }
    } catch (error) {
      console.error(`   ❌ Failed for "${slug}": ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("  Update Summary");
  console.log("=".repeat(60));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors:  ${errors}`);
  console.log("");

  if (DRY_RUN) {
    console.log(
      "This was a dry run. Run without --dry-run to perform the update.",
    );
  } else if (updated > 0) {
    console.log("🎉 Update complete! Verify at: https://autumn.grove.place");
  }
}

main().catch(console.error);
