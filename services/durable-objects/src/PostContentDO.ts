/// <reference types="@cloudflare/workers-types" />

/**
 * PostContentDO - Per-Post Durable Object for Content Caching
 *
 * Handles static content that rarely changes:
 * - Cached rendered HTML
 * - Markdown source
 * - Post metadata (title, description, tags)
 *
 * This DO hibernates quickly since content doesn't change often.
 * Separated from PostMetaDO for cost efficiency.
 *
 * ID Pattern: content:{tenantId}:{slug}
 *
 * Part of the Loom pattern - Grove's coordination layer.
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
	safeJsonParse,
} from "@autumnsgrove/lattice/loom";

// ============================================================================
// Types
// ============================================================================

export interface PostContent {
	tenantId: string;
	slug: string;
	title: string;
	description: string;
	tags: string[];
	markdownContent: string;
	htmlContent: string;
	gutterContent: string;
	font: string;
	publishedAt: number | null;
	updatedAt: number;
	storageLocation: "hot" | "warm" | "cold";
	r2Key?: string;
}

export interface ContentUpdate {
	title?: string;
	description?: string;
	tags?: string[];
	markdownContent?: string;
	htmlContent?: string;
	gutterContent?: string;
	font?: string;
}

interface ContentEnv extends Record<string, unknown> {
	DB: D1Database;
	IMAGES: R2Bucket;
}

// ============================================================================
// PostContentDO Class
// ============================================================================

const STORE_KEY = "post_content";

export class PostContentDO extends LoomDO<PostContent, ContentEnv> {
	config(): LoomConfig {
		return { name: "PostContentDO" };
	}

	/**
	 * Use the existing "content" table name for backwards compatibility
	 * with data already stored in production DOs.
	 */
	protected schema(): string {
		return `
      CREATE TABLE IF NOT EXISTS content (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
	}

	protected async loadState(): Promise<PostContent | null> {
		// Load from the existing "content" table directly (not the kv_store table)
		// to maintain backwards compatibility with pre-Loom data.
		const row = this.sql.queryOne<{ value: string }>(
			"SELECT value FROM content WHERE key = ?",
			STORE_KEY,
		);
		if (!row?.value) return null;
		return safeJsonParse<PostContent | null>(row.value, null);
	}

	routes(): LoomRoute[] {
		return [
			{ method: "GET", path: "/content", handler: () => this.getContent() },
			{
				method: "PUT",
				path: "/content",
				handler: (ctx) => this.setContent(ctx),
			},
			{
				method: "PATCH",
				path: "/content",
				handler: (ctx) => this.updateContent(ctx),
			},
			{ method: "GET", path: "/content/html", handler: () => this.getHtml() },
			{
				method: "POST",
				path: "/content/invalidate",
				handler: () => this.invalidate(),
			},
			{
				method: "POST",
				path: "/content/migrate",
				handler: (ctx) => this.migrateToCold(ctx),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Route Handlers — Business Logic Only
	// ════════════════════════════════════════════════════════════════════

	private async getContent(): Promise<Response> {
		if (!this.state_data) {
			return new Response("Content not found", { status: 404 });
		}

		if (this.state_data.storageLocation === "cold" && this.state_data.r2Key) {
			const r2Content = await this.fetchFromR2(this.state_data.r2Key);
			if (r2Content) {
				return Response.json({ ...this.state_data, ...r2Content });
			}
		}

		return Response.json(this.state_data);
	}

	private async setContent(ctx: LoomRequestContext): Promise<Response> {
		const data = (await ctx.request.json()) as PostContent;

		if (!data.tenantId || !data.slug || !data.title) {
			return new Response("Missing required fields", { status: 400 });
		}

		this.state_data = {
			tenantId: data.tenantId,
			slug: data.slug,
			title: data.title,
			description: data.description || "",
			tags: data.tags || [],
			markdownContent: data.markdownContent || "",
			htmlContent: data.htmlContent || "",
			gutterContent: data.gutterContent || "[]",
			font: data.font || "default",
			publishedAt: data.publishedAt || null,
			updatedAt: Date.now(),
			storageLocation: "hot",
		};

		await this.persistContent();
		return Response.json({ success: true, content: this.state_data });
	}

	private async updateContent(ctx: LoomRequestContext): Promise<Response> {
		if (!this.state_data) {
			return new Response("Content not found", { status: 404 });
		}

		const updates = (await ctx.request.json()) as ContentUpdate;

		if (updates.title !== undefined) this.state_data.title = updates.title;
		if (updates.description !== undefined) this.state_data.description = updates.description;
		if (updates.tags !== undefined) this.state_data.tags = updates.tags;
		if (updates.markdownContent !== undefined)
			this.state_data.markdownContent = updates.markdownContent;
		if (updates.htmlContent !== undefined) this.state_data.htmlContent = updates.htmlContent;
		if (updates.gutterContent !== undefined) this.state_data.gutterContent = updates.gutterContent;
		if (updates.font !== undefined) this.state_data.font = updates.font;

		this.state_data.updatedAt = Date.now();
		await this.persistContent();
		return Response.json({ success: true, content: this.state_data });
	}

	private async getHtml(): Promise<Response> {
		if (!this.state_data) {
			return new Response("Content not found", { status: 404 });
		}

		if (this.state_data.storageLocation === "cold" && this.state_data.r2Key) {
			const r2Content = await this.fetchFromR2(this.state_data.r2Key);
			if (r2Content?.htmlContent) {
				return new Response(r2Content.htmlContent, {
					headers: { "Content-Type": "text/html" },
				});
			}
		}

		return new Response(this.state_data.htmlContent, {
			headers: { "Content-Type": "text/html" },
		});
	}

	private async invalidate(): Promise<Response> {
		this.state_data = null;
		this.sql.exec("DELETE FROM content WHERE key = ?", STORE_KEY);
		return Response.json({ success: true, message: "Content invalidated" });
	}

	private async migrateToCold(ctx: LoomRequestContext): Promise<Response> {
		if (!this.state_data) {
			return new Response("Content not found", { status: 404 });
		}

		const data = (await ctx.request.json()) as { r2Key: string };

		if (!data.r2Key) {
			return new Response("R2 key required", { status: 400 });
		}

		const r2 = this.env.IMAGES;
		if (!r2) {
			return new Response("R2 not configured", { status: 500 });
		}

		const contentPayload = JSON.stringify({
			markdownContent: this.state_data.markdownContent,
			htmlContent: this.state_data.htmlContent,
			gutterContent: this.state_data.gutterContent,
		});

		// Upload to R2 with retry logic
		const maxRetries = 3;
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await r2.put(data.r2Key, contentPayload, {
					httpMetadata: { contentType: "application/json" },
				});

				const verification = await r2.head(data.r2Key);
				if (!verification) {
					throw new Error("R2 upload verification failed - object not found");
				}

				// Atomic: prepare → persist to SQL → update memory
				const updatedContent: PostContent = {
					...this.state_data,
					markdownContent: "",
					htmlContent: "",
					gutterContent: "[]",
					storageLocation: "cold",
					r2Key: data.r2Key,
				};

				this.sql.exec(
					"INSERT OR REPLACE INTO content (key, value, updated_at) VALUES (?, ?, ?)",
					STORE_KEY,
					JSON.stringify(updatedContent),
					Date.now(),
				);

				this.state_data = updatedContent;

				return Response.json({
					success: true,
					message: "Migrated to cold storage",
					r2Key: data.r2Key,
				});
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				this.log.error(`R2 upload attempt ${attempt}/${maxRetries} failed`, {
					error: lastError.message,
				});

				if (attempt < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
				}
			}
		}

		return new Response(
			JSON.stringify({
				error: "R2 migration failed after retries",
				details: lastError?.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	// ════════════════════════════════════════════════════════════════════
	// Private Helpers
	// ════════════════════════════════════════════════════════════════════

	private async fetchFromR2(key: string): Promise<{
		markdownContent: string;
		htmlContent: string;
		gutterContent: string;
	} | null> {
		const r2 = this.env.IMAGES;
		if (!r2) return null;

		try {
			const object = await r2.get(key);
			if (!object) return null;

			const text = await object.text();
			return JSON.parse(text);
		} catch (err) {
			this.log.errorWithCause("R2 fetch error", err);
			return null;
		}
	}

	private async persistContent(): Promise<void> {
		if (!this.state_data) return;

		this.sql.exec(
			"INSERT OR REPLACE INTO content (key, value, updated_at) VALUES (?, ?, ?)",
			STORE_KEY,
			JSON.stringify(this.state_data),
			Date.now(),
		);
	}
}
