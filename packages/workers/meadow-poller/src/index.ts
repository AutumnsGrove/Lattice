/**
 * Meadow Poller — Scheduled RSS Feed Aggregator
 *
 * Runs on a 15-minute cron cycle. Discovers tenants with meadow_opt_in=1,
 * fetches their /api/feed endpoints, parses RSS 2.0, and upserts posts
 * into the shared meadow_posts table.
 *
 * Security:
 * - SSRF prevention: only fetches https://{subdomain}.grove.place/api/feed
 * - Content size limits: rejects feeds > 5MB
 * - XXE prevention: fast-xml-parser has entity processing disabled
 * - No secrets required: all feeds are public HTTPS
 */
import { parseFeed } from "./parser.js";
import { sanitizeFeedHtml } from "./sanitize.js";
import type { Env, TenantInfo, PollState, ParsedFeedItem } from "./config.js";
import {
  MAX_CONCURRENT_POLLS,
  FETCH_TIMEOUT_MS,
  MAX_FEED_SIZE,
  POLL_STATE_TTL,
  ERROR_BACKOFF_THRESHOLD,
  BACKOFF_INTERVAL_S,
  SUBDOMAIN_PATTERN,
} from "./config.js";

export default {
  /** Cron-triggered entry point */
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(pollAllFeeds(env));
  },

  /** Manual trigger via HTTP for testing */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/trigger") {
      await pollAllFeeds(env);
      return new Response(
        JSON.stringify({ ok: true, message: "Poll cycle completed" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        service: "grove-meadow-poller",
        status: "running",
        endpoints: ["/trigger"],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },
};

// ---------------------------------------------------------------------------
// Core polling logic
// ---------------------------------------------------------------------------

/** Discover opted-in tenants and poll their feeds */
async function pollAllFeeds(env: Env): Promise<void> {
  const tenants = await discoverTenants(env.DB);

  if (tenants.length === 0) {
    console.log("[Meadow Poller] No opted-in tenants found");
    return;
  }

  console.log(`[Meadow Poller] Polling ${tenants.length} tenant(s)`);

  // Process in batches to respect concurrency limits
  for (let i = 0; i < tenants.length; i += MAX_CONCURRENT_POLLS) {
    const batch = tenants.slice(i, i + MAX_CONCURRENT_POLLS);
    await Promise.allSettled(batch.map((tenant) => pollTenant(env, tenant)));
  }

  console.log("[Meadow Poller] Poll cycle complete");
}

/** Query D1 for tenants with meadow_opt_in=1 */
async function discoverTenants(db: D1Database): Promise<TenantInfo[]> {
  try {
    const result = await db
      .prepare(
        "SELECT id, subdomain, display_name FROM tenants WHERE meadow_opt_in = 1",
      )
      .all<TenantInfo>();
    return result.results ?? [];
  } catch (err) {
    console.error("[Meadow Poller] Failed to discover tenants:", err);
    return [];
  }
}

/** Poll a single tenant's feed */
async function pollTenant(env: Env, tenant: TenantInfo): Promise<void> {
  const stateKey = `poll:${tenant.id}`;

  // Validate subdomain to prevent SSRF
  if (!SUBDOMAIN_PATTERN.test(tenant.subdomain)) {
    console.warn(
      `[Meadow Poller] Skipping tenant ${tenant.id}: invalid subdomain "${tenant.subdomain}"`,
    );
    return;
  }

  // Load poll state from KV
  const state = await loadPollState(env.POLL_STATE, stateKey);

  // Check backoff: if too many errors, only poll hourly
  if (state.consecutiveErrors >= ERROR_BACKOFF_THRESHOLD) {
    const nowS = Math.floor(Date.now() / 1000);
    if (nowS - state.lastPollAt < BACKOFF_INTERVAL_S) {
      console.log(
        `[Meadow Poller] Skipping ${tenant.subdomain}: in backoff (${state.consecutiveErrors} errors)`,
      );
      return;
    }
  }

  const feedUrl = `https://${tenant.subdomain}.grove.place/api/feed`;

  try {
    // Build request with conditional headers
    const headers: Record<string, string> = {
      "User-Agent": "Grove-Meadow-Poller/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    };
    if (state.lastEtag) {
      headers["If-None-Match"] = state.lastEtag;
    }

    const response = await fetch(feedUrl, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    // 304 Not Modified — nothing changed
    if (response.status === 304) {
      console.log(`[Meadow Poller] ${tenant.subdomain}: 304 Not Modified`);
      await savePollState(env.POLL_STATE, stateKey, {
        ...state,
        lastPollAt: Math.floor(Date.now() / 1000),
        consecutiveErrors: 0,
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content size before reading body
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FEED_SIZE) {
      throw new Error(
        `Feed too large: ${contentLength} bytes (max ${MAX_FEED_SIZE})`,
      );
    }

    const xml = await response.text();

    // Double-check actual size
    if (xml.length > MAX_FEED_SIZE) {
      throw new Error(
        `Feed body too large: ${xml.length} bytes (max ${MAX_FEED_SIZE})`,
      );
    }

    const feed = parseFeed(xml);

    // Upsert feed items into D1
    const upserted = await upsertPosts(env.DB, tenant, feed.items);

    // Save successful poll state
    const newEtag = response.headers.get("ETag") || null;
    await savePollState(env.POLL_STATE, stateKey, {
      lastEtag: newEtag,
      lastPollAt: Math.floor(Date.now() / 1000),
      consecutiveErrors: 0,
      lastErrorMessage: null,
    });

    console.log(
      `[Meadow Poller] ${tenant.subdomain}: ${upserted} post(s) upserted from ${feed.items.length} item(s)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Meadow Poller] ${tenant.subdomain}: ${message}`);

    await savePollState(env.POLL_STATE, stateKey, {
      ...state,
      lastPollAt: Math.floor(Date.now() / 1000),
      consecutiveErrors: state.consecutiveErrors + 1,
      lastErrorMessage: message,
    });
  }
}

// ---------------------------------------------------------------------------
// D1 operations
// ---------------------------------------------------------------------------

/** Upsert parsed feed items into meadow_posts. Returns count of upserted rows. */
async function upsertPosts(
  db: D1Database,
  tenant: TenantInfo,
  items: ParsedFeedItem[],
): Promise<number> {
  if (items.length === 0) return 0;

  const nowS = Math.floor(Date.now() / 1000);
  const statements: D1PreparedStatement[] = [];

  for (const item of items) {
    // Parse pubDate to Unix seconds
    let publishedAt = nowS;
    if (item.pubDate) {
      const parsed = new Date(item.pubDate).getTime();
      if (!isNaN(parsed)) {
        publishedAt = Math.floor(parsed / 1000);
      }
    }

    // Sanitize HTML content before storage — defense at ingest means
    // every downstream consumer gets safe HTML by default
    const sanitizedContent = sanitizeFeedHtml(item.contentEncoded);

    // Content hash for change detection (hash the sanitized version
    // so re-sanitization with identical output doesn't trigger updates)
    const contentSource = sanitizedContent || item.description || "";
    const contentHash = await hashContent(contentSource);

    const id = crypto.randomUUID();

    statements.push(
      db
        .prepare(
          `INSERT INTO meadow_posts (id, tenant_id, guid, title, description, content_html, link, author_name, author_subdomain, tags, featured_image, published_at, fetched_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(tenant_id, guid) DO UPDATE SET
             title = excluded.title,
             description = excluded.description,
             content_html = CASE WHEN excluded.content_hash != meadow_posts.content_hash THEN excluded.content_html ELSE meadow_posts.content_html END,
             tags = excluded.tags,
             featured_image = excluded.featured_image,
             fetched_at = excluded.fetched_at,
             content_hash = excluded.content_hash`,
        )
        .bind(
          id,
          tenant.id,
          item.guid,
          item.title,
          item.description,
          sanitizedContent,
          item.link,
          tenant.display_name,
          tenant.subdomain,
          JSON.stringify(item.categories),
          item.enclosureUrl,
          publishedAt,
          nowS,
          contentHash,
        ),
    );
  }

  // D1 batch is atomic — all succeed or all fail
  try {
    await db.batch(statements);
    return statements.length;
  } catch (err) {
    console.error("[Meadow Poller] Batch upsert failed:", err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// KV poll state helpers
// ---------------------------------------------------------------------------

async function loadPollState(kv: KVNamespace, key: string): Promise<PollState> {
  try {
    const raw = await kv.get(key);
    if (raw) return JSON.parse(raw) as PollState;
  } catch {
    // Corrupted state — start fresh
  }
  return {
    lastEtag: null,
    lastPollAt: 0,
    consecutiveErrors: 0,
    lastErrorMessage: null,
  };
}

async function savePollState(
  kv: KVNamespace,
  key: string,
  state: PollState,
): Promise<void> {
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: POLL_STATE_TTL,
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Generate a hex content hash using SHA-256 (first 16 chars) */
async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
