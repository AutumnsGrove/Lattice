import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@cf-wasm/resvg/workerd";
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
 */

const VALID_SIZES = [16, 32, 48, 180, 192, 512];

export const GET: RequestHandler = async ({ url, fetch }) => {
  // Parse and validate size
  const requestedSize = parseInt(url.searchParams.get("size") || "180", 10);
  const size = VALID_SIZES.includes(requestedSize) ? requestedSize : 180;

  // Maskable icons need extra padding for Android's adaptive icon system
  const isMaskable = url.searchParams.get("type") === "maskable";

  // Load Lexend font (needed for Satori even if not used)
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
  const padding = Math.floor((size - logoSize) / 2);

  // Create the icon markup
  const markup = html(`
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${isMaskable ? "#0f172a" : "transparent"};
    ">
      <svg
        width="${logoSize}"
        height="${logoSize}"
        viewBox="0 0 417 512.238"
        style="display: flex;"
      >
        <!-- Trunk -->
        <path fill="${trunkColor}" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
        <!-- Foliage -->
        <path fill="${foliageColor}" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
      </svg>
    </div>
  `);

  // Generate SVG using Satori
  const svg = await satori(markup, {
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

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: size,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Cache for 1 week (icons rarely change)
  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000",
      "X-Icon-Size": `${size}x${size}`,
      "X-Icon-Type": isMaskable ? "maskable" : "standard",
    },
  });
};
