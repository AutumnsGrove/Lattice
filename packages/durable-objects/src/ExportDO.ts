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
 */

import { zipSync, strToU8 } from "fflate";

// =============================================================================
// TYPES
// =============================================================================

interface ExportDOEnv {
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
  phase:
    | "pending"
    | "querying"
    | "assembling"
    | "uploading"
    | "notifying"
    | "complete"
    | "failed";
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

export class ExportDO implements DurableObject {
  private state: DurableObjectState;
  private env: ExportDOEnv;
  private jobState: ExportJobState | null = null;

  constructor(state: DurableObjectState, env: ExportDOEnv) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handle incoming requests
   * - POST /start - Initialize job state and schedule first alarm
   * - GET /status - Return current phase and progress
   * - POST /cancel - Cancel in-progress export
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/start":
        return this.handleStart(request);
      case "/status":
        return this.handleStatus();
      case "/cancel":
        return this.handleCancel();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  /**
   * Handle alarm - process phases sequentially
   */
  async alarm(): Promise<void> {
    await this.loadState();

    if (!this.jobState) {
      this.log("No job state on alarm", { phase: "unknown" });
      return;
    }

    if (
      this.jobState.phase === "complete" ||
      this.jobState.phase === "failed"
    ) {
      return;
    }

    try {
      switch (this.jobState.phase) {
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

  // ===========================================================================
  // REQUEST HANDLERS
  // ===========================================================================

  private async handleStart(request: Request): Promise<Response> {
    const body = (await request.json()) as Omit<
      ExportJobState,
      | "phase"
      | "progress"
      | "errorMessage"
      | "imageOffset"
      | "skippedImages"
      | "itemCounts"
    >;

    this.jobState = {
      ...body,
      phase: "querying",
      progress: 0,
      imageOffset: 0,
      skippedImages: [],
      itemCounts: { posts: 0, pages: 0, images: 0 },
    };

    await this.persistState();
    await this.state.storage.setAlarm(Date.now() + 100);

    // Update D1 status to reflect that the DO has started work
    await this.env.DB.prepare(
      "UPDATE storage_exports SET status = ?, updated_at = ? WHERE id = ?",
    )
      .bind("querying", Math.floor(Date.now() / 1000), this.jobState.exportId)
      .run();

    this.log("Export job started", {
      exportId: this.jobState.exportId,
      includeImages: this.jobState.includeImages,
    });

    return Response.json({ success: true, phase: "querying" });
  }

  private async handleStatus(): Promise<Response> {
    await this.loadState();

    if (!this.jobState) {
      return Response.json({ status: "idle" });
    }

    return Response.json({
      exportId: this.jobState.exportId,
      phase: this.jobState.phase,
      progress: this.jobState.progress,
      errorMessage: this.jobState.errorMessage,
    });
  }

  private async handleCancel(): Promise<Response> {
    await this.loadState();

    if (!this.jobState) {
      return Response.json(
        { success: false, error: "No active export" },
        { status: 400 },
      );
    }

    this.jobState.phase = "failed";
    this.jobState.errorMessage = "Export cancelled by user";
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
        this.jobState.exportId,
      )
      .run();

    this.log("Export cancelled");

    return Response.json({ success: true, status: "cancelled" });
  }

  // ===========================================================================
  // PHASE HANDLERS
  // ===========================================================================

  private async phaseQuerying(): Promise<void> {
    if (!this.jobState) return;

    this.log("Starting querying phase", { exportId: this.jobState.exportId });

    // Query posts
    const postsResult = await this.env.DB.prepare(
      `SELECT id, slug, title, description, markdown_content, tags, status, featured_image, published_at, created_at, updated_at
       FROM posts WHERE tenant_id = ? ORDER BY created_at DESC`,
    )
      .bind(this.jobState.tenantId)
      .all<PostRecord>();

    const posts = postsResult.results || [];

    // Query pages
    const pagesResult = await this.env.DB.prepare(
      `SELECT id, slug, title, description, markdown_content, type, created_at, updated_at
       FROM pages WHERE tenant_id = ? ORDER BY display_order ASC`,
    )
      .bind(this.jobState.tenantId)
      .all<PageRecord>();

    const pages = pagesResult.results || [];

    // Query media
    const mediaResult = await this.env.DB.prepare(
      `SELECT id, filename, original_name, r2_key, url, size, mime_type, alt_text, uploaded_at
       FROM media WHERE tenant_id = ? ORDER BY uploaded_at DESC`,
    )
      .bind(this.jobState.tenantId)
      .all<MediaRecord>();

    const media = mediaResult.results || [];

    // Store results in DO storage
    await this.state.storage.put("posts", posts);
    await this.state.storage.put("pages", pages);
    await this.state.storage.put("media", media);

    // Update item counts
    this.jobState.itemCounts = {
      posts: posts.length,
      pages: pages.length,
      images: this.jobState.includeImages ? media.length : 0,
    };

    // Update D1 progress and status
    await this.env.DB.prepare(
      "UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
    )
      .bind(
        "assembling",
        10,
        Math.floor(Date.now() / 1000),
        this.jobState.exportId,
      )
      .run();

    // Transition to assembling
    this.jobState.phase = "assembling";
    this.jobState.progress = 10;
    await this.persistState();

    // Schedule next alarm
    await this.state.storage.setAlarm(Date.now() + 100);

    this.log("Querying phase complete", {
      posts: posts.length,
      pages: pages.length,
      media: media.length,
    });
  }

  private async phaseAssembling(): Promise<void> {
    if (!this.jobState) return;

    this.log("Starting assembling phase", {
      exportId: this.jobState.exportId,
      imageOffset: this.jobState.imageOffset,
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
    if (
      this.jobState.includeImages &&
      this.jobState.imageOffset < media.length
    ) {
      await this.fetchImageBatch(media);
      return; // Will reschedule alarm from fetchImageBatch
    }

    // All images fetched (or no images), assemble final zip
    // Use per-file compression options: level 6 for text, level 0 for images
    const zipFiles: Record<
      string,
      Uint8Array | [Uint8Array, { level: number }]
    > = {};

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
    if (this.jobState.includeImages) {
      for (const m of media) {
        const imageData = await this.state.storage.get<Uint8Array>(
          `image:${m.r2_key}`,
        );
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
    this.jobState.fileSizeBytes = zipData.length;

    // Update D1 progress and status
    await this.env.DB.prepare(
      "UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
    )
      .bind(
        "uploading",
        70,
        Math.floor(Date.now() / 1000),
        this.jobState.exportId,
      )
      .run();

    // Transition to uploading
    this.jobState.phase = "uploading";
    this.jobState.progress = 70;
    await this.persistState();

    // Schedule next alarm
    await this.state.storage.setAlarm(Date.now() + 100);

    this.log("Assembling phase complete", {
      files: Object.keys(zipFiles).length,
      zipSizeBytes: zipData.length,
    });
  }

  /**
   * Fetch a batch of images from R2 (25 per cycle to avoid memory/timeout issues)
   */
  private async fetchImageBatch(media: MediaRecord[]): Promise<void> {
    if (!this.jobState) return;

    const BATCH_SIZE = 25;
    const startOffset = this.jobState.imageOffset;
    const endOffset = Math.min(startOffset + BATCH_SIZE, media.length);
    const batch = media.slice(startOffset, endOffset);

    this.log("Fetching image batch", {
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
          this.log("Image not found in R2", { r2Key: m.r2_key });
          this.jobState.skippedImages.push(m.original_name);
        }
      } catch (error) {
        this.log("Failed to fetch image", {
          r2Key: m.r2_key,
          error: String(error),
        });
        this.jobState.skippedImages.push(m.original_name);
      }
    }

    // Update offset and progress
    this.jobState.imageOffset = endOffset;
    const imageProgress = Math.floor((endOffset / media.length) * 60); // 10-70% range
    this.jobState.progress = 10 + imageProgress;
    await this.env.DB.prepare(
      "UPDATE storage_exports SET status = ?, progress = ?, updated_at = ? WHERE id = ?",
    )
      .bind(
        "assembling",
        this.jobState.progress,
        Math.floor(Date.now() / 1000),
        this.jobState.exportId,
      )
      .run();

    // Persist and schedule next batch
    await this.persistState();
    await this.state.storage.setAlarm(Date.now() + 1000); // 1 second between batches
  }

  private async phaseUploading(): Promise<void> {
    if (!this.jobState) return;

    this.log("Starting uploading phase", { exportId: this.jobState.exportId });

    const zipData = await this.state.storage.get<Uint8Array>("zipData");
    if (!zipData) {
      throw new Error("Zip data not found in storage");
    }

    // Generate R2 key and filename
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    // Sanitize username to prevent path traversal in R2 key
    const safeUsername = this.sanitizeForPath(this.jobState.username);
    const r2Key = `exports/${this.jobState.tenantId}/${this.jobState.exportId}/grove-export-${safeUsername}-${dateStr}.zip`;

    // Upload to R2
    await this.env.EXPORTS_BUCKET.put(r2Key, zipData);

    // Get media for cleanup
    const media = await this.state.storage.get<MediaRecord[]>("media");

    // Update D1
    const itemCountsJson = JSON.stringify(this.jobState.itemCounts);
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
        this.jobState.exportId,
      )
      .run();

    // Clean up DO storage to free memory
    await this.state.storage.delete("zipData");
    await this.state.storage.delete("posts");
    await this.state.storage.delete("pages");
    await this.state.storage.delete("media");

    // Clean up image data
    if (this.jobState.includeImages && media) {
      for (const m of media) {
        await this.state.storage.delete(`image:${m.r2_key}`);
      }
    }

    this.jobState.r2Key = r2Key;
    this.jobState.fileSizeBytes = zipData.length;
    this.jobState.progress = 90;

    // Determine next phase
    if (this.jobState.deliveryMethod === "email") {
      this.jobState.phase = "notifying";
    } else {
      this.jobState.phase = "complete";
      this.jobState.progress = 100;
      await this.env.DB.prepare(
        "UPDATE storage_exports SET status = ?, progress = ?, completed_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(
          "complete",
          100,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
          this.jobState.exportId,
        )
        .run();
    }

    await this.persistState();

    if (this.jobState.phase === "notifying") {
      // Schedule next alarm for notifying
      await this.state.storage.setAlarm(Date.now() + 100);
    }

    this.log("Uploading phase complete", {
      r2Key,
      fileSizeBytes: zipData.length,
    });
  }

  private async phaseNotifying(): Promise<void> {
    if (!this.jobState) return;

    this.log("Starting notifying phase", { exportId: this.jobState.exportId });

    const zephyrBaseUrl =
      this.env.ZEPHYR_URL || "https://grove-zephyr.m7jv4v7npb.workers.dev";
    const doFetch = this.env.ZEPHYR?.fetch ?? fetch;

    const htmlContent = buildExportEmailHtml(this.jobState);
    const textContent = buildExportEmailText(this.jobState);

    const response = await doFetch(`${zephyrBaseUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.env.ZEPHYR_API_KEY || "",
      },
      body: JSON.stringify({
        type: "transactional",
        template: "raw",
        to: this.jobState.userEmail,
        subject: "Your Grove export is ready",
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Zephyr email send failed: ${response.status} ${response.statusText}`,
      );
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
        this.jobState.exportId,
      )
      .run();

    this.jobState.phase = "complete";
    this.jobState.progress = 100;
    await this.persistState();

    this.log("Notifying phase complete", {
      email: this.jobState.userEmail,
    });
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private async loadState(): Promise<void> {
    if (!this.jobState) {
      const stored = await this.state.storage.get<ExportJobState>("jobState");
      if (stored) {
        this.jobState = stored;
      }
    }
  }

  private async persistState(): Promise<void> {
    if (this.jobState) {
      await this.state.storage.put("jobState", this.jobState);
    }
  }

  private async handleError(error: unknown): Promise<void> {
    if (!this.jobState) return;

    const internalError = String(error);
    const userMessage = "Export processing failed. Please try again.";

    this.jobState.phase = "failed";
    this.jobState.errorMessage = userMessage;

    await this.persistState();
    await this.state.storage.deleteAlarm();

    try {
      await this.env.DB.prepare(
        "UPDATE storage_exports SET status = ?, error_message = ?, progress = ?, updated_at = ? WHERE id = ?",
      )
        .bind(
          "failed",
          userMessage,
          this.jobState.progress,
          Math.floor(Date.now() / 1000),
          this.jobState.exportId,
        )
        .run();
    } catch (dbError) {
      // DB update failed — DO storage has the truth, D1 will be reconciled by staleness check
      this.log("Failed to update D1 on error", { error: String(dbError) });
    }

    // Log the full internal error for debugging — never expose to users
    this.log("Export failed", { error: internalError });
  }

  private buildPostFrontmatter(
    post: PostRecord,
    mediaMap: Map<string, string>,
  ): string {
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
    if (
      featuredImage &&
      this.jobState?.includeImages &&
      mediaMap.has(featuredImage)
    ) {
      featuredImage = `images/${mediaMap.get(featuredImage)}`;
    }

    const lines = ["---", `title: "${this.escapeYamlString(post.title)}"`];

    if (post.description) {
      lines.push(`description: "${this.escapeYamlString(post.description)}"`);
    }

    lines.push(`slug: ${post.slug}`);

    if (tags.length > 0) {
      // Escape each tag to prevent YAML injection
      lines.push(
        `tags: [${tags.map((t: string) => `"${this.escapeYamlString(t)}"`).join(", ")}]`,
      );
    }

    lines.push(`status: ${post.status}`);

    if (featuredImage) {
      lines.push(`featured_image: ${featuredImage}`);
    }

    if (post.published_at) {
      lines.push(
        `published_at: "${new Date(post.published_at * 1000).toISOString()}"`,
      );
    }

    lines.push(
      `created_at: "${new Date(post.created_at * 1000).toISOString()}"`,
    );
    lines.push(
      `updated_at: "${new Date(post.updated_at * 1000).toISOString()}"`,
    );
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
    lines.push(
      `created_at: "${new Date(page.created_at * 1000).toISOString()}"`,
    );
    lines.push(
      `updated_at: "${new Date(page.updated_at * 1000).toISOString()}"`,
    );
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
    const counts = this.jobState?.itemCounts || {
      posts: 0,
      pages: 0,
      images: 0,
    };
    const skippedMsg =
      this.jobState && this.jobState.skippedImages.length > 0
        ? `\nNote: ${this.jobState.skippedImages.length} images couldn't be included — they may have been deleted.\n`
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

  private log(message: string, data?: object): void {
    console.log(
      JSON.stringify({
        do: "ExportDO",
        id: this.state.id.toString(),
        message,
        ...data,
        timestamp: new Date().toISOString(),
      }),
    );
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
