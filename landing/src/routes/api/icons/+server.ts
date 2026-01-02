import { ImageResponse } from "workers-og";
import type { RequestHandler } from "./$types";

/**
 * Dynamic Icon Generator
 *
 * Generates platform-specific icons from the Grove logo SVG.
 * Supports multiple sizes for different platforms.
 *
 * Query params:
 * - size: Icon size in pixels (default: 180 for apple-touch-icon)
 *         Supported: 16, 32, 48, 180, 192, 512
 * - type: "standard" | "maskable" (for Android PWA)
 *
 * Usage:
 * - /api/icons?size=180 → apple-touch-icon (180x180)
 * - /api/icons?size=32 → favicon-32x32
 * - /api/icons?size=192 → PWA icon
 * - /api/icons?size=512&type=maskable → PWA maskable icon
 *
 * Note: Static icons are now used in production for reliability.
 * This endpoint is kept for dynamic generation if needed.
 *
 * Uses workers-og for Cloudflare Pages/Workers compatibility.
 */

const VALID_SIZES = [16, 32, 48, 180, 192, 512];

export const GET: RequestHandler = async ({ url, fetch }) => {
  // Parse and validate size
  const requestedSize = parseInt(url.searchParams.get("size") || "180", 10);
  const size = VALID_SIZES.includes(requestedSize) ? requestedSize : 180;

  // Maskable icons need extra padding for Android's adaptive icon system
  const isMaskable = url.searchParams.get("type") === "maskable";

  // Load font (required by workers-og/satori)
  const fontUrl = new URL("/fonts/Lexend-Regular.ttf", url.origin);
  const fontResponse = await fetch(fontUrl.toString());

  if (!fontResponse.ok) {
    console.error(`Failed to load font: ${fontResponse.status}`);
    return new Response("Font load failed", { status: 500 });
  }

  const fontData = await fontResponse.arrayBuffer();

  // Grove logo colors
  const trunkColor = "#5d4037";
  const foliageColor = "#16a34a";

  // For maskable icons, we need a background and smaller logo (safe zone is 80%)
  // For standard icons, logo fills the space
  const logoScale = isMaskable ? 0.6 : 0.85;
  const logoSize = Math.floor(size * logoScale);

  // Create the icon HTML
  const html = `
    <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: ${isMaskable ? "#0f172a" : "transparent"};">
      <svg width="${logoSize}" height="${logoSize}" viewBox="0 0 417 512.238">
        <path fill="${trunkColor}" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
        <path fill="${foliageColor}" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
      </svg>
    </div>
  `;

  // Generate PNG using workers-og
  const response = new ImageResponse(html, {
    width: size,
    height: size,
    fonts: [
      {
        name: "Lexend",
        data: fontData,
        weight: 400,
        style: "normal",
      },
    ],
  });

  // Cache for 1 week (icons rarely change)
  response.headers.set(
    "Cache-Control",
    "public, max-age=604800, s-maxage=2592000",
  );
  response.headers.set("X-Icon-Size", `${size}x${size}`);
  response.headers.set("X-Icon-Type", isMaskable ? "maskable" : "standard");

  return response;
};
