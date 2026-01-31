import { error } from "@sveltejs/kit";
import { getTenantDb } from "$lib/server/services/database";
import matter from "@11ty/gray-matter";
import type { PageServerLoad } from "./$types.js";

interface PostRecord {
  slug: string;
  title: string;
  status?: string;
  tags?: string;
  description?: string;
  markdown_content?: string;
  html_content?: string;
  gutter_content?: string;
  last_synced?: string;
  updated_at?: string | number;
  published_at?: string | number;
  created_at?: string | number;
}

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // Auth check happens in admin layout
  // Feature flags (grafts) are loaded by admin layout and cascaded via data.grafts
  const { slug } = params;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  // Require tenant context for multi-tenant data access
  if (!locals.tenantId) {
    console.error("[Edit Post] No tenant ID found");
    throw error(403, "Tenant context required");
  }

  // Try D1 first using TenantDb for proper tenant scoping
  if (platform?.env?.DB) {
    try {
      const tenantDb = getTenantDb(platform.env.DB, {
        tenantId: locals.tenantId,
      });

      const post = await tenantDb.queryOne<PostRecord>("posts", "slug = ?", [
        slug,
      ]);

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
      console.error("[Edit Post] D1 fetch error:", err);
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
