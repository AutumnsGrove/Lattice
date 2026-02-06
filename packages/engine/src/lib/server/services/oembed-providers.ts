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
    patterns: [
      /^https?:\/\/(www\.)?strawpoll\.com\/[a-zA-Z0-9-]+/,
    ],
    oembedUrl: "https://strawpoll.com/oembed",
    renderStrategy: "iframe-src",
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-forms",
    ],
    extractEmbedUrl: (url: string) => {
      const match = url.match(
        /strawpoll\.com\/(?:polls\/)?([a-zA-Z0-9-]+)/,
      );
      return match
        ? `https://strawpoll.com/embed/${match[1]}`
        : null;
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
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
    ],
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
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
    ],
    extractEmbedUrl: (url: string) => {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return match
        ? `https://player.vimeo.com/video/${match[1]}`
        : null;
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
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
    ],
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
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
    ],
    aspectRatio: "3:1",
  },

  // ── Social ──────────────────────────────────────────────────────────
  {
    name: "Bluesky",
    patterns: [
      /^https?:\/\/bsky\.app\/profile\/[^/]+\/post\/[a-zA-Z0-9]+/,
    ],
    oembedUrl: "https://embed.bsky.app/oembed",
    renderStrategy: "iframe-srcdoc",
    sandboxPermissions: [
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
    ],
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
 * Returns the matching provider or null if no match.
 */
export function findProvider(url: string): ProviderMatch | null {
  for (const provider of EMBED_PROVIDERS) {
    for (const pattern of provider.patterns) {
      if (pattern.test(url)) {
        return { provider, url };
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
