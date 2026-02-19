/**
 * oEmbed Provider Registry
 *
 * Allowlist of trusted providers for embedding interactive content in the gutter.
 * Only URLs matching a registered provider will render as interactive embeds.
 * Unmatched URLs gracefully fall back to OG link preview cards.
 *
 * Security model:
 * - Default-deny: unmatched URLs never get embedded
 * - Each provider specifies minimal sandbox permissions
 * - All embeds render inside sandboxed iframes
 * - Provider list is version-controlled, not user-configurable
 *
 * @see https://oembed.com/ - oEmbed specification
 * @see https://oembed.com/providers.json - Full provider registry
 */

// ============================================================================
// Types
// ============================================================================

/** How to render the embed */
export type EmbedRenderStrategy =
  | "iframe-src" // Use provider's embed URL in iframe (safest, preferred)
  | "iframe-srcdoc" // Inline HTML in iframe srcdoc (for providers without embed URLs)
  | "og-preview"; // Fall back to OG link preview card (default for unknown)

/** A registered embed provider */
export interface EmbedProvider {
  /** Provider display name */
  name: string;
  /** URL patterns that this provider handles */
  patterns: RegExp[];
  /** The oEmbed API endpoint URL */
  oembedUrl: string;
  /** How to render: iframe-src (preferred), iframe-srcdoc, or og-preview */
  renderStrategy: EmbedRenderStrategy;
  /** iframe sandbox permissions to grant (minimal set for each provider) */
  sandboxPermissions: string[];
  /** Optional: extract embed URL from the oEmbed response or source URL */
  extractEmbedUrl?: (url: string) => string | null;
  /** Maximum width for the embed (default: 100%) */
  maxWidth?: number;
  /** Default aspect ratio for responsive sizing (width:height, e.g., "16:9") */
  aspectRatio?: string;
}

/** Result of matching a URL against the provider registry */
export interface ProviderMatch {
  provider: EmbedProvider;
  url: string;
}

/** oEmbed API response (subset of fields we use) */
export interface OEmbedResponse {
  /** oEmbed version (should be "1.0") */
  version?: string;
  /** Response type: photo, video, link, or rich */
  type: "photo" | "video" | "link" | "rich";
  /** Title of the resource */
  title?: string;
  /** Author name */
  author_name?: string;
  /** Provider name */
  provider_name?: string;
  /** HTML to embed (for video/rich types) */
  html?: string;
  /** Width of the embed */
  width?: number;
  /** Height of the embed */
  height?: number;
  /** Thumbnail URL */
  thumbnail_url?: string;
  /** Thumbnail width */
  thumbnail_width?: number;
  /** Thumbnail height */
  thumbnail_height?: number;
  /** Suggested cache lifetime in seconds */
  cache_age?: number;
  /** URL for photo type */
  url?: string;
}

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * Trusted embed providers.
 *
 * To add a new provider:
 * 1. Add entry here with URL patterns and oEmbed endpoint
 * 2. Set renderStrategy to 'iframe-src' if provider has embed URLs
 * 3. Grant minimal sandbox permissions
 * 4. Test with real URLs before shipping
 */
export const EMBED_PROVIDERS: EmbedProvider[] = [
  // ── Polls & Interactive ─────────────────────────────────────────────
  {
    name: "Strawpoll",
    patterns: [/^https?:\/\/(www\.)?strawpoll\.com\/[a-zA-Z0-9-]+/],
    oembedUrl: "https://strawpoll.com/oembed",
    renderStrategy: "iframe-src",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-forms"],
    extractEmbedUrl: (url: string) => {
      const match = url.match(/strawpoll\.com\/(?:polls\/)?([a-zA-Z0-9-]+)/);
      return match ? `https://strawpoll.com/embed/${match[1]}` : null;
    },
    aspectRatio: "4:3",
  },

  // ── Video ───────────────────────────────────────────────────────────
  {
    name: "YouTube",
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
      /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/,
    ],
    oembedUrl: "https://www.youtube.com/oembed",
    renderStrategy: "iframe-src",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-popups"],
    extractEmbedUrl: (url: string) => {
      let videoId: string | null = null;
      const longMatch = url.match(
        /youtube\.com\/(?:watch\?v=|shorts\/)([a-zA-Z0-9_-]+)/,
      );
      const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      videoId = longMatch?.[1] ?? shortMatch?.[1] ?? null;
      return videoId
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    },
    aspectRatio: "16:9",
  },
  {
    name: "Vimeo",
    patterns: [
      /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
      /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
    ],
    oembedUrl: "https://vimeo.com/api/oembed.json",
    renderStrategy: "iframe-src",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-popups"],
    extractEmbedUrl: (url: string) => {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    },
    aspectRatio: "16:9",
  },

  // ── Music ───────────────────────────────────────────────────────────
  {
    name: "Spotify",
    patterns: [
      /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[a-zA-Z0-9]+/,
    ],
    oembedUrl: "https://open.spotify.com/oembed",
    renderStrategy: "iframe-src",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-popups"],
    extractEmbedUrl: (url: string) => {
      const match = url.match(
        /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/,
      );
      return match
        ? `https://open.spotify.com/embed/${match[1]}/${match[2]}`
        : null;
    },
    aspectRatio: "3:1",
    maxWidth: 400,
  },
  {
    name: "SoundCloud",
    patterns: [
      /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
    ],
    oembedUrl: "https://soundcloud.com/oembed",
    renderStrategy: "iframe-srcdoc",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-popups"],
    aspectRatio: "3:1",
  },

  // ── Social ──────────────────────────────────────────────────────────
  {
    name: "Bluesky",
    patterns: [/^https?:\/\/bsky\.app\/profile\/[^/]+\/post\/[a-zA-Z0-9]+/],
    oembedUrl: "https://embed.bsky.app/oembed",
    renderStrategy: "iframe-srcdoc",
    sandboxPermissions: ["allow-scripts", "allow-same-origin", "allow-popups"],
    aspectRatio: "1:1",
  },

  // ── Code & Dev ──────────────────────────────────────────────────────
  {
    name: "CodePen",
    patterns: [
      /^https?:\/\/(www\.)?codepen\.io\/[a-zA-Z0-9_-]+\/pen\/[a-zA-Z0-9]+/,
    ],
    oembedUrl: "https://codepen.io/api/oembed",
    renderStrategy: "iframe-src",
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
      "allow-forms",
    ],
    extractEmbedUrl: (url: string) => {
      const match = url.match(
        /codepen\.io\/([a-zA-Z0-9_-]+)\/pen\/([a-zA-Z0-9]+)/,
      );
      return match
        ? `https://codepen.io/${match[1]}/embed/${match[2]}?default-tab=result`
        : null;
    },
    aspectRatio: "4:3",
  },
];

// ============================================================================
// Matching
// ============================================================================

/**
 * Match a URL against the provider registry.
 * Normalizes the URL first to prevent case-based or tracking-param bypasses.
 * Returns the matching provider or null if no match.
 */
export function findProvider(url: string): ProviderMatch | null {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  for (const provider of EMBED_PROVIDERS) {
    for (const pattern of provider.patterns) {
      if (pattern.test(normalized)) {
        return { provider, url: normalized };
      }
    }
  }
  return null;
}

/**
 * Check if a URL is from a trusted embed provider.
 */
export function isTrustedProvider(url: string): boolean {
  return findProvider(url) !== null;
}

/**
 * Get the embed URL for a matched provider.
 * Prefers the provider's extractEmbedUrl over oEmbed HTML parsing.
 */
export function getEmbedUrl(
  provider: EmbedProvider,
  sourceUrl: string,
): string | null {
  if (provider.extractEmbedUrl) {
    return provider.extractEmbedUrl(sourceUrl);
  }
  return null;
}

/**
 * Extract an iframe src from oEmbed HTML response.
 * Used when extractEmbedUrl is not available.
 */
export function extractIframeSrcFromHtml(html: string): string | null {
  const match = html.match(/src=["']([^"']+)["']/);
  return match?.[1] ?? null;
}

/**
 * Build the sandbox attribute string for an iframe.
 */
export function buildSandboxAttr(provider: EmbedProvider): string {
  return provider.sandboxPermissions.join(" ");
}

/**
 * Calculate aspect ratio as a padding-bottom percentage (for responsive iframes).
 * E.g., "16:9" returns "56.25%"
 */
export function aspectRatioToPercent(ratio: string): string {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return "56.25%"; // Default 16:9
  return `${(h / w) * 100}%`;
}

// ============================================================================
// URL Normalization (Security Hardening)
// ============================================================================

/**
 * Normalize a URL before matching against provider patterns.
 *
 * Prevents bypass via:
 * - Mixed-case hostnames (YOUTUBE.COM vs youtube.com)
 * - Trailing fragments
 * - Common tracking parameters that don't affect the resource
 *
 * Returns null for invalid URLs.
 */
export function normalizeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);

    // Force lowercase scheme and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip tracking params that don't affect embed identity
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
      "si", // Spotify share tracking
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Strip fragment
    parsed.hash = "";

    return parsed.href;
  } catch {
    return null;
  }
}

// ============================================================================
// oEmbed Response Validation (Security Hardening)
// ============================================================================

/** Maximum allowed oEmbed response size (512KB) */
export const MAX_OEMBED_RESPONSE_SIZE = 512 * 1024;

/** Maximum allowed HTML length within an oEmbed response (256KB) */
export const MAX_OEMBED_HTML_LENGTH = 256 * 1024;

/** Valid oEmbed response types */
const VALID_OEMBED_TYPES = new Set(["photo", "video", "link", "rich"]);

/**
 * Validate an oEmbed response for expected shape and safe values.
 *
 * Returns a sanitized copy or null if the response is malformed.
 * This prevents a compromised or malicious provider from injecting
 * unexpected data through the oEmbed protocol.
 */
export function validateOEmbedResponse(data: unknown): OEmbedResponse | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Type is required and must be a known value
  if (typeof obj.type !== "string" || !VALID_OEMBED_TYPES.has(obj.type)) {
    return null;
  }

  // HTML must be a string and within size limits (if present)
  if (obj.html !== undefined && obj.html !== null) {
    if (typeof obj.html !== "string") return null;
    if (obj.html.length > MAX_OEMBED_HTML_LENGTH) return null;
  }

  // Title must be a string if present, capped at 500 chars
  let title: string | undefined;
  if (obj.title !== undefined && obj.title !== null) {
    if (typeof obj.title !== "string") return null;
    title = obj.title.length > 500 ? obj.title.slice(0, 500) : obj.title;
  }

  // Thumbnail URL must be a valid HTTPS URL if present
  let thumbnailUrl: string | undefined;
  if (obj.thumbnail_url !== undefined && obj.thumbnail_url !== null) {
    if (typeof obj.thumbnail_url === "string") {
      try {
        const thumbUrl = new URL(obj.thumbnail_url);
        if (thumbUrl.protocol === "https:") {
          thumbnailUrl = obj.thumbnail_url;
        }
      } catch {
        // Invalid URL, skip it
      }
    }
  }

  // Validate numeric fields
  const safeNum = (val: unknown): number | undefined => {
    if (typeof val === "number" && isFinite(val) && val >= 0) return val;
    return undefined;
  };

  return {
    type: obj.type as OEmbedResponse["type"],
    version: typeof obj.version === "string" ? obj.version : undefined,
    title,
    author_name:
      typeof obj.author_name === "string" ? obj.author_name : undefined,
    provider_name:
      typeof obj.provider_name === "string" ? obj.provider_name : undefined,
    html: obj.html as string | undefined,
    width: safeNum(obj.width),
    height: safeNum(obj.height),
    thumbnail_url: thumbnailUrl,
    thumbnail_width: safeNum(obj.thumbnail_width),
    thumbnail_height: safeNum(obj.thumbnail_height),
    cache_age: safeNum(obj.cache_age),
    url: typeof obj.url === "string" ? obj.url : undefined,
  };
}

// ============================================================================
// CSP frame-src Generation (Security Hardening)
// ============================================================================

/**
 * Generate a Content-Security-Policy frame-src directive from the provider registry.
 *
 * This creates browser-level enforcement that mirrors the JS allowlist.
 * Even if the JS allowlist is somehow bypassed, the browser blocks
 * iframes from non-approved origins.
 */
export function generateFrameSrcCSP(): string {
  const domains = new Set<string>();

  for (const provider of EMBED_PROVIDERS) {
    switch (provider.name) {
      case "YouTube":
        domains.add("https://www.youtube-nocookie.com");
        domains.add("https://www.youtube.com");
        break;
      case "Vimeo":
        domains.add("https://player.vimeo.com");
        break;
      case "Spotify":
        domains.add("https://open.spotify.com");
        break;
      case "Strawpoll":
        domains.add("https://strawpoll.com");
        break;
      case "SoundCloud":
        domains.add("https://w.soundcloud.com");
        domains.add("https://soundcloud.com");
        break;
      case "Bluesky":
        domains.add("https://embed.bsky.app");
        break;
      case "CodePen":
        domains.add("https://codepen.io");
        break;
    }
  }

  const domainList = Array.from(domains).sort().join(" ");
  return `frame-src 'self' blob: ${domainList}`;
}
