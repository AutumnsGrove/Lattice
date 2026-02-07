import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

const ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  // Fetch recent broadcasts from D1
  let broadcasts: Array<{
    id: string;
    content: string;
    platforms: string;
    status: string;
    created_at: number;
  }> = [];

  // Fetch platform status
  let platforms: Array<{
    id: string;
    name: string;
    configured: boolean;
    healthy: boolean;
    comingSoon?: boolean;
  }> = [];

  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, content, platforms, status, created_at
         FROM zephyr_broadcasts
         ORDER BY created_at DESC
         LIMIT 20`,
      ).all<{
        id: string;
        content: string;
        platforms: string;
        status: string;
        created_at: number;
      }>();
      broadcasts = result.results || [];
    } catch (err) {
      console.error("[Zephyr] Failed to load broadcasts:", err);
    }
  }

  // Fetch platform health via the Zephyr API
  try {
    const apiKey = platform?.env?.ZEPHYR_API_KEY || "";
    if (apiKey) {
      const fetchFn = platform?.env?.ZEPHYR?.fetch ?? fetch;
      const res = await fetchFn(`${ZEPHYR_URL}/broadcast/platforms`, {
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const data = (await res.json()) as { platforms: typeof platforms };
        platforms = data.platforms;
      }
    }
  } catch (err) {
    console.error("[Zephyr] Failed to fetch platforms:", err);
  }

  return {
    broadcasts,
    platforms,
  };
};

export const actions: Actions = {
  post: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!WAYFINDER_EMAILS.includes(user.email.toLowerCase())) {
      return fail(403, { error: "Access denied" });
    }

    const formData = await request.formData();
    const content = formData.get("content")?.toString()?.trim();

    if (!content) {
      return fail(400, { error: "Content is required" });
    }

    const VALID_PLATFORMS = ["bluesky"];
    const selectedPlatforms = formData
      .getAll("platforms")
      .map(String)
      .filter((p) => VALID_PLATFORMS.includes(p));
    if (selectedPlatforms.length === 0) {
      return fail(400, { error: "Select at least one platform" });
    }

    // Call Zephyr broadcast API
    const apiKey = platform?.env?.ZEPHYR_API_KEY || "";
    if (!apiKey) {
      return fail(500, { error: "Zephyr API key not configured" });
    }

    try {
      const fetchFn = platform?.env?.ZEPHYR?.fetch ?? fetch;
      const res = await fetchFn(`${ZEPHYR_URL}/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          channel: "social",
          content,
          platforms: selectedPlatforms,
          metadata: {
            source: "arbor",
            tenant: "grove",
          },
        }),
      });

      const result = (await res.json()) as {
        success: boolean;
        partial: boolean;
        deliveries: Array<{
          platform: string;
          success: boolean;
          postUrl?: string;
          error?: { message: string };
        }>;
        metadata: { broadcastId: string };
      };

      if (result.success) {
        const postUrl = result.deliveries.find((d) => d.postUrl)?.postUrl;
        return {
          success: true,
          message: "Posted successfully!",
          postUrl,
          broadcastId: result.metadata.broadcastId,
        };
      }

      if (result.partial) {
        const errors = result.deliveries
          .filter((d) => !d.success)
          .map((d) => `${d.platform}: ${d.error?.message || "failed"}`)
          .join("; ");
        return {
          success: true,
          partial: true,
          message: `Partially delivered. Failures: ${errors}`,
          broadcastId: result.metadata.broadcastId,
        };
      }

      const errorMsg = result.deliveries
        .filter((d) => !d.success)
        .map((d) => d.error?.message || "Unknown error")
        .join("; ");
      return fail(502, { error: `Delivery failed: ${errorMsg}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Zephyr] Broadcast failed:", message);
      return fail(500, { error: `Failed to post: ${message}` });
    }
  },
};
