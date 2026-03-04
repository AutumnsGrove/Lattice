/**
 * Lantern Destinations & Services — Static Navigation Data
 *
 * Provides the navigation links shown in the Lantern panel's two tabs:
 * - Destinations: core grove pages (Home, Dashboard, Feed, etc.)
 * - Services: platform tools (Email, Storage, AI Config, etc.)
 */

import {
	Home,
	LayoutDashboard,
	Leaf,
	Trees,
	BookOpen,
	TreePine,
	Mail,
	Archive,
	Sparkles,
	Settings,
	MessageCircle,
} from "lucide-svelte";
import type { LanternDestination } from "./types";

/**
 * Build the destinations list, personalized with the user's home grove.
 */
export function getDestinations(homeGrove: string): LanternDestination[] {
	const groveUrl = `https://${homeGrove}.grove.place`;

	return [
		{
			href: groveUrl,
			label: "Back to My Site",
			groveLabel: "Return to Your Grove",
			icon: Home,
			external: true,
		},
		{
			href: `${groveUrl}/arbor`,
			label: "Dashboard",
			groveLabel: "Canopy",
			icon: LayoutDashboard,
			external: true,
			termSlug: "canopy",
		},
		{
			href: "https://grove.place/meadow",
			label: "Feed",
			groveLabel: "Meadow",
			icon: Leaf,
			external: true,
			termSlug: "meadow",
		},
		{
			href: groveUrl,
			label: "Home Page",
			groveLabel: "Grove Home",
			icon: TreePine,
			external: true,
		},
		{
			href: "https://grove.place/knowledge",
			label: "Help",
			groveLabel: "Knowledge Base",
			icon: BookOpen,
			external: true,
		},
		{
			href: "https://grove.place/forests",
			label: "Communities",
			groveLabel: "Forests",
			icon: Trees,
			external: true,
			termSlug: "forests",
		},
	];
}

/** Platform services shown in the Services tab. */
export const services: LanternDestination[] = [
	{
		href: "/arbor/messages",
		label: "Email",
		groveLabel: "Ivy",
		icon: Mail,
		external: false,
		termSlug: "ivy",
	},
	{
		href: "/arbor/storage",
		label: "Storage",
		groveLabel: "Amber",
		icon: Archive,
		external: false,
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
	{
		href: "/arbor/lumen",
		label: "AI Chat",
		groveLabel: "Lumen",
		icon: MessageCircle,
		external: false,
		termSlug: "lumen",
	},
];
