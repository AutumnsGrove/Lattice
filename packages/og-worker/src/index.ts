import { ImageResponse } from "workers-og";

// Import pure functions from separate module (enables testing without workers-og WASM)
import {
  escapeHtml,
  decodeHtmlEntities,
  splitPreviewIntoLines,
  isAllowedUrl,
  isBlockedExternalUrl,
  extractDomain,
  resolveExternalUrl,
  getColors,
  extractExternalMetaContent,
  extractExternalTitle,
  extractExternalFavicon,
  parseExternalOGMetadata,
} from "./pure-functions";

import type {
  LineSplit,
  ColorScheme,
  Variant,
  OGMetadata,
} from "./pure-functions";

// Re-export for consumers who import from index
export {
  escapeHtml,
  decodeHtmlEntities,
  splitPreviewIntoLines,
  isAllowedUrl,
  isBlockedExternalUrl,
  extractDomain,
  resolveExternalUrl,
  getColors,
  extractExternalMetaContent,
  extractExternalTitle,
  extractExternalFavicon,
  parseExternalOGMetadata,
};

export type { LineSplit, ColorScheme, Variant, OGMetadata };

export interface Env {
  ENVIRONMENT: string;
  OG_CACHE?: KVNamespace;
}

// =============================================================================
// FONT LOADING
// =============================================================================

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
    const { line1, line2, line3, line4 } = splitPreviewIntoLines(preview);

    // Only render lines that have content, with decreasing opacity for fade effect
    const lineConfigs = [
      { text: line1, opacity: 1.0 },
      { text: line2, opacity: 0.75 },
      { text: line3, opacity: 0.5 },
      { text: line4, opacity: 0.25 },
    ].filter((config) => config.text);

    const lineElements = lineConfigs
      .map(
        ({ text, opacity }) =>
          `<div style="display: flex; font-size: 17px; color: ${c.muted}; line-height: 1.7; opacity: ${opacity};">${escapeHtml(text)}</div>`,
      )
      .join("");

    rightPanel = `<div style="display: flex; flex-direction: column; position: absolute; right: 60px; top: 120px; bottom: 100px; width: 380px; padding: 24px; background: ${c.glass}; border-radius: 16px; border: 1px solid ${c.glassBorder}; overflow: hidden;">
      ${lineElements}
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

interface OGFetchResult {
  success: boolean;
  data?: OGMetadata;
  error?: string;
  errorCode?: string;
  cached?: boolean;
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
        "User-Agent": "GroveBot/1.0 (+https://grove.place; Open Graph Fetcher)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
  } catch {
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
      const preview = rawPreview ? rawPreview.slice(0, 400) : null;
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
