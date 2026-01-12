import { ImageResponse } from "workers-og";

export interface Env {
  ENVIRONMENT: string;
}

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

let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const response = await fetch(
    "https://cdn.grove.place/fonts/Lexend-Regular.ttf",
  );
  if (!response.ok) throw new Error(`Font fetch failed: ${response.status}`);
  fontCache = await response.arrayBuffer();
  return fontCache;
}

// =============================================================================
// PALETTE - Synced from landing/src/lib/components/nature/palette.ts
// Keep these in sync with the source palette file!
// =============================================================================

const greens = {
  darkForest: "#0d4a1c",
  deepGreen: "#166534",
  grove: "#16a34a", // Grove brand primary green
  meadow: "#22c55e",
  spring: "#4ade80",
  mint: "#86efac",
  pale: "#bbf7d0",
} as const;

const autumn = {
  rust: "#9a3412",
  ember: "#c2410c",
  pumpkin: "#ea580c",
  amber: "#d97706",
  gold: "#eab308",
  honey: "#facc15",
  straw: "#fde047",
} as const;

const winter = {
  snow: "#f8fafc",
  frost: "#e2e8f0",
  ice: "#cbd5e1",
  glacier: "#94a3b8",
  frostedPine: "#2d4a3e",
  winterGreen: "#3d5a4a",
  twilight: "#bfdbfe",
} as const;

const midnightBloom = {
  deepPlum: "#581c87",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  warmCream: "#fef3c7",
  softGold: "#fcd34d",
} as const;

const accents = {
  sky: {
    dayLight: "#e0f2fe",
    dayMid: "#7dd3fc",
    night: "#1e293b",
    star: "#fefce8",
  },
  water: {
    surface: "#7dd3fc",
    deep: "#0284c7",
    shallow: "#bae6fd",
  },
} as const;

// Slate colors for default dark theme (from Tailwind)
const slate = {
  900: "#0f172a",
  800: "#1e293b",
  700: "#334155",
  400: "#94a3b8",
  200: "#e2e8f0",
  50: "#f8fafc",
} as const;

// =============================================================================
// VARIANT COLOR SCHEMES
// =============================================================================

type Variant = "default" | "forest" | "workshop" | "midnight" | "knowledge";

interface ColorScheme {
  bgFrom: string;
  bgTo: string;
  accent: string;
  text: string;
  muted: string;
  glass: string;
  glassBorder: string;
}

function getColors(variant: Variant): ColorScheme {
  switch (variant) {
    case "forest":
      return {
        bgFrom: greens.darkForest,
        bgTo: greens.deepGreen,
        accent: greens.mint,
        text: greens.pale,
        muted: greens.spring,
        glass: "rgba(13, 74, 28, 0.6)", // darkForest with alpha
        glassBorder: "rgba(134, 239, 172, 0.2)", // mint with alpha
      };

    case "workshop":
      // Muted workshop - slate base with warm amber accents
      return {
        bgFrom: slate[900],
        bgTo: slate[800],
        accent: autumn.gold,
        text: autumn.straw,
        muted: autumn.honey,
        glass: "rgba(15, 23, 42, 0.6)", // slate.900 with alpha
        glassBorder: "rgba(234, 179, 8, 0.2)", // gold with alpha
      };

    case "midnight":
      return {
        bgFrom: midnightBloom.deepPlum,
        bgTo: midnightBloom.purple,
        accent: midnightBloom.amber,
        text: midnightBloom.warmCream,
        muted: midnightBloom.softGold,
        glass: "rgba(88, 28, 135, 0.6)", // deepPlum with alpha
        glassBorder: "rgba(245, 158, 11, 0.2)", // amber with alpha
      };

    case "knowledge":
      return {
        bgFrom: accents.sky.night,
        bgTo: accents.water.deep,
        accent: accents.water.surface,
        text: accents.sky.dayLight,
        muted: accents.water.shallow,
        glass: "rgba(30, 41, 59, 0.6)", // sky.night with alpha
        glassBorder: "rgba(125, 211, 252, 0.2)", // water.surface with alpha
      };

    default:
      return {
        bgFrom: slate[900],
        bgTo: slate[800],
        accent: greens.grove,
        text: slate[50],
        muted: slate[400],
        glass: "rgba(15, 23, 42, 0.6)", // slate.900 with alpha
        glassBorder: "rgba(22, 163, 74, 0.2)", // grove with alpha
      };
  }
}

// =============================================================================
// HTML GENERATION - Simplified for Satori performance
// =============================================================================

function generateHtml(
  title: string,
  subtitle: string,
  preview: string | null,
  variant: Variant,
): string {
  const c = getColors(variant);

  // Glass panel on right side with fading text effect
  let rightPanel: string;
  if (preview) {
    // Split into ~4 lines with decreasing opacity for fade effect
    const line1 = preview.slice(0, 60);
    const line2 = preview.slice(60, 120);
    const line3 = preview.slice(120, 170);
    const line4 = preview.slice(170, 210);

    rightPanel = `<div style="display: flex; flex-direction: column; position: absolute; right: 60px; top: 120px; bottom: 100px; width: 380px; padding: 24px; background: ${c.glass}; border-radius: 16px; border: 1px solid ${c.glassBorder}; overflow: hidden;">
      <div style="display: flex; font-size: 17px; color: ${c.muted}; line-height: 1.7; opacity: 1;">${line1}</div>
      <div style="display: flex; font-size: 17px; color: ${c.muted}; line-height: 1.7; opacity: 0.75;">${line2}</div>
      <div style="display: flex; font-size: 17px; color: ${c.muted}; line-height: 1.7; opacity: 0.5;">${line3}</div>
      <div style="display: flex; font-size: 17px; color: ${c.muted}; line-height: 1.7; opacity: 0.25;">${line4}</div>
    </div>`;
  } else {
    rightPanel = `<div style="display: flex; position: absolute; right: 60px; top: 120px; bottom: 100px; width: 380px; background: ${c.glass}; border-radius: 16px; border: 1px solid ${c.glassBorder}; opacity: 0.5;"></div>`;
  }

  // Ultra-simplified layout - minimal elements, no gradients, solid bg
  return `<div style="display: flex; flex-direction: column; width: 1200px; height: 630px; background: ${c.bgFrom}; padding: 60px; font-family: Lexend; position: relative;">
  <div style="display: flex; position: absolute; top: 0; left: 0; width: 1200px; height: 6px; background: ${c.accent};"></div>
  <div style="display: flex; align-items: center; margin-bottom: 32px;">
    <img src="https://grove.place/icon-192.png" width="48" height="48" style="border-radius: 8px;" />
    <div style="display: flex; font-size: 24px; font-weight: 600; color: ${c.accent}; margin-left: 14px;">Grove</div>
  </div>
  <div style="display: flex; font-size: 56px; font-weight: 700; color: ${c.text}; line-height: 1.15; max-width: 660px;">${title}</div>
  <div style="display: flex; font-size: 26px; color: ${c.muted}; margin-top: 16px; line-height: 1.4; max-width: 620px;">${subtitle}</div>
  ${rightPanel}
  <div style="display: flex; position: absolute; bottom: 50px; left: 60px;">
    <div style="display: flex; font-size: 18px; color: ${c.muted};">grove.place</div>
  </div>
</div>`;
}

// =============================================================================
// SSRF PREVENTION - URL VALIDATION
// =============================================================================

// Allowed domains for fetching
const ALLOWED_DOMAINS = new Set([
  "grove.place",
  "cdn.grove.place",
  "imagedelivery.net", // Cloudflare Images
]);

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block non-HTTPS
    if (url.protocol !== "https:") {
      return false;
    }

    // Block internal/private IPs
    const hostname = url.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    // Check against allowlist OR allow subdomains of grove.place
    if (ALLOWED_DOMAINS.has(hostname) || hostname.endsWith(".grove.place")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// =============================================================================
// DYNAMIC CONTENT FETCHING
// =============================================================================

interface PageMeta {
  title: string | null;
  description: string | null;
  preview: string | null;
}

async function fetchPageMeta(pageUrl: string): Promise<PageMeta> {
  try {
    const response = await fetch(pageUrl, {
      headers: { "User-Agent": "Grove-OG-Bot/1.0" },
    });
    if (!response.ok) return { title: null, description: null, preview: null };

    const html = await response.text();

    // Extract meta tags using regex (simple, no DOM parser needed)
    const getMetaContent = (name: string): string | null => {
      // Try property="og:X" first
      const ogMatch = html.match(
        new RegExp(
          `<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
      );
      if (ogMatch) return ogMatch[1];

      // Try name="X"
      const nameMatch = html.match(
        new RegExp(
          `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
      );
      if (nameMatch) return nameMatch[1];

      // Try reversed attribute order
      const reversedMatch = html.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:og:)?${name}["']`,
          "i",
        ),
      );
      if (reversedMatch) return reversedMatch[1];

      return null;
    };

    // Get title from og:title or <title> tag
    const ogTitle = getMetaContent("title");
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : null);

    // Get description
    const description = getMetaContent("description");

    // Try to extract preview content from main text
    // Look for article, main content, or first paragraphs
    let preview = description;
    if (!preview) {
      // Strip scripts and styles, then get text from paragraphs
      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      const paragraphs = cleanHtml.match(/<p[^>]*>([^<]+)<\/p>/gi);
      if (paragraphs && paragraphs.length > 0) {
        const firstParas = paragraphs
          .slice(0, 3)
          .map((p) => p.replace(/<[^>]+>/g, "").trim())
          .filter((p) => p.length > 20)
          .join(" ");
        preview = firstParas.slice(0, 300);
      }
    }

    return { title, description, preview };
  } catch (e) {
    console.error("Failed to fetch page meta:", e);
    return { title: null, description: null, preview: null };
  }
}

// =============================================================================
// WORKER HANDLER
// =============================================================================

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (
      request.method !== "GET" ||
      (url.pathname !== "/" && url.pathname !== "/og")
    ) {
      return new Response("Not found", { status: 404 });
    }

    try {
      // Check for dynamic URL fetching
      const pageUrl = url.searchParams.get("url");
      let pageMeta: PageMeta | null = null;

      if (pageUrl) {
        // Validate URL against SSRF prevention rules
        if (isAllowedUrl(pageUrl)) {
          pageMeta = await fetchPageMeta(pageUrl);
        }
      }

      // Use fetched meta or fall back to explicit params
      const rawTitle =
        url.searchParams.get("title") || pageMeta?.title || "Grove";
      const rawSubtitle =
        url.searchParams.get("subtitle") ||
        pageMeta?.description ||
        "A place to Be.";
      const rawVariant = url.searchParams.get("variant") || "default";
      const rawPreview = url.searchParams.get("preview") || pageMeta?.preview;

      const title = escapeHtml(rawTitle.slice(0, 80));
      const subtitle = escapeHtml(rawSubtitle.slice(0, 150));
      const preview = rawPreview ? escapeHtml(rawPreview.slice(0, 400)) : null;
      const variant = [
        "default",
        "forest",
        "workshop",
        "midnight",
        "knowledge",
      ].includes(rawVariant)
        ? (rawVariant as Variant)
        : "default";

      const fontData = await getFont();
      const html = generateHtml(title, subtitle, preview, variant);

      const response = new ImageResponse(html, {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Lexend", data: fontData, weight: 400, style: "normal" },
        ],
      });

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
      headers.set("X-Generated-At", new Date().toISOString());
      headers.set("X-OG-Variant", variant);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

      return new Response(response.body, { status: 200, headers });
    } catch (error) {
      console.error("OG error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed",
          message: error instanceof Error ? error.message : "Unknown",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  },
};
