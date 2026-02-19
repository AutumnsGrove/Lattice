import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateGardenId,
  generateLinkId,
  isValidGardenStyle,
  isValidUrl,
  sanitizeTitle,
  sanitizeLinkTitle,
  sanitizeText,
  buildFaviconUrl,
  GARDEN_STYLE_OPTIONS,
  MAX_DESCRIPTION_LENGTH,
  MAX_LINK_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_URL_LENGTH,
  type LinkGardenRecord,
  type LinkItemRecord,
} from "$lib/curios/linkgarden";

interface GardenRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  style: string;
  created_at: string;
  updated_at: string;
}

interface LinkRow {
  id: string;
  garden_id: string;
  tenant_id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  button_image_url: string | null;
  category: string | null;
  sort_order: number;
  added_at: string;
}

function rowToGarden(row: GardenRow): LinkGardenRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    style: row.style as LinkGardenRecord["style"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLink(row: LinkRow): LinkItemRecord {
  return {
    id: row.id,
    gardenId: row.garden_id,
    tenantId: row.tenant_id,
    url: row.url,
    title: row.title,
    description: row.description,
    faviconUrl: row.favicon_url,
    buttonImageUrl: row.button_image_url,
    category: row.category,
    sortOrder: row.sort_order,
    addedAt: row.added_at,
  };
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      gardens: [],
      styleOptions: GARDEN_STYLE_OPTIONS,
      error: "Database not available",
    };
  }

  const [gardensResult, linksResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, tenant_id, title, description, style, created_at, updated_at
         FROM link_gardens WHERE tenant_id = ? ORDER BY created_at ASC`,
      )
      .bind(tenantId)
      .all<GardenRow>()
      .catch(() => ({ results: [] as GardenRow[] })),
    db
      .prepare(
        `SELECT id, garden_id, tenant_id, url, title, description, favicon_url, button_image_url, category, sort_order, added_at
         FROM link_garden_items WHERE tenant_id = ? ORDER BY sort_order ASC`,
      )
      .bind(tenantId)
      .all<LinkRow>()
      .catch(() => ({ results: [] as LinkRow[] })),
  ]);

  const gardens = gardensResult.results.map(rowToGarden);
  const links = linksResult.results.map(rowToLink);

  // Group links by garden
  const linksByGarden = new Map<string, LinkItemRecord[]>();
  for (const link of links) {
    const existing = linksByGarden.get(link.gardenId) ?? [];
    existing.push(link);
    linksByGarden.set(link.gardenId, existing);
  }

  const gardensWithLinks = gardens.map((g) => ({
    ...g,
    links: linksByGarden.get(g.id) ?? [],
  }));

  return {
    gardens: gardensWithLinks,
    styleOptions: GARDEN_STYLE_OPTIONS,
  };
};

export const actions: Actions = {
  createGarden: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const title = sanitizeTitle(formData.get("title") as string | null);
    const description = sanitizeText(
      formData.get("description") as string | null,
      MAX_DESCRIPTION_LENGTH,
    );
    const style = formData.get("style") as string;
    const finalStyle = isValidGardenStyle(style) ? style : "list";

    const id = generateGardenId();

    try {
      await db
        .prepare(
          `INSERT INTO link_gardens (id, tenant_id, title, description, style)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, tenantId, title, description, finalStyle)
        .run();

      return { success: true, gardenCreated: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  updateGarden: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const gardenId = formData.get("gardenId") as string;
    const title = sanitizeTitle(formData.get("title") as string | null);
    const description = sanitizeText(
      formData.get("description") as string | null,
      MAX_DESCRIPTION_LENGTH,
    );
    const style = formData.get("style") as string;
    const finalStyle = isValidGardenStyle(style) ? style : "list";

    try {
      await db
        .prepare(
          `UPDATE link_gardens SET title = ?, description = ?, style = ?, updated_at = datetime('now')
           WHERE id = ? AND tenant_id = ?`,
        )
        .bind(title, description, finalStyle, gardenId, tenantId)
        .run();

      return { success: true, gardenUpdated: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  deleteGarden: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const gardenId = formData.get("gardenId") as string;

    try {
      await db
        .prepare(
          `DELETE FROM link_garden_items WHERE garden_id = ? AND tenant_id = ?`,
        )
        .bind(gardenId, tenantId)
        .run();

      await db
        .prepare(`DELETE FROM link_gardens WHERE id = ? AND tenant_id = ?`)
        .bind(gardenId, tenantId)
        .run();

      return { success: true, gardenDeleted: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },

  addLink: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const gardenId = formData.get("gardenId") as string;
    const url = ((formData.get("url") as string) || "").trim();
    const title = sanitizeLinkTitle(formData.get("title") as string | null);
    const description = sanitizeText(
      formData.get("description") as string | null,
      MAX_LINK_DESCRIPTION_LENGTH,
    );
    const category = sanitizeText(
      formData.get("category") as string | null,
      MAX_CATEGORY_LENGTH,
    );

    if (!url || url.length > MAX_URL_LENGTH || !isValidUrl(url)) {
      return fail(400, {
        error: "Please enter a valid URL",
        error_code: "INVALID_URL",
      });
    }

    const faviconUrl = buildFaviconUrl(url);
    const id = generateLinkId();

    // Get next sort order
    const maxOrder = await db
      .prepare(
        `SELECT MAX(sort_order) as max_order FROM link_garden_items WHERE garden_id = ?`,
      )
      .bind(gardenId)
      .first<{ max_order: number | null }>()
      .catch(() => null);
    const sortOrder = ((maxOrder?.max_order as number) ?? -1) + 1;

    try {
      await db
        .prepare(
          `INSERT INTO link_garden_items (id, garden_id, tenant_id, url, title, description, favicon_url, category, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          gardenId,
          tenantId,
          url,
          title,
          description,
          faviconUrl,
          category,
          sortOrder,
        )
        .run();

      return { success: true, linkAdded: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  removeLink: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const linkId = formData.get("linkId") as string;

    try {
      await db
        .prepare(`DELETE FROM link_garden_items WHERE id = ? AND tenant_id = ?`)
        .bind(linkId, tenantId)
        .run();

      return { success: true, linkRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
