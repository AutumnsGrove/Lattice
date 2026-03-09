/**
 * Lantern Destinations & Services — Static Navigation Data
 *
 * Provides the navigation links shown in the Lantern panel's two tabs:
 * - Destinations: core grove pages (Home, Dashboard, Feed, etc.)
 * - Services: platform tools (Email, Storage, AI Config, etc.)
 */

import {
	BookUser,
	Users,
	Trees,
	BookOpen,
	Mailbox,
	Archive,
	Sparkles,
	Settings,
} from "lucide-svelte";
import type { LanternDestination } from "./types";

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
			icon: BookUser,
			external: true,
			termSlug: "canopy",
		},
		{
			href: "https://meadow.grove.place",
			label: "Feed",
			groveLabel: "Meadow",
			icon: Users,
			external: true,
			termSlug: "meadow",
		},
		{
			href: "https://grove.place/forest",
			label: "Communities",
			groveLabel: "Forests",
			icon: Trees,
			external: true,
			termSlug: "forests",
		},
		{
			href: "https://grove.place/knowledge",
			label: "Help",
			groveLabel: "Knowledge Base",
			icon: BookOpen,
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
		icon: Mailbox,
		external: true,
		termSlug: "ivy",
	},
	{
		href: "https://amber.grove.place",
		label: "Storage",
		groveLabel: "Amber",
		icon: Archive,
		external: true,
		termSlug: "amber",
	},
	{
		href: "/arbor/reverie",
		label: "AI Config",
		groveLabel: "Reverie",
		icon: Sparkles,
		external: false,
		termSlug: "reverie",
	},
	{
		href: "/arbor",
		label: "Admin",
		groveLabel: "Arbor",
		icon: Settings,
		external: false,
		termSlug: "arbor",
	},
];
