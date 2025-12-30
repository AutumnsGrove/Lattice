import { error } from "@sveltejs/kit";
import { getPostBySlug } from "$lib/utils/markdown.js";
import matter from "gray-matter";
import type { PageServerLoad } from "./$types.js";

interface PostRecord {
  slug: string;
  title: string;
  date?: string;
  tags?: string;
  description?: string;
  markdown_content?: string;
  html_content?: string;
  gutter_content?: string;
  last_synced?: string;
  updated_at?: string;
}

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // Auth check happens in admin layout
  const { slug } = params;
  const { tenantId } = locals;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  // Admin routes may not have tenantId set - handle gracefully
  // This allows admin to edit posts across tenants if needed
  const effectiveTenantId = tenantId || "admin";

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const post = (await platform.env.DB.prepare(
        `SELECT slug, title, date, tags, description, markdown_content, html_content, gutter_content, last_synced, updated_at
         FROM posts
         WHERE slug = ? AND tenant_id = ?`,
      )
        .bind(slug, effectiveTenantId)
        .first()) as PostRecord | null;

      if (post) {
        return {
          source: "d1",
          post: {
            ...post,
            tags: post.tags ? JSON.parse(post.tags as string) : [],
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
    }) as Record<string, string>;

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

    const rawContent = entry[1] as string;
    const { data, content: markdownContent } = matter(rawContent);

    // TODO: Load gutter content from UserContent/Posts/{slug}/gutter/manifest.json
    // For now, return empty gutter for filesystem posts
    return {
      source: "filesystem",
      post: {
        slug,
        title: (data.title as string) || "Untitled",
        date: (data.date as string) || new Date().toISOString().split("T")[0],
        tags: (data.tags as string[]) || [],
        description: (data.description as string) || "",
        markdown_content: markdownContent,
        gutter_content: "[]",
      },
    };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && err.status === 404)
      throw err;
    console.error("Filesystem fetch error:", err);
    throw error(500, "Failed to fetch post");
  }
};
