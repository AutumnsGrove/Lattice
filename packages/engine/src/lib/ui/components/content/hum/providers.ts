/**
 * Hum Provider Registry
 *
 * URL patterns and display metadata for music providers.
 * Adding a new provider is a matter of dropping a regex + metadata entry here.
 */

import type { HumProvider, HumProviderInfo } from "./types.js";

/** Provider registry with URL patterns and display metadata */
export const HUM_PROVIDERS: Record<HumProvider, HumProviderInfo> = {
  "apple-music": {
    name: "Apple Music",
    color: "#fc3c44",
    patterns: [
      /^https?:\/\/music\.apple\.com\/[a-z]{2}\/(album|playlist|music-video)\/[^/]+\/[a-zA-Z0-9.]+/,
      /^https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[^/]+\/\d+/,
    ],
  },
  spotify: {
    name: "Spotify",
    color: "#1db954",
    patterns: [
      /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+/,
    ],
  },
  "youtube-music": {
    name: "YouTube Music",
    color: "#ff0000",
    patterns: [
      /^https?:\/\/music\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
      /^https?:\/\/music\.youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/,
    ],
  },
  soundcloud: {
    name: "SoundCloud",
    color: "#ff5500",
    patterns: [
      /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
    ],
  },
  tidal: {
    name: "Tidal",
    color: "#000000",
    patterns: [
      /^https?:\/\/(www\.|listen\.)?tidal\.com\/(browse\/)?(track|album|playlist|artist)\/[a-zA-Z0-9-]+/,
    ],
  },
  deezer: {
    name: "Deezer",
    color: "#a238ff",
    patterns: [
      /^https?:\/\/(www\.)?deezer\.com\/(track|album|playlist|artist)\/\d+/,
    ],
  },
  bandcamp: {
    name: "Bandcamp",
    color: "#1da0c3",
    patterns: [
      /^https?:\/\/[a-zA-Z0-9_-]+\.bandcamp\.com\/(track|album)\/[a-zA-Z0-9_-]+/,
    ],
  },
  "amazon-music": {
    name: "Amazon Music",
    color: "#25d1da",
    patterns: [
      /^https?:\/\/music\.amazon\.(com|co\.\w+)\/(albums|tracks|playlists)\/[a-zA-Z0-9]+/,
    ],
  },
  unknown: {
    name: "Music",
    color: "#6b7280",
    patterns: [],
  },
};

/**
 * Detect which music provider a URL belongs to.
 * Returns "unknown" if no provider matches.
 */
export function detectProvider(url: string): HumProvider {
  // Defense in depth: limit URL length to prevent regex backtracking attacks
  if (url.length > 500) {
    return "unknown";
  }
  for (const [provider, info] of Object.entries(HUM_PROVIDERS)) {
    if (provider === "unknown") continue;
    for (const pattern of info.patterns) {
      if (pattern.test(url)) {
        return provider as HumProvider;
      }
    }
  }
  return "unknown";
}

/**
 * Check if a URL is a recognized music link.
 */
export function isMusicUrl(url: string): boolean {
  return detectProvider(url) !== "unknown";
}

/**
 * Get display info for a provider.
 */
export function getProviderInfo(provider: HumProvider): HumProviderInfo {
  return HUM_PROVIDERS[provider] || HUM_PROVIDERS.unknown;
}
