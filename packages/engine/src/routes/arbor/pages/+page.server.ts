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

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Auth is handled by the parent /admin layout - no duplicate check needed here
  const tenantId = locals.tenantId;
  let pages: PageRecord[] = [];
  let curios: CurioStatus[] = [];
  let pagesLoadError = false;

  // Try D1 first
  if (platform?.env?.DB) {
    // Run pages and curio queries in parallel
    const [
      pagesResult,
      timelineResult,
      galleryResult,
      journeyResult,
      pulseResult,
    ] = await Promise.all([
      platform.env.DB.prepare(
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

      platform.env.DB.prepare(
        `SELECT enabled FROM timeline_curio_config WHERE tenant_id = ?`,
      )
        .bind(tenantId)
        .first<CurioConfig>()
        .catch(() => null),

      platform.env.DB.prepare(
        `SELECT enabled FROM gallery_curio_config WHERE tenant_id = ?`,
      )
        .bind(tenantId)
        .first<CurioConfig>()
        .catch(() => null),

      platform.env.DB.prepare(
        `SELECT enabled FROM journey_curio_config WHERE tenant_id = ?`,
      )
        .bind(tenantId)
        .first<CurioConfig>()
        .catch(() => null),

      platform.env.DB.prepare(
        `SELECT enabled FROM pulse_curio_config WHERE tenant_id = ?`,
      )
        .bind(tenantId)
        .first<CurioConfig>()
        .catch(() => null),
    ]);

    pages = pagesResult.results || [];

    // Build curios array with status
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
    ];
  }

  return {
    pages,
    curios,
    pagesLoadError,
  };
};
