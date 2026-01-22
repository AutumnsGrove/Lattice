import { ImageResponse } from "workers-og";

export interface Env {
  ENVIRONMENT: string;
  OG_CACHE?: KVNamespace;
}

function escapeHtml(text: string): string {
  // Only escape characters that could inject HTML tags
  // Apostrophes and quotes are safe - Satori renders them as-is
  // (Satori doesn't interpret HTML entities, so &#039; would show literally)
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  };
  return text.replace(/[&<>]/g, (m) => map[m]);
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
// EXTERNAL OG METADATA FETCHER (for LinkPreview component)
// =============================================================================

interface OGMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  siteName?: string;
  favicon?: string;
  domain: string;
  type?: string;
  fetchedAt: string;
}

interface OGFetchResult {
  success: boolean;
  data?: OGMetadata;
  error?: string;
  errorCode?: string;
  cached?: boolean;
}

// Blocked URL patterns for external fetch (security - SSRF protection)
const BLOCKED_EXTERNAL_PATTERNS = [
  // Localhost variations
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  // Private IP ranges (RFC 1918)
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  // Link-local addresses (RFC 3927)
  /^https?:\/\/169\.254\./,
  // Cloud metadata endpoints (AWS, GCP, Azure, DigitalOcean, etc.)
  /^https?:\/\/169\.254\.169\.254/,
  /^https?:\/\/metadata\./i,
  /^https?:\/\/metadata-/i,
  // IPv6 localhost
  /^https?:\/\/\[::1\]/,
  // IPv6 link-local
  /^https?:\/\/\[fe80:/i,
  // IPv6 unique local addresses (fc00::/7)
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  // Dangerous protocols
  /^file:/i,
  /^data:/i,
];

function isBlockedExternalUrl(urlString: string): boolean {
  for (const pattern of BLOCKED_EXTERNAL_PATTERNS) {
    if (pattern.test(urlString)) {
      return true;
    }
  }
  return false;
}

function extractDomain(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

function resolveExternalUrl(
  base: URL,
  relative: string | undefined,
): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("//")) {
    return `${base.protocol}${relative}`;
  }
  try {
    return new URL(relative, base.href).href;
  } catch {
    return undefined;
  }
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (match) => entities[match] || match,
  );
}

function extractExternalMetaContent(
  html: string,
  property: string,
): string | undefined {
  // Try og: property first
  const ogPatterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of ogPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  // Try name attribute for non-OG meta tags
  const namePatterns = [
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

function extractExternalTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function extractExternalFavicon(html: string, baseUrl: URL): string | undefined {
  const patterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveExternalUrl(baseUrl, match[1]);
    }
  }

  return `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
}

function parseExternalOGMetadata(
  html: string,
  url: URL,
): Omit<OGMetadata, "fetchedAt"> {
  return {
    url: url.href,
    domain: extractDomain(url),
    title: extractExternalMetaContent(html, "og:title") || extractExternalTitle(html),
    description:
      extractExternalMetaContent(html, "og:description") ||
      extractExternalMetaContent(html, "description"),
    image: resolveExternalUrl(url, extractExternalMetaContent(html, "og:image")),
    imageAlt: extractExternalMetaContent(html, "og:image:alt"),
    siteName: extractExternalMetaContent(html, "og:site_name"),
    type: extractExternalMetaContent(html, "og:type"),
    favicon: extractExternalFavicon(html, url),
  };
}

async function handleOGFetch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Missing url parameter",
        errorCode: "INVALID_URL",
      } satisfies OGFetchResult),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid URL format",
        errorCode: "INVALID_URL",
      } satisfies OGFetchResult),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Check for blocked URLs (security)
  if (isBlockedExternalUrl(targetUrl)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "URL is blocked for security reasons",
        errorCode: "BLOCKED",
      } satisfies OGFetchResult),
      {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Check cache first
  const cacheKey = `og:${targetUrl}`;
  if (env.OG_CACHE) {
    try {
      const cached = await env.OG_CACHE.get(cacheKey, "json");
      if (cached) {
        return new Response(
          JSON.stringify({
            success: true,
            data: cached as OGMetadata,
            cached: true,
          } satisfies OGFetchResult),
          {
            headers: {
              "Content-Type": "application/json",
              "X-Cache": "HIT",
              ...corsHeaders,
            },
          },
        );
      }
    } catch {
      // Cache miss or error, continue to fetch
    }
  }

  // Fetch the URL
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "GroveBot/1.0 (+https://grove.place; Open Graph Fetcher)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout ? "Request timed out" : "Failed to fetch URL",
        errorCode: isTimeout ? "TIMEOUT" : "FETCH_FAILED",
      } satisfies OGFetchResult),
      {
        status: isTimeout ? 504 : 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorCode: "FETCH_FAILED",
      } satisfies OGFetchResult),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Check content type
  const contentType = response.headers.get("content-type") || "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Response is not HTML",
        errorCode: "NOT_HTML",
      } satisfies OGFetchResult),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Read HTML (just the head section for efficiency)
  let html: string;
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const maxSize = 512 * 1024; // 512KB max

    while (totalSize < maxSize) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;

      // Check if we've got the </head> tag
      const decoder = new TextDecoder();
      const partial = decoder.decode(value, { stream: true });
      if (partial.includes("</head>")) {
        reader.cancel();
        break;
      }
    }

    html = new TextDecoder().decode(
      new Uint8Array(
        chunks.reduce((acc, chunk) => {
          const newArr = new Uint8Array(acc.length + chunk.length);
          newArr.set(acc);
          newArr.set(chunk, acc.length);
          return newArr;
        }, new Uint8Array(0)),
      ),
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to read response",
        errorCode: "PARSE_FAILED",
      } satisfies OGFetchResult),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  // Parse metadata
  const metadata: OGMetadata = {
    ...parseExternalOGMetadata(html, parsedUrl),
    fetchedAt: new Date().toISOString(),
  };

  // Cache the result (1 hour TTL)
  if (env.OG_CACHE && metadata.title) {
    try {
      await env.OG_CACHE.put(cacheKey, JSON.stringify(metadata), {
        expirationTtl: 3600,
      });
    } catch {
      // Cache write failed, continue anyway
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: metadata,
      cached: false,
    } satisfies OGFetchResult),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=300", // Browser cache 5 min
        ...corsHeaders,
      },
    },
  );
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

    // Route: /fetch - External OG metadata fetcher
    if (url.pathname === "/fetch") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleOGFetch(request, env, corsHeaders);
    }

    // Route: / or /og - OG image generation
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
