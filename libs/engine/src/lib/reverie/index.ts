/**
 * Reverie — Domain Schema Registry
 *
 * Central export for all Reverie schemas, the atmosphere manifold,
 * and the domain catalog. This is the entry point for:
 *
 * - The Reverie agent (loads schemas by domain ID)
 * - The inventory script (validates all schemas)
 * - The router (keyword matching)
 *
 * To add a new domain:
 * 1. Create a schema file in schemas/{group}/{domain}.ts
 * 2. Import and add it to SCHEMA_REGISTRY below
 * 3. Add a CatalogEntry to DOMAIN_CATALOG
 * 4. Run the inventory update: skill update-reverie-inventory
 *
 * @see docs/specs/reverie-spec.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (re-export everything)
// ─────────────────────────────────────────────────────────────────────────────

export type {
	DomainGroup,
	DomainId,
	FieldType,
	FieldConstraints,
	FieldDefinition,
	WriteMethod,
	DomainSchema,
	AtmosphereEntry,
	SchemaStatus,
	CatalogEntry,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Imports — Phase 1 (Foundation)
// ─────────────────────────────────────────────────────────────────────────────

import { accentSchema, ACCENT_PRESETS } from "./schemas/appearance/accent";
import { typographySchema, FONT_MOODS } from "./schemas/appearance/typography";
import { profileSchema, INTEREST_OPTIONS } from "./schemas/identity/profile";
import { commentsSchema } from "./schemas/social/comments";
import { meadowSchema } from "./schemas/social/meadow";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Imports — Phase 2 (Appearance Trifecta)
// ─────────────────────────────────────────────────────────────────────────────

import { themeSchema, THEME_MOODS } from "./schemas/appearance/theme";
import { colorsSchema } from "./schemas/appearance/colors";
import { cssSchema, CSS_BLOCKED_PATTERNS } from "./schemas/appearance/css";
import { layoutSchema } from "./schemas/appearance/layout";
import { cursorSchema } from "./schemas/curios/cursor";
import { ambientSchema } from "./schemas/curios/ambient";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Imports — Phase 3 (Content & Social)
// ─────────────────────────────────────────────────────────────────────────────

import { postsSchema } from "./schemas/content/posts";
import { pagesSchema } from "./schemas/content/pages";
import { blazesSchema, DEFAULT_BLAZES } from "./schemas/content/blazes";
import { guestbookSchema } from "./schemas/curios/guestbook";
import { blogrollSchema } from "./schemas/social/blogroll";
import { canopySchema, CANOPY_CATEGORIES } from "./schemas/social/canopy";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Imports — Phase 4 (Full Curio Coverage)
// ─────────────────────────────────────────────────────────────────────────────

import { moodringSchema } from "./schemas/curios/moodring";
import { nowplayingSchema } from "./schemas/curios/nowplaying";
import { gallerySchema } from "./schemas/curios/gallery";
import { timelineSchema } from "./schemas/curios/timeline";
import { journeySchema } from "./schemas/curios/journey";
import { pulseSchema } from "./schemas/curios/pulse";
import { hitcounterSchema } from "./schemas/curios/hitcounter";
import { linkgardenSchema } from "./schemas/curios/linkgarden";
import { pollsSchema } from "./schemas/curios/polls";
import { bookmarksSchema } from "./schemas/curios/bookmarks";
import { badgesSchema } from "./schemas/identity/badges";
import { activityStatusSchema } from "./schemas/identity/activitystatus";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Imports — Phase 5 (Infrastructure)
// ─────────────────────────────────────────────────────────────────────────────

import { webringSchema } from "./schemas/social/webring";
import { billingSchema } from "./schemas/infra/billing";
import { flagsSchema } from "./schemas/infra/flags";

// ─────────────────────────────────────────────────────────────────────────────
// Atmosphere Manifold
// ─────────────────────────────────────────────────────────────────────────────

export {
	ATMOSPHERE_MANIFOLD,
	findAtmosphere,
	ALL_ATMOSPHERE_KEYWORDS,
} from "./atmosphere";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Registry
// ─────────────────────────────────────────────────────────────────────────────

import type { DomainSchema, DomainId, CatalogEntry } from "./types";

/**
 * All implemented schemas, keyed by domain ID.
 * The Reverie agent uses this to load schemas by ID.
 */
export const SCHEMA_REGISTRY: Partial<Record<DomainId, DomainSchema>> = {
	// Phase 1
	"foliage.accent": accentSchema,
	"foliage.typography": typographySchema,
	"identity.profile": profileSchema,
	"social.comments": commentsSchema,
	"social.meadow": meadowSchema,
	// Phase 2
	"foliage.theme": themeSchema,
	"foliage.colors": colorsSchema,
	"foliage.css": cssSchema,
	"foliage.layout": layoutSchema,
	"curios.cursor": cursorSchema,
	"curios.ambient": ambientSchema,
	// Phase 3
	"content.posts": postsSchema,
	"content.pages": pagesSchema,
	"content.blazes": blazesSchema,
	"curios.guestbook": guestbookSchema,
	"curios.blogroll": blogrollSchema,
	"social.canopy": canopySchema,
	// Phase 4
	"curios.moodring": moodringSchema,
	"curios.nowplaying": nowplayingSchema,
	"curios.gallery": gallerySchema,
	"curios.timeline": timelineSchema,
	"curios.journey": journeySchema,
	"curios.pulse": pulseSchema,
	"curios.hitcounter": hitcounterSchema,
	"curios.linkgarden": linkgardenSchema,
	"curios.polls": pollsSchema,
	"curios.bookmarks": bookmarksSchema,
	"identity.badges": badgesSchema,
	"identity.activitystatus": activityStatusSchema,
	// Phase 5
	"curios.webring": webringSchema,
	"infra.billing": billingSchema,
	"infra.flags": flagsSchema,
};

/**
 * Get a schema by domain ID. Returns undefined for unimplemented domains.
 */
export function getSchema(id: DomainId): DomainSchema | undefined {
	return SCHEMA_REGISTRY[id];
}

/**
 * Get multiple schemas by domain ID (batch loading).
 * Skips any domains that don't have schemas yet.
 */
export function getSchemas(ids: DomainId[]): DomainSchema[] {
	return ids.map((id) => SCHEMA_REGISTRY[id]).filter(Boolean) as DomainSchema[];
}

/**
 * Get all implemented schema IDs.
 */
export function getImplementedDomains(): DomainId[] {
	return Object.keys(SCHEMA_REGISTRY) as DomainId[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Catalog (for inventory tracking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete domain catalog. Every domain is listed here regardless
 * of implementation status. The inventory script reads this to
 * generate the domain inventory markdown.
 */
export const DOMAIN_CATALOG: readonly CatalogEntry[] = [
	// Phase 1 — Foundation
	{ id: "foliage.accent",         status: "implemented", fieldCount: 1,  phase: 1, file: "appearance/accent.ts" },
	{ id: "foliage.typography",     status: "implemented", fieldCount: 2,  phase: 1, file: "appearance/typography.ts" },
	{ id: "identity.profile",       status: "implemented", fieldCount: 4,  phase: 1, file: "identity/profile.ts" },
	{ id: "social.comments",        status: "implemented", fieldCount: 7,  phase: 1, file: "social/comments.ts" },
	{ id: "social.meadow",          status: "implemented", fieldCount: 1,  phase: 1, file: "social/meadow.ts" },

	// Phase 2 — Appearance Trifecta
	{ id: "foliage.theme",          status: "implemented", fieldCount: 3,  phase: 2, file: "appearance/theme.ts" },
	{ id: "foliage.colors",         status: "implemented", fieldCount: 1,  phase: 2, file: "appearance/colors.ts" },
	{ id: "foliage.css",            status: "implemented", fieldCount: 1,  phase: 2, file: "appearance/css.ts" },
	{ id: "foliage.layout",         status: "implemented", fieldCount: 1,  phase: 2, file: "appearance/layout.ts" },
	{ id: "curios.cursor",          status: "implemented", fieldCount: 6,  phase: 2, file: "curios/cursor.ts" },
	{ id: "curios.ambient",         status: "implemented", fieldCount: 4,  phase: 2, file: "curios/ambient.ts" },

	// Phase 3 — Content & Social
	{ id: "content.posts",          status: "implemented", fieldCount: 12, phase: 3, file: "content/posts.ts" },
	{ id: "content.pages",          status: "implemented", fieldCount: 7,  phase: 3, file: "content/pages.ts" },
	{ id: "content.blazes",         status: "implemented", fieldCount: 5,  phase: 3, file: "content/blazes.ts" },
	{ id: "curios.guestbook",       status: "implemented", fieldCount: 7,  phase: 3, file: "curios/guestbook.ts" },
	{ id: "curios.blogroll",        status: "implemented", fieldCount: 5,  phase: 3, file: "social/blogroll.ts" },
	{ id: "social.canopy",          status: "implemented", fieldCount: 4,  phase: 3, file: "social/canopy.ts" },

	// Phase 4 — Full Curio Coverage
	{ id: "curios.moodring",        status: "implemented", fieldCount: 6,  phase: 4, file: "curios/moodring.ts" },
	{ id: "curios.nowplaying",      status: "implemented", fieldCount: 6,  phase: 4, file: "curios/nowplaying.ts" },
	{ id: "curios.gallery",         status: "implemented", fieldCount: 14, phase: 4, file: "curios/gallery.ts" },
	{ id: "curios.timeline",        status: "implemented", fieldCount: 10, phase: 4, file: "curios/timeline.ts" },
	{ id: "curios.journey",         status: "implemented", fieldCount: 7,  phase: 4, file: "curios/journey.ts" },
	{ id: "curios.pulse",           status: "implemented", fieldCount: 9,  phase: 4, file: "curios/pulse.ts" },
	{ id: "curios.hitcounter",      status: "implemented", fieldCount: 6,  phase: 4, file: "curios/hitcounter.ts" },
	{ id: "curios.linkgarden",      status: "implemented", fieldCount: 3,  phase: 4, file: "curios/linkgarden.ts" },
	{ id: "curios.polls",           status: "implemented", fieldCount: 6,  phase: 4, file: "curios/polls.ts" },
	{ id: "curios.bookmarks",       status: "implemented", fieldCount: 6,  phase: 4, file: "curios/bookmarks.ts" },
	{ id: "identity.badges",        status: "implemented", fieldCount: 3,  phase: 4, file: "identity/badges.ts" },
	{ id: "identity.activitystatus", status: "implemented", fieldCount: 6,  phase: 4, file: "identity/activitystatus.ts" },

	// Phase 5 — Infrastructure (read-only)
	{ id: "curios.webring",         status: "implemented", fieldCount: 7,  phase: 5, file: "social/webring.ts" },
	{ id: "infra.billing",          status: "implemented", fieldCount: 5,  phase: 5, file: "infra/billing.ts" },
	{ id: "infra.flags",            status: "implemented", fieldCount: 2,  phase: 5, file: "infra/flags.ts" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Count of implemented schemas */
export const IMPLEMENTED_COUNT = DOMAIN_CATALOG.filter((d) => d.status === "implemented").length;

/** Count of planned schemas */
export const PLANNED_COUNT = DOMAIN_CATALOG.filter((d) => d.status === "planned").length;

/** Total field count across all implemented schemas */
export const IMPLEMENTED_FIELD_COUNT = DOMAIN_CATALOG
	.filter((d) => d.status === "implemented")
	.reduce((sum, d) => sum + d.fieldCount, 0);

/** Get catalog entries by phase */
export function getCatalogByPhase(phase: number): readonly CatalogEntry[] {
	return DOMAIN_CATALOG.filter((d) => d.phase === phase);
}

/** Get catalog entries by status */
export function getCatalogByStatus(status: CatalogEntry["status"]): readonly CatalogEntry[] {
	return DOMAIN_CATALOG.filter((d) => d.status === status);
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export domain-specific constants
// ─────────────────────────────────────────────────────────────────────────────

export { ACCENT_PRESETS } from "./schemas/appearance/accent";
export { FONT_MOODS } from "./schemas/appearance/typography";
export { THEME_MOODS } from "./schemas/appearance/theme";
export { CSS_BLOCKED_PATTERNS } from "./schemas/appearance/css";
export { INTEREST_OPTIONS } from "./schemas/identity/profile";
export { DEFAULT_BLAZES } from "./schemas/content/blazes";
export { CANOPY_CATEGORIES } from "./schemas/social/canopy";
