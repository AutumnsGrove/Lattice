/**
 * Blazes — Content Marker Type Definitions
 *
 * Two marks on one tree. The first tells you the path.
 * The second tells you why you're walking it.
 */

import type { Component } from "svelte";

/** Post content types that receive auto-blazes */
export type PostType = "bloom" | "note";

/** Auto-blaze config for Slot 1 (derived from post_type, never stored) */
export interface AutoBlazeConfig {
	label: string;
	icon: Component;
	/** Full Tailwind class string (static for JIT scanner) */
	classes: string;
}

/** A blaze definition from the database (Slot 2 — custom blazes) */
export interface BlazeDefinition {
	id: string;
	tenantId: string | null;
	slug: string;
	label: string;
	/** Lucide icon name as a string (e.g. "UtensilsCrossed") */
	icon: string;
	/** Color palette key (e.g. "rose", "sky") */
	color: string;
	sortOrder: number;
}

/** Resolved color classes for a palette key */
export interface BlazeColorClasses {
	classes: string;
}

/** API response shape for a blaze definition */
export interface BlazeResponse {
	slug: string;
	label: string;
	icon: string;
	color: string;
	scope: "global" | "tenant";
}
