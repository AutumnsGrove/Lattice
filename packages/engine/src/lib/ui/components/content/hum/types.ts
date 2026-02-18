/**
 * Hum: Universal Music Link Previews
 *
 * Type definitions for music metadata, providers, and card states.
 *
 * A hum is the ambient music of a living forest — bees in the undergrowth,
 * wind through the canopy, the vibration of everything being alive.
 */

/** Supported music providers */
export type HumProvider =
  | "apple-music"
  | "spotify"
  | "youtube-music"
  | "soundcloud"
  | "bandcamp"
  | "tidal"
  | "deezer"
  | "amazon-music"
  | "unknown";

/** Content type of the music link */
export type HumContentType =
  | "track"
  | "album"
  | "playlist"
  | "artist"
  | "unknown";

/** Resolution quality */
export type HumStatus = "resolved" | "partial" | "unresolved";

/** Normalized metadata returned by /api/hum/resolve */
export interface HumMetadata {
  /** The original URL that was shared */
  sourceUrl: string;
  /** Which provider the link came from */
  provider: HumProvider;
  /** Content type */
  type: HumContentType;
  /** Track or album title */
  title: string | null;
  /** Artist name */
  artist: string | null;
  /** Album name (if available and different from title) */
  album: string | null;
  /** Album artwork URL */
  artworkUrl: string | null;
  /** Cross-platform links (from Odesli) */
  platformLinks: Partial<Record<HumProvider, string>>;
  /** When this metadata was resolved */
  resolvedAt: string;
  /** Resolution quality */
  status: HumStatus;
}

/** Provider display metadata */
export interface HumProviderInfo {
  /** Display name */
  name: string;
  /** Brand color (hex) */
  color: string;
  /** URL patterns to match */
  patterns: RegExp[];
}
