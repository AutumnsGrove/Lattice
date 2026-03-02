/**
 * Reverie Router — Intent Detection Layer
 *
 * Pure keyword matching — no LLM. Scans user input against domain schema
 * keywords and atmosphere aliases to determine which domains to load.
 *
 * Decision tree:
 *   exact atmosphere match → "atmosphere" action
 *   keyword matches → "configure" action
 *   question words → "query" action
 *   no matches → "no-match"
 */

import {
	findAtmosphere,
	ALL_ATMOSPHERE_KEYWORDS,
	SCHEMA_REGISTRY,
	getImplementedDomains,
} from "@autumnsgrove/lattice/reverie";
import type { DomainId, AtmosphereEntry } from "@autumnsgrove/lattice/reverie";

// =============================================================================
// Types
// =============================================================================

export type RouterAction = "configure" | "atmosphere" | "query" | "no-match";

export interface RouterResult {
	/** What kind of request this is */
	action: RouterAction;
	/** Domain IDs that matched the input keywords */
	domains: DomainId[];
	/** Atmosphere entry if an atmosphere keyword was detected */
	atmosphere?: AtmosphereEntry;
	/** Keywords from the input that triggered matches */
	keywords: string[];
}

// =============================================================================
// Constants
// =============================================================================

const QUERY_WORDS = new Set([
	"what",
	"show",
	"get",
	"current",
	"display",
	"list",
	"tell",
	"check",
	"view",
	"see",
	"look",
	"status",
	"info",
	"which",
]);

/**
 * Precomputed keyword → domain ID map.
 * Built once at module load — eliminates O(n*m) nested loop per request.
 * Maps each lowercase keyword to the domain IDs it triggers.
 */
const KEYWORD_TO_DOMAINS: Map<string, DomainId[]> = (() => {
	const map = new Map<string, DomainId[]>();
	for (const domainId of getImplementedDomains()) {
		const schema = SCHEMA_REGISTRY[domainId];
		if (!schema) continue;
		for (const keyword of schema.keywords) {
			const lower = keyword.toLowerCase();
			const existing = map.get(lower);
			if (existing) {
				if (!existing.includes(domainId)) existing.push(domainId);
			} else {
				map.set(lower, [domainId]);
			}
		}
	}
	return map;
})();

/** All known keywords, sorted longest-first for greedy matching */
const ALL_KEYWORDS: string[] = [...KEYWORD_TO_DOMAINS.keys()].sort((a, b) => b.length - a.length);

// =============================================================================
// Router
// =============================================================================

/**
 * Route user input to domains and determine action type.
 * Pure function — no LLM, no I/O, deterministic.
 */
export function routeInput(input: string): RouterResult {
	const normalized = input.toLowerCase().trim();
	const words = normalized.split(/\s+/);

	// 1. Check for atmosphere keywords first (they're cross-domain)
	const atmosphere = findAtmosphere(normalized);
	if (!atmosphere) {
		// Try each word individually
		for (const word of words) {
			const found = findAtmosphere(word);
			if (found) {
				return buildAtmosphereResult(found, [word]);
			}
		}
	} else {
		return buildAtmosphereResult(atmosphere, [normalized]);
	}

	// 2. Check for query intent
	const isQuery = words.some((w) => QUERY_WORDS.has(w));

	// 3. Scan domain keywords using precomputed map
	const matchedDomainSet = new Set<DomainId>();
	const matchedKeywordSet = new Set<string>();

	for (const keyword of ALL_KEYWORDS) {
		if (normalized.includes(keyword)) {
			matchedKeywordSet.add(keyword);
			for (const domainId of KEYWORD_TO_DOMAINS.get(keyword)!) {
				matchedDomainSet.add(domainId);
			}
		}
	}

	const matchedDomains = [...matchedDomainSet];
	const matchedKeywords = [...matchedKeywordSet];

	// 4. Determine action
	if (matchedDomains.length === 0) {
		return { action: "no-match", domains: [], keywords: [] };
	}

	if (isQuery) {
		return {
			action: "query",
			domains: matchedDomains,
			keywords: matchedKeywords,
		};
	}

	return {
		action: "configure",
		domains: matchedDomains,
		keywords: matchedKeywords,
	};
}

// =============================================================================
// Helpers
// =============================================================================

function buildAtmosphereResult(atmosphere: AtmosphereEntry, keywords: string[]): RouterResult {
	// Extract domain IDs from the atmosphere settings keys
	const domains: DomainId[] = [];
	for (const key of Object.keys(atmosphere.settings)) {
		// Keys are dot-paths like "foliage.theme.themeId" → domain is "foliage.theme"
		const parts = key.split(".");
		if (parts.length >= 2) {
			const domainId = `${parts[0]}.${parts[1]}` as DomainId;
			if (!domains.includes(domainId)) {
				domains.push(domainId);
			}
		}
	}

	return {
		action: "atmosphere",
		domains,
		atmosphere,
		keywords,
	};
}
