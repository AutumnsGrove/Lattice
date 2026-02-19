/**
 * Now Playing Curio API — Public + Admin
 *
 * GET    — Get current track (public, polled by visitors)
 * POST   — Set manual track (admin)
 * DELETE — Clear current track (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateHistoryId,
  sanitizeTrackText,
  toDisplayNowPlaying,
  DEFAULT_FALLBACK_TEXT,
  MAX_TRACK_NAME_LENGTH,
  MAX_ARTIST_LENGTH,
  MAX_ALBUM_LENGTH,
  type NowPlayingConfig,
  type NowPlayingTrack,
} from "$lib/curios/nowplaying";

interface ConfigRow {
  tenant_id: string;
  provider: string;
  display_style: string;
  show_album_art: number;
  show_progress: number;
  fallback_text: string | null;
  last_fm_username: string | null;
  updated_at: string;
}

interface HistoryRow {
  id: string;
  track_name: string;
  artist: string;
  album: string | null;
  album_art_url: string | null;
  played_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Get current track (public)
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  try {
    // Fetch config
    const configRow = await db
      .prepare(
        `SELECT tenant_id, provider, display_style, show_album_art, show_progress, fallback_text, last_fm_username, updated_at
         FROM nowplaying_config WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<ConfigRow>();

    if (!configRow) {
      return json(
        {
          nowPlaying: {
            track: null,
            style: "compact",
            showAlbumArt: true,
            fallbackText: DEFAULT_FALLBACK_TEXT,
          },
        },
        {
          headers: {
            "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
          },
        },
      );
    }

    const config: NowPlayingConfig = {
      tenantId: configRow.tenant_id,
      provider: configRow.provider as NowPlayingConfig["provider"],
      displayStyle: configRow.display_style as NowPlayingConfig["displayStyle"],
      showAlbumArt: Boolean(configRow.show_album_art),
      showProgress: Boolean(configRow.show_progress),
      fallbackText: configRow.fallback_text,
      lastFmUsername: configRow.last_fm_username,
      updatedAt: configRow.updated_at,
    };

    // For manual provider, fetch most recent history entry as "current track"
    let track: NowPlayingTrack | null = null;

    if (config.provider === "manual") {
      const recent = await db
        .prepare(
          `SELECT track_name, artist, album, album_art_url
           FROM nowplaying_history
           WHERE tenant_id = ?
           ORDER BY played_at DESC LIMIT 1`,
        )
        .bind(tenantId)
        .first<HistoryRow>();

      if (recent) {
        track = {
          trackName: recent.track_name,
          artist: recent.artist,
          album: recent.album,
          albumArtUrl: recent.album_art_url,
          isPlaying: true,
        };
      }
    }

    // Spotify/Last.fm providers would be handled here in future

    const display = toDisplayNowPlaying(config, track);

    return json(
      { nowPlaying: display },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Now playing fetch failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Set manual track (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const trackName = sanitizeTrackText(
    body.trackName as string | null,
    MAX_TRACK_NAME_LENGTH,
  );
  const artist = sanitizeTrackText(
    body.artist as string | null,
    MAX_ARTIST_LENGTH,
  );

  if (!trackName || !artist) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const album = sanitizeTrackText(
    body.album as string | null,
    MAX_ALBUM_LENGTH,
  );
  const albumArtUrl =
    typeof body.albumArtUrl === "string"
      ? body.albumArtUrl.trim() || null
      : null;

  const id = generateHistoryId();

  try {
    // Insert into history
    await db
      .prepare(
        `INSERT INTO nowplaying_history (id, tenant_id, track_name, artist, album, album_art_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, trackName, artist, album, albumArtUrl)
      .run();

    // Prune old history (keep last 50)
    await db
      .prepare(
        `DELETE FROM nowplaying_history
         WHERE tenant_id = ? AND id NOT IN (
           SELECT id FROM nowplaying_history
           WHERE tenant_id = ?
           ORDER BY played_at DESC LIMIT 50
         )`,
      )
      .bind(tenantId, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Now playing manual set failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    { success: true, track: { trackName, artist, album } },
    { status: 201 },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Clear current track (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM nowplaying_history WHERE tenant_id = ?`)
      .bind(tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Now playing clear failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
