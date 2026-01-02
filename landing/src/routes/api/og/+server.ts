import { ImageResponse } from "workers-og";
import type { RequestHandler } from "./$types";

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Dynamic Open Graph Image Generator
 *
 * Generates custom OG images with:
 * - Grove logo on the left 1/4
 * - Page content preview on the right 3/4
 *
 * Query params:
 * - title: Page title (max 100 chars)
 * - subtitle: Optional subtitle/description (max 200 chars)
 * - accent: Optional accent color (hex without #, 3 or 6 chars)
 *
 * Uses workers-og for Cloudflare Pages/Workers compatibility.
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
  // Limit string lengths to prevent DoS and escape HTML to prevent XSS
  const title = escapeHtml(
    (url.searchParams.get("title") || "Grove").slice(0, 100),
  );
  const subtitle = escapeHtml(
    (url.searchParams.get("subtitle") || "A place to Be.").slice(0, 200),
  );

  // Validate accent color (hex format: 3 or 6 chars, no #)
  const rawAccent = url.searchParams.get("accent") || "16a34a";
  const accent = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(rawAccent)
    ? rawAccent
    : "16a34a"; // Default grove green

  // Load Lexend font from static assets
  const fontUrl = new URL("/fonts/Lexend-Regular.ttf", url.origin);
  const fontResponse = await fetch(fontUrl.toString());

  if (!fontResponse.ok) {
    console.error(
      `Failed to load font from ${fontUrl.toString()}: ${fontResponse.status}`,
    );
    return new Response(
      `OG Image Error: Font not found. Please ensure Lexend-Regular.ttf exists in /static/fonts/.`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }

  const fontData = await fontResponse.arrayBuffer();

  // Grove logo as inline SVG data URI for embedding
  const logoSvg = `
    <svg viewBox="0 0 100 100" width="180" height="180">
      <path
        d="M50 0 L55 35 L90 20 L60 50 L90 80 L55 65 L50 100 L45 65 L10 80 L40 50 L10 20 L45 35 Z"
        fill="#${accent}"
      />
    </svg>
  `;

  // Create the OG image HTML template
  // workers-og parses HTML using Cloudflare's HTMLRewriter
  const html = `
    <div style="display: flex; width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; font-family: 'Lexend', sans-serif;">
      <div style="display: flex; align-items: center; justify-content: center; width: 300px; height: 100%; background: rgba(255, 255, 255, 0.05); border-right: 2px solid rgba(255, 255, 255, 0.1);">
        <div style="display: flex; width: 180px; height: 180px; opacity: 0.9;">
          ${logoSvg}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; justify-content: center; padding: 80px 60px; width: 900px; height: 100%;">
        <div style="font-size: 72px; font-weight: 600; line-height: 1.2; margin-bottom: 24px; color: white;">
          ${title}
        </div>
        <div style="font-size: 32px; line-height: 1.5; color: rgba(255, 255, 255, 0.8); max-width: 750px;">
          ${subtitle}
        </div>
        <div style="margin-top: 48px; font-size: 24px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.5px;">
          grove.place
        </div>
      </div>
    </div>
  `;

  // Generate PNG using workers-og
  const response = new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Lexend",
        data: fontData,
        weight: 400,
        style: "normal",
      },
    ],
  });

  // Add cache headers
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800",
  );
  response.headers.set("X-Generated-At", new Date().toISOString());

  return response;
};
