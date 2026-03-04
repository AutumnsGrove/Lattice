/**
 * Lantern Navigation Panel — Types
 *
 * Lantern is the cross-grove navigation panel that lets logged-in users
 * hop between groves, access platform services, and find their way home.
 * In Grove mode it's "Lantern"; in standard mode it's "Compass".
 */

import type { ComponentType } from "svelte";

/**
 * Minimal data passed from layout to Lantern.
 * Friends are fetched lazily on panel open to keep layout fast.
 */
export interface LanternLayoutData {
	homeGrove: string;
	displayName: string;
	enabled: boolean;
}

/**
 * A friend connection between two groves.
 */
export interface LanternFriend {
	tenantId: string;
	name: string;
	subdomain: string;
	avatar?: string;
	source: string;
}

/**
 * A navigation destination in the Lantern panel.
 */
export interface LanternDestination {
	href: string;
	label: string;
	groveLabel?: string;
	icon: ComponentType;
	external: boolean;
	termSlug?: string;
}

/**
 * A grove search result when adding friends.
 */
export interface LanternSearchResult {
	tenantId: string;
	name: string;
	subdomain: string;
	avatar?: string;
	bio?: string;
}

/** Active tab in the Lantern panel. */
export type LanternTab = "destinations" | "services";

/** Current view state of the Lantern panel. */
export type LanternView = "main" | "add-friends";
