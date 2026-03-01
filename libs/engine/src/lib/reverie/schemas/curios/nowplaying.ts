import type { DomainSchema } from "../../types";

/**
 * Now Playing — what you're listening to right now.
 * Spotify, Last.fm, or manual entry.
 */
export const nowplayingSchema: DomainSchema = {
	id: "curios.nowplaying",
	name: "Now Playing",
	description:
		"Shows what music you're currently listening to. Connects to Spotify, Last.fm, or accepts manual entries.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/nowplaying",
	writeEndpoint: "PUT /api/curios/nowplaying",
	writeMethod: "PUT",
	fields: {
		provider: {
			type: "enum",
			description: "Music data source",
			options: ["manual", "spotify", "lastfm"],
			default: "manual",
		},
		displayStyle: {
			type: "enum",
			description: "Widget layout",
			options: ["compact", "expanded"],
			default: "compact",
		},
		showAlbumArt: {
			type: "boolean",
			description: "Display album artwork",
			default: true,
		},
		showProgress: {
			type: "boolean",
			description: "Show playback progress bar",
			default: false,
		},
		fallbackText: {
			type: "string",
			description: "Text shown when nothing is playing",
			constraints: { maxLength: 100 },
		},
		lastFmUsername: {
			type: "string",
			description: "Last.fm username for scrobble integration",
			constraints: { maxLength: 50 },
		},
	},
	examples: [
		"Connect my Spotify to Now Playing",
		"Show album art but hide the progress bar",
		"Set my fallback text to 'Silence is golden'",
		"Use the expanded display style",
		"Switch to Last.fm as my provider",
	],
	keywords: ["music", "playing", "listening", "spotify", "lastfm", "song", "track"],
};
