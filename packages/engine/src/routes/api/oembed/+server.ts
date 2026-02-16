import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  findProvider,
  getEmbedUrl,
  extractIframeSrcFromHtml,
  validateOEmbedResponse,
  generateFrameSrcCSP,
  MAX_OEMBED_RESPONSE_SIZE,
  type OEmbedResponse,
} from "$lib/server/services/oembed-providers.js";
import { fetchOGMetadata } from "$lib/server/services/og-fetcher.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/**
 * GET /api/oembed?url=... - Fetch embed data for a URL
 *
 * Checks the URL against the trusted provider allowlist:
 * - If matched: fetches oEmbed data from the provider, returns embed info
 * - If not matched: fetches OG metadata for a link preview fallback
 *
 * Security hardening:
 * - Rate limited (20 requests per 60s per IP)
 * - oEmbed responses validated for shape and size
 * - Content-Length enforced before reading response body
 * - CSP frame-src header mirrors the JS allowlist
 * - URL normalized before pattern matching (case, tracking params)
 */
export const GET: RequestHandler = async ({ url, platform, request }) => {
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  // Validate it's a real URL
  try {
    new URL(targetUrl);
  } catch {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // ── Rate Limiting ──────────────────────────────────────────────────
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const clientIp = getClientIP(request);
    const denied = await thresholdCheck(threshold, {
      key: `oembed:${clientIp}`,
      limit: 20,
      windowSeconds: 60,
    });
    if (denied) return denied;
  }

  // ── Security Headers (applied to all responses) ────────────────────
  const securityHeaders: Record<string, string> = {
    "Content-Security-Policy": generateFrameSrcCSP(),
    "X-Content-Type-Options": "nosniff",
  };

  // ── Provider Matching (URL is normalized inside findProvider) ───────
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
          // ── Content-Length check ──────────────────────────────────
          const contentLength = response.headers.get("content-length");
          if (
            contentLength &&
            parseInt(contentLength) > MAX_OEMBED_RESPONSE_SIZE
          ) {
            // Response too large, skip oEmbed data
            console.warn(
              `oEmbed response from ${match.provider.name} exceeds size limit: ${contentLength} bytes`,
            );
          } else {
            // ── Content-Type check ─────────────────────────────────
            const contentType = response.headers.get("content-type") || "";
            if (
              !contentType.includes("application/json") &&
              !contentType.includes("text/json")
            ) {
              console.warn(
                `oEmbed response from ${match.provider.name} has unexpected content-type: ${contentType}`,
              );
            } else {
              // Read with size limit (stream-safe)
              const text = await response.text();
              if (text.length <= MAX_OEMBED_RESPONSE_SIZE) {
                const rawData = JSON.parse(text);
                // ── Response validation ────────────────────────────
                oembedData = validateOEmbedResponse(rawData);
                if (!oembedData) {
                  console.warn(
                    `oEmbed response from ${match.provider.name} failed validation`,
                  );
                }
              }
            }
          }
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
            ...securityHeaders,
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        },
      );
    } catch (err) {
      // Provider fetch failed entirely — fall through to OG preview
      console.error(`oEmbed fetch failed for ${match.provider.name}:`, err);
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
        ...securityHeaders,
        "Cache-Control": ogResult.success
          ? "public, max-age=1800, s-maxage=3600"
          : "no-cache",
      },
    },
  );
};
