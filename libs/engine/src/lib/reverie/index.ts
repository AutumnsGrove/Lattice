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

	// Phase 3 — Content & Social (planned)
	{ id: "content.posts",          status: "planned",     fieldCount: 12, phase: 3, file: "content/posts.ts" },
	{ id: "content.pages",          status: "planned",     fieldCount: 7,  phase: 3, file: "content/pages.ts" },
	{ id: "content.blazes",         status: "planned",     fieldCount: 5,  phase: 3, file: "content/blazes.ts" },
	{ id: "curios.guestbook",       status: "planned",     fieldCount: 7,  phase: 3, file: "curios/guestbook.ts" },
	{ id: "curios.blogroll",        status: "planned",     fieldCount: 5,  phase: 3, file: "social/blogroll.ts" },
	{ id: "social.canopy",          status: "planned",     fieldCount: 4,  phase: 3, file: "social/canopy.ts" },

	// Phase 4 — Full Curio Coverage (planned)
	{ id: "curios.moodring",        status: "planned",     fieldCount: 6,  phase: 4, file: "curios/moodring.ts" },
	{ id: "curios.nowplaying",      status: "planned",     fieldCount: 6,  phase: 4, file: "curios/nowplaying.ts" },
	{ id: "curios.gallery",         status: "planned",     fieldCount: 14, phase: 4, file: "curios/gallery.ts" },
	{ id: "curios.timeline",        status: "planned",     fieldCount: 10, phase: 4, file: "curios/timeline.ts" },
	{ id: "curios.journey",         status: "planned",     fieldCount: 7,  phase: 4, file: "curios/journey.ts" },
	{ id: "curios.pulse",           status: "planned",     fieldCount: 9,  phase: 4, file: "curios/pulse.ts" },
	{ id: "curios.hitcounter",      status: "planned",     fieldCount: 6,  phase: 4, file: "curios/hitcounter.ts" },
	{ id: "curios.linkgarden",      status: "planned",     fieldCount: 3,  phase: 4, file: "curios/linkgarden.ts" },
	{ id: "curios.polls",           status: "planned",     fieldCount: 6,  phase: 4, file: "curios/polls.ts" },
	{ id: "curios.bookmarks",       status: "planned",     fieldCount: 6,  phase: 4, file: "curios/bookmarks.ts" },
	{ id: "identity.badges",        status: "planned",     fieldCount: 3,  phase: 4, file: "identity/badges.ts" },
	{ id: "identity.activitystatus", status: "planned",    fieldCount: 6,  phase: 4, file: "identity/activitystatus.ts" },

	// Phase 5 — Infrastructure (read-only, planned)
	{ id: "curios.webring",         status: "planned",     fieldCount: 7,  phase: 5, file: "curios/webring.ts" },
	{ id: "infra.billing",          status: "planned",     fieldCount: 5,  phase: 5, file: "infra/billing.ts" },
	{ id: "infra.flags",            status: "planned",     fieldCount: 2,  phase: 5, file: "infra/flags.ts" },
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
