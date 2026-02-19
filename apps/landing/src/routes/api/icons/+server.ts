import type { RequestHandler } from "./$types";

/**
 * Static icon redirect.
 *
 * Dynamic icon generation is broken due to workers-og WASM bundling issues with SvelteKit + Cloudflare Pages.
 * This endpoint redirects to the appropriate static icon file.
 *
 * Static icons are already used in production for reliability.
 *
 * Query params:
 * - size: Icon size in pixels (default: 180 for apple-touch-icon)
 *         Supported: 16, 32, 48, 180, 192, 512
 * - type: "standard" | "maskable" (ignored, static icons are standard)
 *
 * See TODOS.md for details.
 */

const SIZE_MAP: Record<number, string> = {
  16: "/favicon-32x32.png", // No 16x16 static, fallback to 32x32
  32: "/favicon-32x32.png",
  48: "/favicon-32x32.png", // No 48x48 static, fallback to 32x32
  180: "/apple-touch-icon.png",
  192: "/icon-192.png",
  512: "/icon-512.png",
};

export const GET: RequestHandler = async ({ url }) => {
  // Parse and validate size
  const requestedSize = parseInt(url.searchParams.get("size") || "180", 10);
  const size = requestedSize in SIZE_MAP ? requestedSize : 180;
  const staticIconPath = SIZE_MAP[size];

  // Redirect to static icon
  const staticIconUrl = new URL(staticIconPath, url.origin);
  return new Response(null, {
    status: 302,
    headers: {
      Location: staticIconUrl.toString(),
      "Cache-Control": "public, max-age=604800, s-maxage=2592000",
      "X-Icon-Size": `${size}x${size}`,
      "X-Icon-Type": "static",
      "X-Generated-At": new Date().toISOString(),
    },
  });
};
