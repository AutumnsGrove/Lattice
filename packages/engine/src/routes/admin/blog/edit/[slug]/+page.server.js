import { error } from "@sveltejs/kit";
import { getPostBySlug } from "$lib/utils/markdown.js";
import matter from "gray-matter";

export async function load({ params, platform, locals }) {
  // Auth check happens in admin layout
  const { slug } = params;
  const { tenantId } = locals;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  if (!tenantId) {
    throw error(401, "Tenant not authenticated");
  }

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const post = await platform.env.DB.prepare(
        `SELECT slug, title, date, tags, description, markdown_content, html_content, gutter_content, last_synced, updated_at
         FROM posts
         WHERE slug = ? AND tenant_id = ?`,
      )
        .bind(slug, tenantId)
        .first();

      if (post) {
        return {
          source: "d1",
          post: {
            ...post,
            tags: post.tags ? JSON.parse(/** @type {string} */ (post.tags)) : [],
            gutter_content: post.gutter_content || "[]",
          },
        };
      }
    } catch (err) {
      console.error("D1 fetch error:", err);
      // Fall through to filesystem fallback
    }
  }

  // Fallback to filesystem - need to read raw markdown
  try {
    // Use Vite's import.meta.glob to access raw markdown files
    const modules = import.meta.glob("/UserContent/Posts/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    });

    // Find the matching file
    const entry = Object.entries(modules).find(([filepath]) => {
      const filename = filepath.split("/").pop();
      if (!filename) return false;
      const fileSlug = filename.replace(".md", "");
      return fileSlug === slug;
    });

    if (!entry) {
      throw error(404, "Post not found");
    }

    const rawContent = /** @type {string} */ (entry[1]);
    const { data, content: markdownContent } = matter(rawContent);

    // TODO: Load gutter content from UserContent/Posts/{slug}/gutter/manifest.json
    // For now, return empty gutter for filesystem posts
    return {
      source: "filesystem",
      post: {
        slug,
        title: data.title || "Untitled",
        date: data.date || new Date().toISOString().split("T")[0],
        tags: data.tags || [],
        description: data.description || "",
        markdown_content: markdownContent,
        gutter_content: "[]",
      },
    };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && err.status === 404) throw err;
    console.error("Filesystem fetch error:", err);
    throw error(500, "Failed to fetch post");
  }
}
