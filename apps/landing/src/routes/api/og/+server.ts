import type { RequestHandler } from "./$types";

/**
 * OG Image Generation Proxy
 *
 * Redirects to the dedicated og.grove.place Worker for dynamic OG image generation.
 * The separate Worker was needed because WASM bundling doesn't work with SvelteKit + Cloudflare Pages.
 *
 * See packages/og-worker for the actual implementation.
 */
export const GET: RequestHandler = async ({ url }) => {
  // Build og.grove.place URL with same query params
  const ogUrl = new URL("https://og.grove.place/");
  url.searchParams.forEach((value, key) => {
    ogUrl.searchParams.set(key, value);
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: ogUrl.toString(),
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "X-Generated-At": new Date().toISOString(),
      "X-OG-Status": "proxy-to-worker",
    },
  });
};
