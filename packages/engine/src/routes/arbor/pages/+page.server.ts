import type { PageServerLoad } from "./$types";

interface PageRecord {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  updated_at: string;
  created_at: string;
  show_in_nav: number; // 0 or 1 (SQLite boolean)
}

interface CurioConfig {
  enabled: number;
}

interface CurioStatus {
  slug: string;
  name: string;
  enabled: boolean;
  configUrl: string;
}

/** Helper: query a curio table with an `enabled` column */
function queryEnabled(
  db: D1Database,
  table: string,
  tenantId: string | undefined,
): Promise<CurioConfig | null> {
  if (!tenantId) return Promise.resolve(null);
  return db
    .prepare(`SELECT enabled FROM ${table} WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<CurioConfig>()
    .catch(() => null);
}

/** Helper: check if any row exists for this tenant (existence = configured) */
function queryExists(
  db: D1Database,
  table: string,
  tenantId: string | undefined,
): Promise<{ exists: 1 } | null> {
  if (!tenantId) return Promise.resolve(null);
  return db
    .prepare(`SELECT 1 as exists FROM ${table} WHERE tenant_id = ? LIMIT 1`)
    .bind(tenantId)
    .first<{ exists: 1 }>()
    .catch(() => null);
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Auth is handled by the parent /admin layout - no duplicate check needed here
  const tenantId = locals.tenantId;
  let pages: PageRecord[] = [];
  let curios: CurioStatus[] = [];
  let pagesLoadError = false;

  if (platform?.env?.DB) {
    const db = platform.env.DB;

    // Run pages and ALL curio queries in parallel
    const [
      pagesResult,
      // Curios with `enabled` column
      timelineResult,
      galleryResult,
      journeyResult,
      pulseResult,
      guestbookResult,
      ambientResult,
      // Curios with existence-based detection
      hitcounterResult,
      nowplayingResult,
      pollsResult,
      moodringResult,
      badgesResult,
      blogrollResult,
      webringResult,
      linkgardenResult,
      activitystatusResult,
      statusbadgeResult,
      bookmarkshelfResult,
      artifactsResult,
      shrinesResult,
      cursorsResult,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT slug, title, description, type, updated_at, created_at, COALESCE(show_in_nav, 0) as show_in_nav
           FROM pages
           WHERE tenant_id = ?
           ORDER BY slug ASC`,
        )
        .bind(tenantId)
        .all<PageRecord>()
        .catch((err) => {
          console.error("D1 fetch error for pages:", err);
          pagesLoadError = true;
          return { results: [] };
        }),

      // --- enabled column curios ---
      queryEnabled(db, "timeline_curio_config", tenantId),
      queryEnabled(db, "gallery_curio_config", tenantId),
      queryEnabled(db, "journey_curio_config", tenantId),
      queryEnabled(db, "pulse_curio_config", tenantId),
      queryEnabled(db, "guestbook_config", tenantId),
      queryEnabled(db, "ambient_config", tenantId),

      // --- existence-based curios ---
      queryExists(db, "hit_counters", tenantId),
      queryExists(db, "nowplaying_config", tenantId),
      queryExists(db, "polls", tenantId),
      queryExists(db, "mood_ring_config", tenantId),
      queryExists(db, "tenant_badges", tenantId),
      queryExists(db, "blogroll_items", tenantId),
      queryExists(db, "webring_memberships", tenantId),
      queryExists(db, "link_gardens", tenantId),
      queryExists(db, "activity_status", tenantId),
      queryExists(db, "status_badges", tenantId),
      queryExists(db, "bookmark_shelves", tenantId),
      queryExists(db, "artifacts", tenantId),
      queryExists(db, "shrines", tenantId),
      queryExists(db, "cursor_config", tenantId),
    ]);

    pages = pagesResult.results || [];

    // Build curios array — enabled-column curios check .enabled === 1,
    // existence-based curios check !== null (row exists = configured)
    curios = [
      {
        slug: "timeline",
        name: "Timeline",
        enabled: timelineResult?.enabled === 1,
        configUrl: "/arbor/curios/timeline",
      },
      {
        slug: "gallery",
        name: "Gallery",
        enabled: galleryResult?.enabled === 1,
        configUrl: "/arbor/curios/gallery",
      },
      {
        slug: "journey",
        name: "Journey",
        enabled: journeyResult?.enabled === 1,
        configUrl: "/arbor/curios/journey",
      },
      {
        slug: "pulse",
        name: "Pulse",
        enabled: pulseResult?.enabled === 1,
        configUrl: "/arbor/curios/pulse",
      },
      {
        slug: "guestbook",
        name: "Guestbook",
        enabled: guestbookResult?.enabled === 1,
        configUrl: "/arbor/curios/guestbook",
      },
      {
        slug: "ambient",
        name: "Ambient",
        enabled: ambientResult?.enabled === 1,
        configUrl: "/arbor/curios/ambient",
      },
      {
        slug: "hitcounter",
        name: "Hit Counter",
        enabled: hitcounterResult !== null,
        configUrl: "/arbor/curios/hitcounter",
      },
      {
        slug: "nowplaying",
        name: "Now Playing",
        enabled: nowplayingResult !== null,
        configUrl: "/arbor/curios/nowplaying",
      },
      {
        slug: "polls",
        name: "Polls",
        enabled: pollsResult !== null,
        configUrl: "/arbor/curios/polls",
      },
      {
        slug: "moodring",
        name: "Mood Ring",
        enabled: moodringResult !== null,
        configUrl: "/arbor/curios/moodring",
      },
      {
        slug: "badges",
        name: "Badges",
        enabled: badgesResult !== null,
        configUrl: "/arbor/curios/badges",
      },
      {
        slug: "blogroll",
        name: "Blogroll",
        enabled: blogrollResult !== null,
        configUrl: "/arbor/curios/blogroll",
      },
      {
        slug: "webring",
        name: "Web Ring",
        enabled: webringResult !== null,
        configUrl: "/arbor/curios/webring",
      },
      {
        slug: "linkgarden",
        name: "Link Garden",
        enabled: linkgardenResult !== null,
        configUrl: "/arbor/curios/linkgarden",
      },
      {
        slug: "activitystatus",
        name: "Activity Status",
        enabled: activitystatusResult !== null,
        configUrl: "/arbor/curios/activitystatus",
      },
      {
        slug: "statusbadge",
        name: "Status Badge",
        enabled: statusbadgeResult !== null,
        configUrl: "/arbor/curios/statusbadge",
      },
      {
        slug: "bookmarkshelf",
        name: "Bookmark Shelf",
        enabled: bookmarkshelfResult !== null,
        configUrl: "/arbor/curios/bookmarkshelf",
      },
      {
        slug: "artifacts",
        name: "Artifacts",
        enabled: artifactsResult !== null,
        configUrl: "/arbor/curios/artifacts",
      },
      {
        slug: "shrines",
        name: "Shrines",
        enabled: shrinesResult !== null,
        configUrl: "/arbor/curios/shrines",
      },
      {
        slug: "cursors",
        name: "Cursors",
        enabled: cursorsResult !== null,
        configUrl: "/arbor/curios/cursors",
      },
    ];
  }

  return {
    pages,
    curios,
    pagesLoadError,
  };
};
