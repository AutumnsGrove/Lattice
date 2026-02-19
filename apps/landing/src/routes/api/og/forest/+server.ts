import type { RequestHandler } from "./$types";

/**
 * Forest-style OG Image Generation Proxy
 *
 * Redirects to og.grove.place for forest-themed OG images.
 * Currently uses the same default design; forest-specific theming can be added later.
 *
 * See packages/og-worker for the actual implementation.
 */
export const GET: RequestHandler = async ({ url }) => {
  // Build og.grove.place URL with forest-themed defaults
  const ogUrl = new URL("https://og.grove.place/");

  // Pass through any custom params, or use forest defaults
  const title = url.searchParams.get("title") || "The Grove";
  const subtitle = url.searchParams.get("subtitle") || "Where ideas take root.";
  const accent = url.searchParams.get("accent") || "16a34a"; // Forest green

  ogUrl.searchParams.set("title", title);
  ogUrl.searchParams.set("subtitle", subtitle);
  ogUrl.searchParams.set("accent", accent);

  return new Response(null, {
    status: 302,
    headers: {
      Location: ogUrl.toString(),
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "X-Generated-At": new Date().toISOString(),
      "X-OG-Status": "proxy-to-worker-forest",
    },
  });
};
