/**
 * Now Playing Curio
 *
 * Display what you're currently listening to — Spotify, Last.fm, or manual.
 * Real-time album art, song title, artist, and optional progress bar.
 * The digital equivalent of music playing in the background of a cozy shop.
 *
 * Features:
 * - 4 display styles (Compact, Card, Vinyl, Minimal)
 * - Manual, Spotify, Last.fm providers
 * - Album art display
 * - Recent listening history
 * - Fallback text when nothing playing
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Music provider
 */
export type NowPlayingProvider = "manual" | "spotify" | "lastfm";

/**
 * Display style
 */
export type NowPlayingStyle = "compact" | "card" | "vinyl" | "minimal";

/**
 * Now playing config stored in database
 */
export interface NowPlayingConfig {
  tenantId: string;
  provider: NowPlayingProvider;
  displayStyle: NowPlayingStyle;
  showAlbumArt: boolean;
  showProgress: boolean;
  fallbackText: string | null;
  lastFmUsername: string | null;
  updatedAt: string;
}

/**
 * Current track for display
 */
export interface NowPlayingTrack {
  trackName: string;
  artist: string;
  album: string | null;
  albumArtUrl: string | null;
  isPlaying: boolean;
}

/**
 * History entry
 */
export interface NowPlayingHistoryEntry {
  id: string;
  trackName: string;
  artist: string;
  album: string | null;
  albumArtUrl: string | null;
  playedAt: string;
}

/**
 * Public display data
 */
export interface NowPlayingDisplay {
  track: NowPlayingTrack | null;
  style: NowPlayingStyle;
  showAlbumArt: boolean;
  fallbackText: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Display style options
 */
export const DISPLAY_STYLE_OPTIONS: {
  value: NowPlayingStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "compact",
    label: "Compact",
    description: "One-line: Now Playing: Song — Artist",
  },
  {
    value: "card",
    label: "Card",
    description: "Album art + song + artist, full card layout",
  },
  {
    value: "vinyl",
    label: "Vinyl",
    description: "Spinning record animation with track info",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Just the song name, subtle and small",
  },
];

/**
 * Provider options
 */
export const PROVIDER_OPTIONS: {
  value: NowPlayingProvider;
  label: string;
  description: string;
}[] = [
  {
    value: "manual",
    label: "Manual",
    description: "Set what you're listening to manually",
  },
  {
    value: "spotify",
    label: "Spotify",
    description: "Auto-detect from Spotify (requires connection)",
  },
  {
    value: "lastfm",
    label: "Last.fm",
    description: "Pull from Last.fm scrobbles (username only)",
  },
];

/**
 * Default fallback text
 */
export const DEFAULT_FALLBACK_TEXT = "the forest rests";

/**
 * Valid display styles
 */
export const VALID_DISPLAY_STYLES = new Set<string>(
  DISPLAY_STYLE_OPTIONS.map((s) => s.value),
);

/**
 * Valid providers
 */
export const VALID_PROVIDERS = new Set<string>(
  PROVIDER_OPTIONS.map((p) => p.value),
);

/**
 * Maximum track name length
 */
export const MAX_TRACK_NAME_LENGTH = 200;

/**
 * Maximum artist name length
 */
export const MAX_ARTIST_LENGTH = 200;

/**
 * Maximum album name length
 */
export const MAX_ALBUM_LENGTH = 200;

/**
 * Maximum fallback text length
 */
export const MAX_FALLBACK_TEXT_LENGTH = 100;

/**
 * Maximum Last.fm username length
 */
export const MAX_LASTFM_USERNAME_LENGTH = 50;

/**
 * History limit
 */
export const MAX_HISTORY_ENTRIES = 50;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for history records
 */
export function generateHistoryId(): string {
  return `np_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate a display style
 */
export function isValidDisplayStyle(style: string): style is NowPlayingStyle {
  return VALID_DISPLAY_STYLES.has(style);
}

/**
 * Validate a provider
 */
export function isValidProvider(
  provider: string,
): provider is NowPlayingProvider {
  return VALID_PROVIDERS.has(provider);
}

/**
 * Sanitize track text (trim, strip HTML, limit)
 */
export function sanitizeTrackText(
  text: string | null | undefined,
  maxLength: number,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
  return cleaned;
}

/**
 * Sanitize fallback text
 */
export function sanitizeFallbackText(text: string | null | undefined): string {
  if (!text) return DEFAULT_FALLBACK_TEXT;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return DEFAULT_FALLBACK_TEXT;
  if (cleaned.length > MAX_FALLBACK_TEXT_LENGTH)
    return cleaned.slice(0, MAX_FALLBACK_TEXT_LENGTH);
  return cleaned;
}

/**
 * Sanitize Last.fm username
 */
export function sanitizeLastFmUsername(
  username: string | null | undefined,
): string | null {
  if (!username) return null;
  const cleaned = username.replace(/[^a-zA-Z0-9_-]/g, "").trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_LASTFM_USERNAME_LENGTH)
    return cleaned.slice(0, MAX_LASTFM_USERNAME_LENGTH);
  return cleaned;
}

/**
 * Transform config row to display data with optional track
 */
export function toDisplayNowPlaying(
  config: NowPlayingConfig,
  track: NowPlayingTrack | null,
): NowPlayingDisplay {
  return {
    track,
    style: config.displayStyle,
    showAlbumArt: config.showAlbumArt,
    fallbackText: config.fallbackText ?? DEFAULT_FALLBACK_TEXT,
  };
}

/**
 * Format a "played at" time for history display
 */
export function formatPlayedAt(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
