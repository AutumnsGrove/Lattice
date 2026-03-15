/**
 * Petal - Image Content Moderation Types (Extracted)
 *
 * Core type definitions for Grove's 4-layer image moderation system.
 * This file contains types used across configuration and server-side code.
 *
 * @see docs/specs/petal-spec.md
 */

/**
 * Content categories for classification
 */
export type PetalCategory =
	| "appropriate"
	| "nudity"
	| "sexual"
	| "violence"
	| "minor_present"
	| "drugs"
	| "self_harm"
	| "hate_symbols"
	| "csam_detected"
	| "swimwear"
	| "underwear"
	| "revealing"
	| "artistic_nudity";

/**
 * Vision provider configuration
 */
export interface PetalProviderConfig {
	name: string;
	type: "workers_ai" | "external_api";
	role: "primary" | "fallback" | "tertiary";
	/** Zero Data Retention support */
	zdr: boolean;
	/** Built-in CSAM scanning */
	csamScan: boolean;
	/** Model identifier */
	model: string;
	/** Timeout in ms */
	timeoutMs: number;
}
