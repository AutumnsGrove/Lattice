/**
 * Guestbook Curio
 *
 * Visitor signatures with moderation, display styles, and rate limiting.
 * The classic personal web element — someone visited and wanted to say hi.
 *
 * Features:
 * - Public signing (no login required)
 * - Configurable approval workflow
 * - 4 page styles: Classic, Modern, Pixel, Cozy (page chrome theme)
 * - 6 signing styles: Sticky, Note, Line, Letter, Postcard, Doodle (per-entry)
 * - Wall backings: Glass, Cork, Paper, None (room layer)
 * - Color palettes: owner-configurable accent colors
 * - Rate limiting via IP hash
 * - Emoji support from curated set
 * - Vine-compatible mini view with compact/styled modes
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Guestbook display style options
 */
export type GuestbookStyle = "classic" | "modern" | "pixel" | "cozy";

/**
 * Wall backing textures — the "room" layer an owner picks
 */
export type GuestbookWallBacking = "glass" | "cork" | "paper" | "none";

/**
 * Signing styles — the "pen" layer a visitor picks for their entry
 */
export type GuestbookSigningStyle = "sticky" | "note" | "line" | "letter" | "postcard" | "doodle";

/**
 * CTA style for the signing form
 */
export type GuestbookCtaStyle = "button" | "floating";

/**
 * Inline widget display mode
 */
export type GuestbookInlineMode = "compact" | "styled";

/**
 * Guestbook configuration stored per tenant
 */
export interface GuestbookConfig {
	enabled: boolean;
	style: GuestbookStyle;
	entriesPerPage: number;
	requireApproval: boolean;
	allowEmoji: boolean;
	maxMessageLength: number;
	customPrompt: string | null;
	wallBacking: GuestbookWallBacking;
	ctaStyle: GuestbookCtaStyle;
	allowedStyles: GuestbookSigningStyle[] | null;
	colorPalette: string[] | null;
	inlineMode: GuestbookInlineMode;
}

/**
 * Guestbook entry stored in database
 */
export interface GuestbookEntry {
	id: string;
	tenantId: string;
	name: string;
	message: string;
	emoji: string | null;
	approved: boolean;
	ipHash: string | null;
	entryStyle: GuestbookSigningStyle | null;
	entryColor: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Guestbook entry for public display (no sensitive fields)
 */
export interface GuestbookDisplayEntry {
	id: string;
	name: string;
	message: string;
	emoji: string | null;
	entryStyle: GuestbookSigningStyle | null;
	entryColor: string | null;
	createdAt: string;
}

/**
 * Pagination info for guestbook API responses
 */
export interface GuestbookPagination {
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Curated emoji set for guestbook entries.
 * Limited to friendly, non-offensive options.
 */
export const GUESTBOOK_EMOJI = [
	"🌿",
	"🌱",
	"🍃",
	"🌸",
	"🌻",
	"🌺",
	"🍂",
	"🍁",
	"❄️",
	"🌙",
	"⭐",
	"✨",
	"🦋",
	"🐝",
	"🐞",
	"🌈",
	"☀️",
	"🌊",
	"🔥",
	"💜",
	"💚",
	"💛",
	"🤍",
	"🖤",
	"🫶",
	"👋",
	"🎵",
	"📖",
	"🫧",
	"🕯️",
] as const;

/**
 * Display style options with labels and descriptions
 */
export const GUESTBOOK_STYLE_OPTIONS: {
	value: GuestbookStyle;
	label: string;
	description: string;
}[] = [
	{
		value: "cozy",
		label: "Cozy",
		description: "Warm, rounded, handwriting-feel (default)",
	},
	{
		value: "classic",
		label: "Classic",
		description: "Bordered entries, old-web feel",
	},
	{
		value: "modern",
		label: "Modern",
		description: "Clean cards with subtle shadows",
	},
	{
		value: "pixel",
		label: "Pixel",
		description: "Retro pixelated borders, monospace",
	},
];

/**
 * Wall backing options with labels and descriptions
 */
export const GUESTBOOK_WALL_BACKINGS: {
	value: GuestbookWallBacking;
	label: string;
	description: string;
}[] = [
	{
		value: "none",
		label: "Clean",
		description: "No backing, entries float on page background",
	},
	{
		value: "glass",
		label: "Frosted Glass",
		description: "Translucent blur with glass surface feel",
	},
	{
		value: "cork",
		label: "Cork Board",
		description: "Warm cork texture with thumbtack accents",
	},
	{
		value: "paper",
		label: "Cream Paper",
		description: "Faint ruled lines, journal feel",
	},
];

/**
 * Signing style options with labels and descriptions
 */
export const GUESTBOOK_SIGNING_STYLES: {
	value: GuestbookSigningStyle;
	label: string;
	description: string;
}[] = [
	{
		value: "sticky",
		label: "Sticky Note",
		description: "Colored square with slight rotation",
	},
	{
		value: "note",
		label: "Written Note",
		description: "Lined paper with handwriting feel",
	},
	{
		value: "line",
		label: "Quick Line",
		description: "Compact inline text, no card",
	},
	{
		value: "letter",
		label: "Letter",
		description: "Folded envelope that unfolds to reveal message",
	},
	{
		value: "postcard",
		label: "Postcard",
		description: "Landscape card with colored header",
	},
	{
		value: "doodle",
		label: "Doodle Card",
		description: "White card with sketchy border",
	},
];

/**
 * Validation arrays for new config types
 */
export const VALID_WALL_BACKINGS: GuestbookWallBacking[] = ["none", "glass", "cork", "paper"];
export const VALID_SIGNING_STYLES: GuestbookSigningStyle[] = [
	"sticky",
	"note",
	"line",
	"letter",
	"postcard",
	"doodle",
];
export const VALID_CTA_STYLES: GuestbookCtaStyle[] = ["button", "floating"];
export const VALID_INLINE_MODES: GuestbookInlineMode[] = ["compact", "styled"];

/**
 * Default color palette — 8 curated warm accent colors
 */
export const DEFAULT_COLOR_PALETTE: string[] = [
	"#e8a0bf", // rose
	"#f0b775", // amber
	"#a3c4a3", // sage
	"#8cb8d4", // sky
	"#c4a7d7", // lavender
	"#e8d5a3", // cream-gold
	"#e88f7a", // coral
	"#7ac4b8", // teal
];

/**
 * Default configuration for new guestbook setups
 */
export const DEFAULT_GUESTBOOK_CONFIG: GuestbookConfig = {
	enabled: false,
	style: "cozy",
	entriesPerPage: 20,
	requireApproval: true,
	allowEmoji: true,
	maxMessageLength: 500,
	customPrompt: null,
	wallBacking: "none",
	ctaStyle: "button",
	allowedStyles: null,
	colorPalette: null,
	inlineMode: "compact",
};

/**
 * Rate limit: minimum minutes between entries from same IP
 */
export const RATE_LIMIT_MINUTES = 10;

/**
 * Maximum name length
 */
export const MAX_NAME_LENGTH = 50;

/**
 * Default name for anonymous visitors
 */
export const DEFAULT_NAME = "Anonymous Wanderer";

/**
 * Mini view: number of recent entries to show in vine placement
 */
export const MINI_VIEW_COUNT = 3;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for guestbook entries
 */
export function generateGuestbookId(): string {
	return `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform a database entry row to a safe display entry (strips ip_hash)
 */
export function toDisplayEntry(entry: GuestbookEntry): GuestbookDisplayEntry {
	return {
		id: entry.id,
		name: entry.name,
		message: entry.message,
		emoji: entry.emoji,
		entryStyle: entry.entryStyle,
		entryColor: entry.entryColor,
		createdAt: entry.createdAt,
	};
}

/**
 * Pick a random signing style from the allowed set (or all styles if null)
 */
export function getRandomSigningStyle(
	allowed: GuestbookSigningStyle[] | null,
): GuestbookSigningStyle {
	const pool = allowed && allowed.length > 0 ? allowed : VALID_SIGNING_STYLES;
	return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pick a random color from the palette (or default palette if null)
 */
export function getRandomColor(palette: string[] | null): string {
	const pool = palette && palette.length > 0 ? palette : DEFAULT_COLOR_PALETTE;
	return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Validate a hex color string (#rgb or #rrggbb)
 */
export function isValidHexColor(color: string): boolean {
	return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

/**
 * Get a deterministic rotation for an entry based on its ID.
 * Returns a value between -3 and +3 degrees — no layout shift on re-render.
 */
export function getEntryRotation(entryId: string): number {
	let hash = 0;
	for (let i = 0; i < entryId.length; i++) {
		hash = (hash << 5) - hash + entryId.charCodeAt(i);
		hash |= 0;
	}
	// Map to -3..+3 range
	return ((Math.abs(hash) % 7) - 3) * 1;
}

/**
 * Get a deterministic signing style for legacy entries (entry_style is NULL).
 * Uses the entry ID to pick a consistent style so it doesn't change on re-render.
 */
export function getDeterministicStyle(
	entryId: string,
	allowed: GuestbookSigningStyle[] | null,
): GuestbookSigningStyle {
	const pool = allowed && allowed.length > 0 ? allowed : VALID_SIGNING_STYLES;
	let hash = 0;
	for (let i = 0; i < entryId.length; i++) {
		hash = (hash << 5) - hash + entryId.charCodeAt(i);
		hash |= 0;
	}
	return pool[Math.abs(hash) % pool.length];
}

const GUESTBOOK_EMOJI_SET = new Set<string>(GUESTBOOK_EMOJI);

/**
 * Validate an emoji is from the curated set (O(1) lookup)
 */
export function isValidEmoji(emoji: string): boolean {
	return GUESTBOOK_EMOJI_SET.has(emoji);
}

/**
 * Sanitize a display name — trim, strip HTML, limit length, default if empty
 */
export function sanitizeName(name: string | null | undefined): string {
	if (!name) return DEFAULT_NAME;
	const cleaned = stripHtml(name).trim();
	if (cleaned.length === 0) return DEFAULT_NAME;
	if (cleaned.length > MAX_NAME_LENGTH) return cleaned.slice(0, MAX_NAME_LENGTH);
	return cleaned;
}

/**
 * Sanitize a message — trim and enforce length limit
 */
export function sanitizeMessage(message: string, maxLength: number): string | null {
	const cleaned = stripHtml(message).trim();
	if (cleaned.length === 0) return null;
	if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
	return cleaned;
}

/**
 * Basic spam detection — catches obvious link spam and repeated chars.
 * Returns true if the message looks like spam.
 */
export function isSpam(message: string): boolean {
	const lower = message.toLowerCase();

	// Link spam: too many URLs
	const urlCount = (lower.match(/https?:\/\//g) || []).length;
	if (urlCount > 2) return true;

	// Repeated characters (e.g., "aaaaaaaa")
	if (/(.)\1{9,}/.test(lower)) return true;

	// Common spam phrases
	const spamPhrases = [
		"buy now",
		"click here",
		"free money",
		"earn money",
		"casino",
		"crypto airdrop",
		"whatsapp me",
		"telegram me",
		"follow me on",
		"check my profile",
	];
	if (spamPhrases.some((phrase) => lower.includes(phrase))) return true;

	return false;
}

/**
 * Format a relative time string from an ISO date
 */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}
