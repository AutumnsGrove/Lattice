/**
 * ExportDO - Durable Object for Assembling Zip Exports
 *
 * Following the Loom pattern, ExportDO provides:
 * - Long-running export job execution (bypasses Worker CPU limits)
 * - State persisted to DO storage, work chunked across alarms
 * - Batched image fetching to avoid memory spikes
 * - Email delivery via Zephyr service binding
 *
 * State machine: pending → querying → assembling → uploading → notifying → complete (or failed)
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";
import { zipSync, strToU8 } from "fflate";

// =============================================================================
// TYPES
// =============================================================================

interface ExportDOEnv extends Record<string, unknown> {
	DB: D1Database;
	KV: KVNamespace;
	IMAGES: R2Bucket;
	EXPORTS_BUCKET: R2Bucket;
	ZEPHYR: {
		fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
	};
	ZEPHYR_URL?: string;
	ZEPHYR_API_KEY?: string;
}

interface ExportJobState {
	exportId: string;
	tenantId: string;
	userEmail: string;
	username: string;
	includeImages: boolean;
	deliveryMethod: "email" | "download";
	phase: "pending" | "querying" | "assembling" | "uploading" | "notifying" | "complete" | "failed";
	progress: number;
	errorMessage?: string;
	imageOffset: number;
	skippedImages: string[];
	itemCounts: { posts: number; pages: number; images: number };
	r2Key?: string;
	fileSizeBytes?: number;
}

interface PostRecord {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	markdown_content: string;
	tags: string;
	status: string;
	featured_image: string | null;
	published_at: number | null;
	created_at: number;
	updated_at: number;
}

interface PageRecord {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	markdown_content: string;
	type: string;
	created_at: number;
	updated_at: number;
}

interface MediaRecord {
	id: string;
	filename: string;
	original_name: string;
	r2_key: string;
	url: string;
	size: number;
	mime_type: string;
	alt_text: string | null;
	uploaded_at: number;
}

// =============================================================================
// EXPORT DURABLE OBJECT
// =============================================================================

export class ExportDO extends LoomDO<ExportJobState, ExportDOEnv> {
	config(): LoomConfig {
		return { name: "ExportDO", blockOnInit: false };
	}

	protected async loadState(): Promise<ExportJobState | null> {
		return (await this.state.storage.get<ExportJobState>("jobState")) ?? null;
	}

	protected async persistState(): Promise<void> {
		if (this.state_data) {
			await this.state.storage.put("jobState", this.state_data);
		}
	}

	routes(): LoomRoute[] {
		return [
			{
				method: "POST",
				path: "/start",
				handler: (ctx) => this.handleStart(ctx),
			},
			{
				method: "GET",
				path: "/status",
				handler: () => this.handleStatus(),
			},
			{
				method: "POST",
				path: "/cancel",
				handler: () => this.handleCancel(),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Alarm Handler — Phase Dispatcher
	// ════════════════════════════════════════════════════════════════════

	protected async onAlarm(): Promise<void> {
		if (!this.state_data) {
			this.log.warn("No job state on alarm");
			return;
		}

		if (this.state_data.phase === "complete" || this.state_data.phase === "failed") {
			return;
		}

		try {
			switch (this.state_data.phase) {
				case "querying":
					await this.phaseQuerying();
					break;
				case "assembling":
					await this.phaseAssembling();
					break;
				case "uploading":
					await this.phaseUploading();
					break;
				case "notifying":
					await this.phaseNotifying();
					break;
			}
		} catch (error) {
			await this.handleError(error);
		}
	}

	// ════════════════════════════════════════════════════════════════════
	// Request Handlers
	// ════════════════════════════════════════════════════════════════════

	private async handleStart(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as Omit<
			ExportJobState,
			"phase" | "progress" | "errorMessage" | "imageOffset" | "skippedImages" | "itemCounts"
		>;

		this.state_data = {
			...body,
			phase: "querying",
			progress: 0,
			imageOffset: 0,
			skippedImages: [],
			itemCounts: { posts: 0, pages: 0, images: 0 },
		};

		await this.persistState();
		await this.alarms.schedule(100);

		// Update D1 status to reflect that the DO has started work
		await this.env.DB.prepare("UPDATE storage_exports SET status = ?, updated_at = ? WHERE id = ?")
			.bind("querying", Math.floor(Date.now() / 1000), this.state_data.exportId)
			.run();

		this.log.info("Export job started", {
			exportId: this.state_data.exportId,
			includeImages: this.state_data.includeImages,
		});

		return Response.json({ success: true, phase: "querying" });
	}

	private async handleStatus(): Promise<Response> {
		if (!this.state_data) {
			return Response.json({ status: "idle" });
		}

		return Response.json({
			exportId: this.state_data.exportId,
			phase: this.state_data.phase,
			progress: this.state_data.progress,
			errorMessage: this.state_data.errorMessage,
		});
	}

	private async handleCancel(): Promise<Response> {
		if (!this.state_data) {
			return Response.json({ success: false, error: "No active export" }, { status: 400 });
		}

		this.state_data.phase = "failed";
		this.state_data.errorMessage = "Export cancelled by user";
		await this.persistState();
		await this.state.storage.deleteAlarm();

		// Update D1
		await this.env.DB.prepare(
			"UPDATE storage_exports SET status = ?, error_message = ?, updated_at = ? WHERE id = ?",
		)
			.bind(
				"failed",
				"Export cancelled by user",
				Math.floor(Date.now() / 1000),
				this.state_data.exportId,
			)
			.run();

		this.log.info("Export cancelled");

		return Response.json({ success: true, status: "cancelled" });
	}

	// ════════════════════════════════════════════════════════════════════
	// Phase Handlers
	// ════════════════════════════════════════════════════════════════════

	private async phaseQuerying(): Promise<void> {
		if (!this.state_data) return;

		this.log.info("Starting querying phase", {
			exportId: this.state_data.exportId,
		});

		// Query posts
		const postsResult = await this.env.DB.prepare(
			`SELECT id, slug, title, description, markdown_content, tags, status, featured_image, published_at, created_at, updated_at
       FROM posts WHERE tenant_id = ? ORDER BY created_at DESC`,
		)
			.bind(this.state_data.tenantId)
			.all<PostRecord>();

		const posts = postsResult.results || [];

		// Query pages
		const pagesResult = await this.env.DB.prepare(
			`SELECT id, slug, title, description, markdown_content, type, created_at, updated_at
       FROM pages WHERE tenant_id = ? ORDER BY display_order ASC`,
		)
			.bind(this.state_data.tenantId)
			.all<PageRecord>();

		const pages = pagesResult.results || [];

		// Query media
		const mediaResult = await this.env.DB.prepare(
			`SELECT id, filename, original_name, r2_key, url, size, mime_type, alt_text, uploaded_at
       FROM media WHERE tenant_id = ? ORDER BY uploaded_at DESC`,
		)
			.bind(this.state_data.tenantId)
			.all<MediaRecord>();

		const media = mediaResult.results || [];

		// Store results in DO storage
		await this.state.storage.put("posts", posts);
		await this.state.storage.put("pages", pages);
		await this.state.storage.put("media", media);

		// Update item counts
		this.state_data.itemCounts = {
			posts: posts.length,
			pages: pages.length,
			images: this.state_data.includeImages ? media.length : 0,
		};

		// Update D1 progress and status
		await this.env.DB.prepare(
			"UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
		)
			.bind("assembling", 10, Math.floor(Date.now() / 1000), this.state_data.exportId)
			.run();

		// Transition to assembling
		this.state_data.phase = "assembling";
		this.state_data.progress = 10;
		await this.persistState();

		// Schedule next alarm
		await this.alarms.schedule(100);

		this.log.info("Querying phase complete", {
			posts: posts.length,
			pages: pages.length,
			media: media.length,
		});
	}

	private async phaseAssembling(): Promise<void> {
		if (!this.state_data) return;

		this.log.info("Starting assembling phase", {
			exportId: this.state_data.exportId,
			imageOffset: this.state_data.imageOffset,
		});

		// Load data from storage
		const posts = (await this.state.storage.get<PostRecord[]>("posts")) || [];
		const pages = (await this.state.storage.get<PageRecord[]>("pages")) || [];
		const media = (await this.state.storage.get<MediaRecord[]>("media")) || [];

		// Build media URL to filename map for featured image rewriting
		const mediaMap = new Map<string, string>();
		for (const m of media) {
			mediaMap.set(m.url, m.original_name);
		}

		// Handle images if enabled - fetch and store separately
		if (this.state_data.includeImages && this.state_data.imageOffset < media.length) {
			await this.fetchImageBatch(media);
			return; // Will reschedule alarm from fetchImageBatch
		}

		// All images fetched (or no images), assemble final zip
		// Use per-file compression options: level 6 for text, level 0 for images
		const zipFiles: Record<string, Uint8Array | [Uint8Array, { level: number }]> = {};

		// Build markdown files (compress text, level 6)
		for (const post of posts) {
			const frontmatter = this.buildPostFrontmatter(post, mediaMap);
			const content = frontmatter + "\n\n" + post.markdown_content;
			zipFiles[`blooms/${post.slug}.md`] = [strToU8(content), { level: 6 }];
		}

		for (const page of pages) {
			const frontmatter = this.buildPageFrontmatter(page);
			const content = frontmatter + "\n\n" + page.markdown_content;
			zipFiles[`pages/${page.slug}.md`] = [strToU8(content), { level: 6 }];
		}

		// Add images from storage (already fetched in previous alarm cycles)
		// Use level 0 (store) for pre-compressed image formats (JPEG, PNG, WebP)
		if (this.state_data.includeImages) {
			for (const m of media) {
				const imageData = await this.state.storage.get<Uint8Array>(`image:${m.r2_key}`);
				if (imageData) {
					// Store without recompressing (JPEG, PNG, WebP already compressed)
					zipFiles[`images/${m.original_name}`] = [imageData, { level: 0 }];
				}
			}
		}

		// Generate README (compress, level 6)
		const readmeContent = this.buildReadme();
		zipFiles["README.md"] = [strToU8(readmeContent), { level: 6 }];

		// Create zip with selective per-file compression
		const zipData = zipSync(zipFiles as any);

		// Store zip in DO storage
		await this.state.storage.put("zipData", zipData);
		this.state_data.fileSizeBytes = zipData.length;

		// Update D1 progress and status
		await this.env.DB.prepare(
			"UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
		)
			.bind("uploading", 70, Math.floor(Date.now() / 1000), this.state_data.exportId)
			.run();

		// Transition to uploading
		this.state_data.phase = "uploading";
		this.state_data.progress = 70;
		await this.persistState();

		// Schedule next alarm
		await this.alarms.schedule(100);

		this.log.info("Assembling phase complete", {
			files: Object.keys(zipFiles).length,
			zipSizeBytes: zipData.length,
		});
	}

	/**
	 * Fetch a batch of images from R2 (25 per cycle to avoid memory/timeout issues)
	 */
	private async fetchImageBatch(media: MediaRecord[]): Promise<void> {
		if (!this.state_data) return;

		const BATCH_SIZE = 25;
		const startOffset = this.state_data.imageOffset;
		const endOffset = Math.min(startOffset + BATCH_SIZE, media.length);
		const batch = media.slice(startOffset, endOffset);

		this.log.info("Fetching image batch", {
			startOffset,
			endOffset,
			total: media.length,
		});

		for (const m of batch) {
			try {
				const r2Object = await this.env.IMAGES.get(m.r2_key);
				if (r2Object) {
					const imageData = new Uint8Array(await r2Object.arrayBuffer());
					await this.state.storage.put(`image:${m.r2_key}`, imageData);
				} else {
					this.log.warn("Image not found in R2", { r2Key: m.r2_key });
					this.state_data.skippedImages.push(m.original_name);
				}
			} catch (error) {
				this.log.warn("Failed to fetch image", {
					r2Key: m.r2_key,
					error: String(error),
				});
				this.state_data.skippedImages.push(m.original_name);
			}
		}

		// Update offset and progress
		this.state_data.imageOffset = endOffset;
		const imageProgress = Math.floor((endOffset / media.length) * 60); // 10-70% range
		this.state_data.progress = 10 + imageProgress;
		await this.env.DB.prepare(
			"UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
		)
			.bind(
				"assembling",
				this.state_data.progress,
				Math.floor(Date.now() / 1000),
				this.state_data.exportId,
			)
			.run();

		// Persist and schedule next batch
		await this.persistState();
		await this.alarms.schedule(1000); // 1 second between batches
	}

	private async phaseUploading(): Promise<void> {
		if (!this.state_data) return;

		this.log.info("Starting uploading phase", {
			exportId: this.state_data.exportId,
		});

		const zipData = await this.state.storage.get<Uint8Array>("zipData");
		if (!zipData) {
			throw new Error("Zip data not found in storage");
		}

		// Generate R2 key and filename
		const now = new Date();
		const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
		// Sanitize username to prevent path traversal in R2 key
		const safeUsername = this.sanitizeForPath(this.state_data.username);
		const r2Key = `exports/${this.state_data.tenantId}/${this.state_data.exportId}/grove-export-${safeUsername}-${dateStr}.zip`;

		// Upload to R2
		await this.env.EXPORTS_BUCKET.put(r2Key, zipData);

		// Get media for cleanup
		const media = await this.state.storage.get<MediaRecord[]>("media");

		// Update D1
		const itemCountsJson = JSON.stringify(this.state_data.itemCounts);
		await this.env.DB.prepare(
			`UPDATE storage_exports
       SET status = ?, r2_key = ?, file_size_bytes = ?, item_counts = ?, progress = ?, updated_at = ?
       WHERE id = ?`,
		)
			.bind(
				"uploading",
				r2Key,
				zipData.length,
				itemCountsJson,
				90,
				Math.floor(Date.now() / 1000),
				this.state_data.exportId,
			)
			.run();

		// Clean up DO storage to free memory
		await this.state.storage.delete("zipData");
		await this.state.storage.delete("posts");
		await this.state.storage.delete("pages");
		await this.state.storage.delete("media");

		// Clean up image data
		if (this.state_data.includeImages && media) {
			for (const m of media) {
				await this.state.storage.delete(`image:${m.r2_key}`);
			}
		}

		this.state_data.r2Key = r2Key;
		this.state_data.fileSizeBytes = zipData.length;
		this.state_data.progress = 90;

		// Determine next phase
		if (this.state_data.deliveryMethod === "email") {
			this.state_data.phase = "notifying";
		} else {
			this.state_data.phase = "complete";
			this.state_data.progress = 100;
			await this.env.DB.prepare(
				"UPDATE storage_exports SET status = ?, progress = ?, completed_at = ?, updated_at = ? WHERE id = ?",
			)
				.bind(
					"complete",
					100,
					Math.floor(Date.now() / 1000),
					Math.floor(Date.now() / 1000),
					this.state_data.exportId,
				)
				.run();
		}

		await this.persistState();

		if (this.state_data.phase === "notifying") {
			// Schedule next alarm for notifying
			await this.alarms.schedule(100);
		}

		this.log.info("Uploading phase complete", {
			r2Key,
			fileSizeBytes: zipData.length,
		});
	}

	private async phaseNotifying(): Promise<void> {
		if (!this.state_data) return;

		this.log.info("Starting notifying phase", {
			exportId: this.state_data.exportId,
		});

		const zephyrBaseUrl = this.env.ZEPHYR_URL || "https://grove-zephyr.m7jv4v7npb.workers.dev";
		const doFetch = this.env.ZEPHYR?.fetch ?? fetch;

		const htmlContent = buildExportEmailHtml(this.state_data);
		const textContent = buildExportEmailText(this.state_data);

		const response = await doFetch(`${zephyrBaseUrl}/send`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.env.ZEPHYR_API_KEY || "",
			},
			body: JSON.stringify({
				type: "transactional",
				template: "raw",
				to: this.state_data.userEmail,
				subject: "Your Grove export is ready",
				html: htmlContent,
				text: textContent,
			}),
		});

		if (!response.ok) {
			throw new Error(`Zephyr email send failed: ${response.status} ${response.statusText}`);
		}

		// Update D1
		await this.env.DB.prepare(
			"UPDATE storage_exports SET status = ?, progress = ?, completed_at = ?, updated_at = ? WHERE id = ?",
		)
			.bind(
				"complete",
				100,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
				this.state_data.exportId,
			)
			.run();

		this.state_data.phase = "complete";
		this.state_data.progress = 100;
		await this.persistState();

		this.log.info("Notifying phase complete", {
			email: this.state_data.userEmail,
		});
	}

	// ════════════════════════════════════════════════════════════════════
	// Utilities
	// ════════════════════════════════════════════════════════════════════

	private async handleError(error: unknown): Promise<void> {
		if (!this.state_data) return;

		const internalError = String(error);
		const userMessage = "Export processing failed. Please try again.";

		this.state_data.phase = "failed";
		this.state_data.errorMessage = userMessage;

		await this.persistState();
		await this.state.storage.deleteAlarm();

		try {
			await this.env.DB.prepare(
				"UPDATE storage_exports SET status = ?, error_message = ?, progress = ?, updated_at = ? WHERE id = ?",
			)
				.bind(
					"failed",
					userMessage,
					this.state_data.progress,
					Math.floor(Date.now() / 1000),
					this.state_data.exportId,
				)
				.run();
		} catch (dbError) {
			// DB update failed — DO storage has the truth, D1 will be reconciled by staleness check
			this.log.error("Failed to update D1 on error", {
				error: String(dbError),
			});
		}

		// Log the full internal error for debugging — never expose to users
		this.log.error("Export failed", { error: internalError });
	}

	private buildPostFrontmatter(post: PostRecord, mediaMap: Map<string, string>): string {
		// Safely parse tags with error handling
		let tags: string[] = [];
		try {
			tags = JSON.parse(post.tags || "[]");
			if (!Array.isArray(tags)) tags = [];
		} catch {
			tags = [];
		}

		// Rewrite featured image if it's a local media file
		let featuredImage = post.featured_image;
		if (featuredImage && this.state_data?.includeImages && mediaMap.has(featuredImage)) {
			featuredImage = `images/${mediaMap.get(featuredImage)}`;
		}

		const lines = ["---", `title: "${this.escapeYamlString(post.title)}"`];

		if (post.description) {
			lines.push(`description: "${this.escapeYamlString(post.description)}"`);
		}

		lines.push(`slug: ${post.slug}`);

		if (tags.length > 0) {
			// Escape each tag to prevent YAML injection
			lines.push(`tags: [${tags.map((t: string) => `"${this.escapeYamlString(t)}"`).join(", ")}]`);
		}

		lines.push(`status: ${post.status}`);

		if (featuredImage) {
			lines.push(`featured_image: ${featuredImage}`);
		}

		if (post.published_at) {
			lines.push(`published_at: "${new Date(post.published_at * 1000).toISOString()}"`);
		}

		lines.push(`created_at: "${new Date(post.created_at * 1000).toISOString()}"`);
		lines.push(`updated_at: "${new Date(post.updated_at * 1000).toISOString()}"`);
		lines.push("---");

		return lines.join("\n");
	}

	private buildPageFrontmatter(page: PageRecord): string {
		const lines = ["---", `title: "${this.escapeYamlString(page.title)}"`];

		if (page.description) {
			lines.push(`description: "${this.escapeYamlString(page.description)}"`);
		}

		lines.push(`slug: ${page.slug}`);
		lines.push(`type: ${page.type}`);
		lines.push(`created_at: "${new Date(page.created_at * 1000).toISOString()}"`);
		lines.push(`updated_at: "${new Date(page.updated_at * 1000).toISOString()}"`);
		lines.push("---");

		return lines.join("\n");
	}

	private escapeYamlString(str: string): string {
		// Comprehensive YAML string escaping to prevent injection
		// Handle quotes, backslashes, and newlines
		return str
			.replace(/\\/g, "\\\\") // Escape backslashes first
			.replace(/"/g, '\\"') // Escape quotes
			.replace(/\n/g, "\\n") // Escape newlines
			.replace(/\r/g, "\\r") // Escape carriage returns
			.replace(/\t/g, "\\t"); // Escape tabs
	}

	private sanitizeForPath(str: string): string {
		// Remove any characters that could be used for path traversal or injection
		// Allow only alphanumeric, dash, and underscore
		return str.replace(/[^a-zA-Z0-9_-]/g, "_");
	}

	private buildReadme(): string {
		const counts = this.state_data?.itemCounts || {
			posts: 0,
			pages: 0,
			images: 0,
		};
		const skippedMsg =
			this.state_data && this.state_data.skippedImages.length > 0
				? `\nNote: ${this.state_data.skippedImages.length} images couldn't be included — they may have been deleted.\n`
				: "";

		const now = new Date().toISOString().split("T")[0];

		return `# Your Grove Export

Hey there! This is a complete export of your Grove blog.

## What's Inside

- **blooms/** — Your blog posts as Markdown files (${counts.posts} posts)
- **pages/** — Your pages as Markdown files (${counts.pages} pages)
- **images/** — Your uploaded images (${counts.images} files)

${skippedMsg}

## Using These Files

These files are standard Markdown with YAML frontmatter — compatible with Hugo, Jekyll, Astro, Ghost, or any platform that speaks Markdown.

Each post and page includes metadata (title, slug, tags, dates) in the frontmatter header at the top of the file. Images are referenced with relative paths.

## This Is Yours

This is your data. You own it. Always have, always will.

---

Exported from [Grove](https://grove.place) on ${now}
`;
	}
}

// =============================================================================
// EMAIL BUILDERS (non-exported helpers)
// =============================================================================

function buildExportEmailHtml(jobState: ExportJobState): string {
	const { posts, pages, images } = jobState.itemCounts;
	const itemsList = [
		posts > 0 ? `${posts} blog post${posts !== 1 ? "s" : ""}` : null,
		pages > 0 ? `${pages} page${pages !== 1 ? "s" : ""}` : null,
		images > 0 ? `${images} image${images !== 1 ? "s" : ""}` : null,
	]
		.filter(Boolean)
		.join(" • ");

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefdfb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Logo placeholder -->
        <div style="margin-bottom: 30px; font-size: 24px; font-weight: 600; color: #1e2227;">Grove</div>

        <!-- Main card -->
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #1e2227; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #fefdfb;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700;">Your export is ready!</h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #e0ddd8;">
                Your Grove export is packed and waiting for you. Here's what's inside:
              </p>

              <div style="background-color: #2a3035; border-radius: 6px; padding: 20px; margin-bottom: 24px; color: #e0ddd8;">
                <p style="margin: 0; font-size: 15px;">
                  ${itemsList}
                </p>
              </div>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #22c55e; border-radius: 6px; padding: 0;">
                    <a href="https://grove.place/arbor/export" style="display: block; padding: 14px 32px; text-decoration: none; color: #fff; font-size: 16px; font-weight: 600; text-align: center;">
                      Download Your Export
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #a8a5a0; line-height: 1.5;">
                This link leads to your account page where you can download the file. The export will be available for 7 days.
              </p>

              <p style="margin: 0; font-size: 14px; color: #a8a5a0;">
                — Grove
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildExportEmailText(jobState: ExportJobState): string {
	const { posts, pages, images } = jobState.itemCounts;
	const itemsList = [
		posts > 0 ? `${posts} blog post${posts !== 1 ? "s" : ""}` : null,
		pages > 0 ? `${pages} page${pages !== 1 ? "s" : ""}` : null,
		images > 0 ? `${images} image${images !== 1 ? "s" : ""}` : null,
	]
		.filter(Boolean)
		.join(" • ");

	return `Your Grove export is ready!

Your Grove export is packed and waiting for you. Here's what's inside:

${itemsList}

Download your export: https://grove.place/arbor/export

This link leads to your account page where you can download the file. The export will be available for 7 days.

— Grove
`;
}
