/**
 * Lantern Destinations & Services — Static Navigation Data
 *
 * Provides the navigation links shown in the Lantern panel's two tabs:
 * - Destinations: core grove pages (Home, Dashboard, Feed, etc.)
 * - Services: platform tools (Email, Storage, AI Config, etc.)
 */

import { featureIcons } from "@autumnsgrove/prism/icons";
import { defaultSuite, resolveIcon } from "$lib/ui/components/ui/groveicon";
import type { LanternDestination } from "./types";

// Resolve service icons from the canonical manifest
const meadowIcon = resolveIcon(defaultSuite.meadow.icon);
const forestsIcon = resolveIcon(defaultSuite.forests.icon);
const ivyIcon = resolveIcon(defaultSuite.ivy.icon);
const amberIcon = resolveIcon(defaultSuite.amber.icon);
const reverieIcon = resolveIcon(defaultSuite.reverie.icon);
const arborIcon = resolveIcon(defaultSuite.arbor.icon);

/**
 * Build the destinations list, personalized with the user's home grove.
 *
 * Note: "Return to Your Grove" is NOT in this list — it's the prominent
 * button rendered separately above the tabs in LanternPanel.
 */
export function getDestinations(_homeGrove: string): LanternDestination[] {
	return [
		{
			href: "https://grove.place/canopy",
			label: "Dashboard",
			groveLabel: "Canopy",
			icon: featureIcons.bookUser,
			external: true,
			termSlug: "canopy",
		},
		{
			href: "https://meadow.grove.place",
			label: "Feed",
			groveLabel: "Meadow",
			icon: meadowIcon,
			external: true,
			termSlug: "meadow",
		},
		{
			href: "https://grove.place/forest",
			label: "Communities",
			groveLabel: "Forests",
			icon: forestsIcon,
			external: true,
			termSlug: "forests",
		},
		{
			href: "https://grove.place/knowledge",
			label: "Help",
			groveLabel: "Knowledge Base",
			icon: featureIcons.bookOpen,
			external: true,
		},
	];
}

/** Platform services shown in the Services tab. */
export const services: LanternDestination[] = [
	{
		href: "https://ivy.grove.place",
		label: "Email",
		groveLabel: "Ivy",
		icon: ivyIcon,
		external: true,
		termSlug: "ivy",
	},
	{
		href: "https://amber.grove.place",
		label: "Storage",
		groveLabel: "Amber",
		icon: amberIcon,
		external: true,
		termSlug: "amber",
	},
	{
		href: "/arbor/reverie",
		label: "AI Config",
		groveLabel: "Reverie",
		icon: reverieIcon,
		external: false,
		termSlug: "reverie",
	},
	{
		href: "/arbor",
		label: "Admin",
		groveLabel: "Arbor",
		icon: arborIcon,
		external: false,
		termSlug: "arbor",
	},
];
