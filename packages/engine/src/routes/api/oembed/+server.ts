import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  findProvider,
  getEmbedUrl,
  extractIframeSrcFromHtml,
  type OEmbedResponse,
} from "$lib/server/services/oembed-providers.js";
import { fetchOGMetadata } from "$lib/server/services/og-fetcher.js";

/**
 * GET /api/oembed?url=... - Fetch embed data for a URL
 *
 * Checks the URL against the trusted provider allowlist:
 * - If matched: fetches oEmbed data from the provider, returns embed info
 * - If not matched: fetches OG metadata for a link preview fallback
 *
 * Response shape:
 * {
 *   type: 'embed' | 'preview',
 *   provider?: string,
 *   embedUrl?: string,        // For iframe-src rendering
 *   embedHtml?: string,       // For iframe-srcdoc rendering
 *   title?: string,
 *   thumbnail?: string,
 *   aspectRatio?: string,
 *   sandboxPermissions?: string[],
 *   og?: OGMetadata,          // For preview fallback
 * }
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    throw error(400, "Missing required 'url' parameter");
  }

  // Validate it's a real URL
  try {
    new URL(targetUrl);
  } catch {
    throw error(400, "Invalid URL");
  }

  // Check against provider allowlist
  const match = findProvider(targetUrl);

  if (match) {
    // Trusted provider — fetch oEmbed data
    try {
      const embedUrl = getEmbedUrl(match.provider, targetUrl);

      // Try to fetch oEmbed data from the provider
      let oembedData: OEmbedResponse | null = null;
      try {
        const oembedUrl = new URL(match.provider.oembedUrl);
        oembedUrl.searchParams.set("url", targetUrl);
        oembedUrl.searchParams.set("format", "json");
        oembedUrl.searchParams.set("maxwidth", "400");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(oembedUrl.href, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "GroveBot/1.0 (+https://grove.place; oEmbed Consumer)",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          oembedData = (await response.json()) as OEmbedResponse;
        }
      } catch {
        // oEmbed fetch failed — we can still use extractEmbedUrl
      }

      // Determine the final embed URL
      let finalEmbedUrl = embedUrl;
      let embedHtml: string | null = null;

      if (!finalEmbedUrl && oembedData?.html) {
        if (match.provider.renderStrategy === "iframe-src") {
          // Try to extract src from the oEmbed HTML
          finalEmbedUrl = extractIframeSrcFromHtml(oembedData.html);
        } else if (match.provider.renderStrategy === "iframe-srcdoc") {
          embedHtml = oembedData.html;
        }
      }

      return json(
        {
          type: "embed" as const,
          provider: match.provider.name,
          renderStrategy: match.provider.renderStrategy,
          embedUrl: finalEmbedUrl,
          embedHtml: embedHtml,
          title: oembedData?.title,
          thumbnail: oembedData?.thumbnail_url,
          aspectRatio: match.provider.aspectRatio || "16:9",
          sandboxPermissions: match.provider.sandboxPermissions,
          maxWidth: match.provider.maxWidth,
          cacheAge: oembedData?.cache_age || 86400,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        },
      );
    } catch (err) {
      // Provider fetch failed entirely — fall through to OG preview
      console.error(
        `oEmbed fetch failed for ${match.provider.name}:`,
        err,
      );
    }
  }

  // Not a trusted provider (or provider fetch failed) — fetch OG metadata
  const ogResult = await fetchOGMetadata(targetUrl, {
    kv: platform?.env?.CACHE_KV,
    timeout: 5000,
    cacheTtl: 3600,
  });

  return json(
    {
      type: "preview" as const,
      provider: null,
      og: ogResult.success ? ogResult.data : null,
      error: ogResult.success ? undefined : ogResult.error,
      url: targetUrl,
    },
    {
      headers: {
        "Cache-Control": ogResult.success
          ? "public, max-age=1800, s-maxage=3600"
          : "no-cache",
      },
    },
  );
};
