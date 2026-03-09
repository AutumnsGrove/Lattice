import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { parseFormData } from "$lib/server/utils/form-data";
import {
	generateHistoryId,
	isValidDisplayStyle,
	isValidProvider,
	sanitizeTrackText,
	sanitizeFallbackText,
	sanitizeLastFmUsername,
	DISPLAY_STYLE_OPTIONS,
	PROVIDER_OPTIONS,
	MAX_TRACK_NAME_LENGTH,
	MAX_ARTIST_LENGTH,
	MAX_ALBUM_LENGTH,
	type NowPlayingConfig,
	type NowPlayingHistoryEntry,
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

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			config: null,
			history: [],
			styleOptions: DISPLAY_STYLE_OPTIONS,
			providerOptions: PROVIDER_OPTIONS,
			error: "Database not available",
		};
	}

	const [configRow, historyResult] = await Promise.all([
		db
			.prepare(
				`SELECT tenant_id, provider, display_style, show_album_art, show_progress, fallback_text, last_fm_username, updated_at
         FROM nowplaying_config WHERE tenant_id = ?`,
			)
			.bind(tenantId)
			.first<ConfigRow>()
			.catch(() => null),
		db
			.prepare(
				`SELECT id, track_name, artist, album, album_art_url, played_at
         FROM nowplaying_history
         WHERE tenant_id = ?
         ORDER BY played_at DESC LIMIT 20`,
			)
			.bind(tenantId)
			.all<HistoryRow>()
			.catch(() => ({ results: [] as HistoryRow[] })),
	]);

	let config: NowPlayingConfig | null = null;
	if (configRow) {
		config = {
			tenantId: configRow.tenant_id,
			provider: configRow.provider as NowPlayingConfig["provider"],
			displayStyle: configRow.display_style as NowPlayingConfig["displayStyle"],
			showAlbumArt: Boolean(configRow.show_album_art),
			showProgress: Boolean(configRow.show_progress),
			fallbackText: configRow.fallback_text,
			lastFmUsername: configRow.last_fm_username,
			updatedAt: configRow.updated_at,
		};
	}

	const history: NowPlayingHistoryEntry[] = (historyResult.results ?? []).map((row) => ({
		id: row.id,
		trackName: row.track_name,
		artist: row.artist,
		album: row.album,
		albumArtUrl: row.album_art_url,
		playedAt: row.played_at,
	}));

	return {
		config,
		history,
		styleOptions: DISPLAY_STYLE_OPTIONS,
		providerOptions: PROVIDER_OPTIONS,
	};
};

const SaveNowPlayingConfigSchema = z.object({
	provider: z.string().optional().default("manual"),
	displayStyle: z.string().optional().default("compact"),
	showAlbumArt: z.string().optional(),
	showProgress: z.string().optional(),
	fallbackText: z.string().nullable().optional(),
	lastFmUsername: z.string().nullable().optional(),
});

const SetTrackSchema = z.object({
	trackName: z.string().nullable().optional(),
	artist: z.string().nullable().optional(),
	album: z.string().nullable().optional(),
	albumArtUrl: z.string().optional().default(""),
});

export const actions: Actions = {
	saveConfig: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, SaveNowPlayingConfigSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const provider = d.provider;
		const displayStyle = d.displayStyle;
		const showAlbumArt = d.showAlbumArt === "true";
		const showProgress = d.showProgress === "true";
		const fallbackText = sanitizeFallbackText(d.fallbackText ?? null);
		const lastFmUsername = sanitizeLastFmUsername(d.lastFmUsername ?? null);

		const finalProvider = isValidProvider(provider) ? provider : "manual";
		const finalStyle = isValidDisplayStyle(displayStyle) ? displayStyle : "compact";

		try {
			await db
				.prepare(
					`INSERT INTO nowplaying_config (tenant_id, provider, display_style, show_album_art, show_progress, fallback_text, last_fm_username, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             provider = excluded.provider,
             display_style = excluded.display_style,
             show_album_art = excluded.show_album_art,
             show_progress = excluded.show_progress,
             fallback_text = excluded.fallback_text,
             last_fm_username = excluded.last_fm_username,
             updated_at = datetime('now')`,
				)
				.bind(
					tenantId,
					finalProvider,
					finalStyle,
					showAlbumArt ? 1 : 0,
					showProgress ? 1 : 0,
					fallbackText,
					lastFmUsername,
				)
				.run();

			return { success: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	setTrack: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, SetTrackSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const trackName = sanitizeTrackText(d.trackName ?? null, MAX_TRACK_NAME_LENGTH);
		const artist = sanitizeTrackText(d.artist ?? null, MAX_ARTIST_LENGTH);

		if (!trackName || !artist) {
			return fail(400, {
				error: "Track name and artist are required",
				error_code: "MISSING_TRACK_INFO",
			});
		}

		const album = sanitizeTrackText(d.album ?? null, MAX_ALBUM_LENGTH);
		const albumArtUrl = d.albumArtUrl?.trim() || null;

		const id = generateHistoryId();

		try {
			await db
				.prepare(
					`INSERT INTO nowplaying_history (id, tenant_id, track_name, artist, album, album_art_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.bind(id, tenantId, trackName, artist, album, albumArtUrl)
				.run();

			return { success: true, trackSet: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	clearHistory: async ({ platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		try {
			await db.prepare(`DELETE FROM nowplaying_history WHERE tenant_id = ?`).bind(tenantId).run();

			return { success: true, cleared: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
