/**
 * Grove Smart Links - /go/[...path]
 *
 * Redirects authenticated users to their arbor panel with path preservation.
 * Used in email templates so links work regardless of tenant subdomain.
 *
 * Examples:
 *   /go/arbor         → autumn.grove.place/arbor
 *   /go/posts/new     → autumn.grove.place/arbor/posts/new
 *   /go/settings      → autumn.grove.place/arbor/settings
 *
 * If user has no tenant yet, redirects to plant.grove.place (signup flow).
 * If user is not authenticated, redirects to sign-in page.
 */
import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({
  locals,
  platform,
  params,
  url,
}) => {
  // 1. Check authentication
  if (!locals.user) {
    // Redirect to sign-in with return URL
    const returnTo = encodeURIComponent(url.pathname);
    throw redirect(302, `/sign-in?returnTo=${returnTo}`);
  }

  // 2. Ensure DB is available
  if (!platform?.env?.DB) {
    throw error(503, "Service temporarily unavailable");
  }

  try {
    // 3. Look up user's tenant by email (case-insensitive)
    const tenant = await platform.env.DB.prepare(
      "SELECT subdomain FROM tenants WHERE LOWER(email) = LOWER(?) LIMIT 1",
    )
      .bind(locals.user.email)
      .first<{ subdomain: string }>();

    // 4. Handle user without a tenant yet
    if (!tenant?.subdomain) {
      // They signed up but haven't planted yet → send to Plant
      throw redirect(302, "https://plant.grove.place");
    }

    // 5. Build arbor panel URL with preserved path
    const subdomain = tenant.subdomain;
    const path = params.path || "";

    // Determine if path should go to /arbor or is already a full path
    let targetPath: string;
    if (path === "" || path === "arbor") {
      targetPath = "/arbor";
    } else if (path.startsWith("arbor/")) {
      targetPath = `/${path}`;
    } else {
      // Assume paths like "posts/new", "settings" should be under /arbor
      targetPath = `/arbor/${path}`;
    }

    const targetUrl = `https://${subdomain}.grove.place${targetPath}`;

    // 6. Optional: Log for click tracking (async, don't await)
    // Could be extended to track email campaign clicks
    // logClick(locals.user.email, path, url.searchParams.get('utm_source'));

    throw redirect(302, targetUrl);
  } catch (err) {
    // Rethrow redirects
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    // Log unexpected errors
    console.error("[/go] Redirect error:", err);
    throw error(500, "Unable to redirect to your grove");
  }
};
