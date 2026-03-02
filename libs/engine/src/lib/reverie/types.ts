/**
 * Reverie — Domain Schema Type Definitions
 *
 * These types define how each Grove configuration domain exposes
 * its levers to the Reverie natural language agent. Schemas are
 * static, versionable, and never change at runtime.
 *
 * @see docs/specs/reverie-spec.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Domain Identifiers
// ─────────────────────────────────────────────────────────────────────────────

/** Territory groups that organize domains */
export type DomainGroup =
	| "identity"
	| "appearance"
	| "content"
	| "social"
	| "curios"
	| "infra";

/** All registered domain IDs. Extend this as new domains are added. */
export type DomainId =
	// Identity
	| "identity.profile"
	| "identity.activitystatus"
	| "identity.badges"
	// Appearance
	| "foliage.theme"
	| "foliage.accent"
	| "foliage.typography"
	| "foliage.colors"
	| "foliage.css"
	| "foliage.layout"
	| "curios.cursor"
	// Content
	| "content.posts"
	| "content.pages"
	| "content.blazes"
	// Social
	| "social.comments"
	| "social.meadow"
	| "social.canopy"
	| "curios.guestbook"
	| "curios.webring"
	| "curios.blogroll"
	// Curios
	| "curios.moodring"
	| "curios.gallery"
	| "curios.nowplaying"
	| "curios.timeline"
	| "curios.journey"
	| "curios.pulse"
	| "curios.hitcounter"
	| "curios.linkgarden"
	| "curios.polls"
	| "curios.ambient"
	| "curios.bookmarks"
	// Infrastructure (read-only)
	| "infra.billing"
	| "infra.flags";

// ─────────────────────────────────────────────────────────────────────────────
// Field Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Supported field types */
export type FieldType =
	| "string"
	| "boolean"
	| "integer"
	| "enum"
	| "color"
	| "json"
	| "url"
	| "font";

/** Validation constraints for a field */
export interface FieldConstraints {
	/** Minimum value (integers) */
	min?: number;
	/** Maximum value (integers) */
	max?: number;
	/** Maximum string length */
	maxLength?: number;
	/** Regex pattern for validation */
	pattern?: string;
}

/** A single configurable field within a domain */
export interface FieldDefinition {
	/** Field type for validation and UI rendering */
	type: FieldType;
	/** Human-readable description of what this field does */
	description: string;
	/** Allowed values for enum and font types */
	options?: readonly string[];
	/** Default value */
	default?: string | number | boolean;
	/** Validation constraints */
	constraints?: FieldConstraints;
	/** Read-only fields cannot be set through Reverie */
	readonly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Schema
// ─────────────────────────────────────────────────────────────────────────────

/** HTTP methods used for writing domain configuration */
export type WriteMethod = "PUT" | "POST" | "PATCH" | "DELETE";

/**
 * A complete domain schema. Each of the 32 Grove configuration
 * domains defines one of these. The schema tells Reverie:
 * - What fields can be configured
 * - What types and constraints apply
 * - Which API endpoint to call
 * - Example natural language inputs for context
 */
export interface DomainSchema {
	/** Unique domain identifier (e.g., "foliage.accent") */
	id: DomainId;
	/** Human-readable name (e.g., "Accent Color") */
	name: string;
	/** One-sentence description of what this domain controls */
	description: string;
	/** Territory group for organization */
	group: DomainGroup;
	/** Which database this domain lives in */
	database: "engine" | "curios" | "observability";
	/** API endpoint for reading current state */
	readEndpoint: string;
	/** API endpoint for writing changes (null = read-only domain) */
	writeEndpoint: string | null;
	/** HTTP method for writes */
	writeMethod: WriteMethod;
	/** Configurable fields */
	fields: Record<string, FieldDefinition>;
	/** Natural language examples that would route to this domain */
	examples: readonly string[];
	/** Keywords that trigger this domain in the router */
	keywords: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Atmosphere Manifold
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An atmosphere entry maps an aesthetic keyword to coordinated
 * settings across multiple domains. When a Wanderer says "make
 * my site feel cozy," the atmosphere manifold provides the
 * pre-composed settings for all affected domains.
 */
export interface AtmosphereEntry {
	/** Keyword that triggers this atmosphere (e.g., "cozy") */
	keyword: string;
	/** Human-readable description for the preview */
	description: string;
	/** Related keywords that also match (e.g., "warm" matches "cozy") */
	aliases: readonly string[];
	/**
	 * Coordinated settings across domains.
	 * Keys are dot-paths: "domainId.fieldName"
	 * Values match the field type defined in the domain schema.
	 */
	settings: Record<string, string | number | boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog & Inventory
// ─────────────────────────────────────────────────────────────────────────────

/** Implementation status of a domain schema */
export type SchemaStatus = "implemented" | "planned" | "excluded";

/**
 * Catalog entry for inventory tracking. Each schema file registers
 * itself in the catalog so the inventory script can discover and
 * validate all domains.
 */
export interface CatalogEntry {
	/** Domain ID */
	id: DomainId;
	/** Implementation status */
	status: SchemaStatus;
	/** Number of configurable fields */
	fieldCount: number;
	/** Implementation phase from the spec */
	phase: 1 | 2 | 3 | 4 | 5;
	/** File path relative to schemas/ directory */
	file: string;
}
