/**
 * Hum: Music Metadata Resolution API
 *
 * GET /api/hum/resolve?url={encoded}
 *
 * Resolves metadata for a music URL using a cascading fallback strategy:
 * 1. Check KV cache
 * 2. Odesli/Songlink API (cross-platform, free)
 * 3. Provider-specific oEmbed fallbacks
 * 4. Graceful degradation (minimal card)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  API_ERRORS,
  throwGroveError,
  logGroveError,
  buildErrorJson,
} from "$lib/errors/index.js";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import * as cache from "$lib/server/services/cache.js";
import {
  detectProvider,
  isMusicUrl,
} from "$lib/ui/components/content/hum/providers.js";
import type {
  HumMetadata,
  HumProvider,
  HumContentType,
} from "$lib/ui/components/content/hum/types.js";

/** Cache TTL: 7 days (music metadata rarely changes) */
const HUM_CACHE_TTL = 7 * 24 * 60 * 60;

/** Cache namespace */
const HUM_CACHE_NS = "hum";

/** Maximum URL length to prevent abuse */
const MAX_URL_LENGTH = 2048;

/**
 * Strip HTML tags and control characters from upstream metadata strings.
 * Upstream APIs (Odesli, iTunes, oEmbed) return user-contributed data
 * that could contain HTML or script injections.
 */
function sanitizeText(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  return (
    text
      .replace(/<[^>]*>/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 500) || null
  );
}

/**
 * Validate that an artwork URL is safe to use.
 * Only allows HTTPS URLs from known CDN domains.
 */
function sanitizeArtworkUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;

    // Allow known music CDN domains
    const allowedPatterns = [
      /\.mzstatic\.com$/, // Apple Music
      /\.scdn\.co$/, // Spotify
      /\.ytimg\.com$/, // YouTube
      /\.soundcloud\.com$/, // SoundCloud
      /\.ggpht\.com$/, // Google
      /\.googleusercontent\.com$/, // Google
      /\.deezer\.com$/, // Deezer
      /\.tidal\.com$/, // Tidal
      /\.bcbits\.com$/, // Bandcamp
      /\.amazonaws\.com$/, // AWS (various providers)
      /i\.scdn\.co$/, // Spotify images
    ];

    const hostname = parsed.hostname;
    if (!allowedPatterns.some((p) => p.test(hostname))) return null;

    return url;
  } catch {
    return null;
  }
}

/**
 * Generate a cache key from a URL.
 * Uses a simple hash to keep keys short and avoid special characters.
 */
async function buildCacheKey(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `resolve:${hashHex.slice(0, 16)}`;
}

/**
 * Validate that a URL is a legitimate music URL.
 */
function validateUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Detect the content type from URL path segments.
 */
function detectContentType(url: string, provider: HumProvider): HumContentType {
  const lower = url.toLowerCase();
  if (lower.includes("/track/") || lower.includes("/watch?v=")) return "track";
  if (lower.includes("/album/")) return "album";
  if (lower.includes("/playlist")) return "playlist";
  if (lower.includes("/artist/")) return "artist";
  return "unknown";
}

// ============================================================================
// Metadata Resolution Strategies
// ============================================================================

/**
 * Strategy 1: Odesli / Songlink API
 * Free, no auth required, cross-platform.
 * Rate limit: 10 req/min (free tier).
 */
async function resolveViaOdesli(url: string): Promise<HumMetadata | null> {
  try {
    const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      headers: { "User-Agent": "Grove/1.0 (grove.place)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as Record<string, any>;

    // Extract the best available entity
    const entityKey = data.entityUniqueId;
    const entity = entityKey ? data.entitiesByUniqueId?.[entityKey] : null;

    // Build platform links from Odesli response
    const platformLinks: Partial<Record<HumProvider, string>> = {};
    const linksByPlatform = data.linksByPlatform || {};

    if (linksByPlatform.appleMusic?.url)
      platformLinks["apple-music"] = linksByPlatform.appleMusic.url;
    if (linksByPlatform.spotify?.url)
      platformLinks["spotify"] = linksByPlatform.spotify.url;
    if (linksByPlatform.youtubeMusic?.url)
      platformLinks["youtube-music"] = linksByPlatform.youtubeMusic.url;
    if (linksByPlatform.soundcloud?.url)
      platformLinks["soundcloud"] = linksByPlatform.soundcloud.url;
    if (linksByPlatform.tidal?.url)
      platformLinks["tidal"] = linksByPlatform.tidal.url;
    if (linksByPlatform.deezer?.url)
      platformLinks["deezer"] = linksByPlatform.deezer.url;
    if (linksByPlatform.amazonMusic?.url)
      platformLinks["amazon-music"] = linksByPlatform.amazonMusic.url;

    const provider = detectProvider(url);

    // Artwork: Odesli provides thumbnailUrl
    let artworkUrl = entity?.thumbnailUrl || data.thumbnailUrl || null;
    // Try to get a higher-res version for Apple Music
    if (artworkUrl && artworkUrl.includes("mzstatic.com")) {
      artworkUrl = artworkUrl.replace(/\d+x\d+/, "300x300");
    }

    const title =
      sanitizeText(entity?.title) || sanitizeText(entity?.artistName);
    const artist = sanitizeText(entity?.artistName);

    return {
      sourceUrl: url,
      provider,
      type: detectContentType(url, provider),
      title,
      artist,
      album: title !== artist ? title : null,
      artworkUrl: sanitizeArtworkUrl(artworkUrl),
      platformLinks,
      resolvedAt: new Date().toISOString(),
      status: title ? "resolved" : "partial",
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 2: Provider-specific oEmbed fallbacks
 */
async function resolveViaOembed(
  url: string,
  provider: HumProvider,
): Promise<HumMetadata | null> {
  let oembedUrl: string | null = null;

  switch (provider) {
    case "spotify":
      oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      break;
    case "soundcloud":
      oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      break;
    case "youtube-music":
      // YouTube Music shares the YouTube oEmbed endpoint
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      break;
    default:
      return null;
  }

  try {
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "Grove/1.0 (grove.place)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as Record<string, any>;

    // oEmbed returns title and thumbnail_url
    let artworkUrl = data.thumbnail_url || null;
    // Try to get better resolution
    if (artworkUrl && provider === "spotify") {
      artworkUrl = artworkUrl.replace(/\/\d+$/, "/300");
    }

    const title = sanitizeText(data.title);
    return {
      sourceUrl: url,
      provider,
      type: detectContentType(url, provider),
      title,
      artist: sanitizeText(data.author_name),
      album: null,
      artworkUrl: sanitizeArtworkUrl(artworkUrl),
      platformLinks: { [provider]: url },
      resolvedAt: new Date().toISOString(),
      status: title ? "partial" : "unresolved",
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Apple Music / iTunes Lookup API
 */
async function resolveViaItunes(url: string): Promise<HumMetadata | null> {
  // Extract the numeric ID from Apple Music URLs
  const match = url.match(/\/(\d+)(?:\?i=(\d+))?$/);
  if (!match) return null;

  const collectionId = match[1];
  const trackId = match[2];
  const lookupId = trackId || collectionId;

  try {
    const apiUrl = `https://itunes.apple.com/lookup?id=${lookupId}`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as Record<string, any>;
    const result = data.results?.[0];
    if (!result) return null;

    let artworkUrl = result.artworkUrl100 || null;
    if (artworkUrl) {
      artworkUrl = artworkUrl.replace("100x100bb", "300x300bb");
    }

    const title =
      sanitizeText(result.trackName) || sanitizeText(result.collectionName);
    return {
      sourceUrl: url,
      provider: "apple-music",
      type: result.wrapperType === "track" ? "track" : "album",
      title,
      artist: sanitizeText(result.artistName),
      album: sanitizeText(result.collectionName),
      artworkUrl: sanitizeArtworkUrl(artworkUrl),
      platformLinks: { "apple-music": url },
      resolvedAt: new Date().toISOString(),
      status: title ? "resolved" : "partial",
    };
  } catch {
    return null;
  }
}

/**
 * Build a minimal unresolved response.
 */
function buildUnresolved(url: string, provider: HumProvider): HumMetadata {
  return {
    sourceUrl: url,
    provider,
    type: detectContentType(url, provider),
    title: null,
    artist: null,
    album: null,
    artworkUrl: null,
    platformLinks: { [provider]: url },
    resolvedAt: new Date().toISOString(),
    status: "unresolved",
  };
}

// ============================================================================
// Request Handler
// ============================================================================

export const GET: RequestHandler = async ({
  url: requestUrl,
  platform,
  request,
}) => {
  const rawUrl = requestUrl.searchParams.get("url");

  // Validate required parameter
  if (!rawUrl) {
    return json(buildErrorJson(API_ERRORS.MISSING_REQUIRED_FIELDS), {
      status: 400,
    });
  }

  // Validate URL length (prevent abuse / cache pollution)
  if (rawUrl.length > MAX_URL_LENGTH) {
    return json(buildErrorJson(API_ERRORS.VALIDATION_FAILED), {
      status: 400,
    });
  }

  // Validate URL format
  const parsedUrl = validateUrl(rawUrl);
  if (!parsedUrl) {
    return json(buildErrorJson(API_ERRORS.VALIDATION_FAILED), {
      status: 400,
    });
  }

  // Validate it's a recognized music URL
  if (!isMusicUrl(rawUrl)) {
    return json(buildErrorJson(API_ERRORS.VALIDATION_FAILED), {
      status: 400,
    });
  }

  const provider = detectProvider(rawUrl);
  const threshold = createThreshold(platform?.env);

  // Rate limiting (per-IP)
  if (threshold) {
    const clientIP = getClientIP(request);
    const { result, response } = await thresholdCheckWithResult(threshold, {
      key: `hum/resolve:${clientIP}`,
      limit: 30,
      windowSeconds: 60,
    });

    if (response) return response;
  }

  // Try KV cache first
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    try {
      const cacheKey = await buildCacheKey(rawUrl);
      const cached = await cache.get<HumMetadata>(kv, cacheKey, {
        namespace: HUM_CACHE_NS,
      });

      if (cached) {
        return json(cached, {
          headers: {
            "Cache-Control":
              "public, max-age=3600, stale-while-revalidate=86400",
            "X-Hum-Cache": "hit",
          },
        });
      }
    } catch (err) {
      // Cache miss or error — proceed to resolution
      logGroveError("Hum", API_ERRORS.OPERATION_FAILED, { cause: err });
    }
  }

  // Resolve metadata through cascade
  let metadata: HumMetadata | null = null;

  // Strategy 1: Odesli (cross-platform)
  metadata = await resolveViaOdesli(rawUrl);

  // Strategy 2: Provider-specific fallback
  if (!metadata) {
    if (provider === "apple-music") {
      metadata = await resolveViaItunes(rawUrl);
    } else {
      metadata = await resolveViaOembed(rawUrl, provider);
    }
  }

  // Strategy 3: Graceful degradation
  if (!metadata) {
    metadata = buildUnresolved(rawUrl, provider);
  }

  // Cache the result (fire-and-forget)
  if (kv && metadata.status !== "unresolved") {
    const cacheKey = await buildCacheKey(rawUrl);
    cache
      .set(kv, cacheKey, metadata, {
        ttl: HUM_CACHE_TTL,
        namespace: HUM_CACHE_NS,
      })
      .catch((err) => {
        console.error("[Hum] Failed to cache metadata:", err);
      });
  }

  return json(metadata, {
    headers: {
      "Cache-Control":
        metadata.status === "unresolved"
          ? "public, max-age=300"
          : "public, max-age=3600, stale-while-revalidate=86400",
      "X-Hum-Cache": "miss",
    },
  });
};
