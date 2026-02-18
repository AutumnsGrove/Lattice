<script lang="ts">
	/**
	 * Admin Layout
	 *
	 * Provides consistent sidebar navigation and theming for all admin pages.
	 * Uses the engine's ArborPanel component for the full sidebar experience,
	 * wrapped with Chrome Header (for mobile sidebar toggle) and Footer.
	 *
	 * Note: Login page (/arbor/login) redirects to login.grove.place via
	 * +page.server.ts, so it bypasses ArborPanel chrome.
	 */

	import { page } from "$app/state";
	import { ArborPanel } from "@autumnsgrove/groveengine/ui/arbor";
	import { sidebarStore } from "@autumnsgrove/groveengine/ui/arbor";
	import { GlassConfirmDialog } from "@autumnsgrove/groveengine/ui";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import {
		Home,
		MessageCircle,
		AtSign,
		Upload,
		MessageSquare,
		Sprout,
		Gift,
		Activity,
		Users,
		Gamepad2,
		Megaphone,
		Wind,
		Sparkles,
		ImagePlus,
		Eye,
	} from "lucide-svelte";
	import type { ArborNavEntry } from "@autumnsgrove/groveengine/ui/arbor";
	import type { LayoutData } from "./$types";
	import type { Snippet } from "svelte";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Check if we're on the login page (which has its own layout)
	let isLoginPage = $derived(page.url.pathname === "/arbor/login");

	// Vista provides its own ArborPanel — skip the parent wrapper
	let isVistaPage = $derived(page.url.pathname.startsWith("/arbor/vista"));

	// Dialog state for logout confirmation
	let showSignOutDialog = $state(false);

	// Track sidebar collapsed state for footer margin
	let sidebarCollapsed = $derived(sidebarStore.collapsed);

	function handleLogoutClick() {
		showSignOutDialog = true;
	}

	async function handleSignOutConfirm() {
		await fetch("/api/auth/signout", { method: "POST" }); // csrf-ok
		window.location.href = "/";
	}

	// Map user to HeaderUser shape (landing user has no avatarUrl)
	const headerUser = $derived(
		data.user
			? {
					id: data.user.id,
					name: data.user.name,
					email: data.user.email,
				}
			: null,
	);

	// Admin navigation items
	const baseItems: ArborNavEntry[] = [
		{ href: "/arbor", label: "Dashboard", icon: Home },
		{ href: "/arbor/feedback", label: "Feedback", icon: MessageCircle },
		{ href: "/arbor/subscribers", label: "Subscribers", icon: AtSign },
		{ href: "/arbor/cdn", label: "CDN", icon: Upload },
	];

	// Wayfinder-only items with section divider
	const wayfinderItems: ArborNavEntry[] = [
		{ kind: "divider", label: "Wayfinder Tools", style: "grove" },
		{ href: "/arbor/messages", label: "Messages", icon: Megaphone },
		{ href: "/arbor/porch", label: "Porch", icon: MessageSquare },
		{ href: "/arbor/greenhouse", label: "Greenhouse", icon: Sprout },
		{ href: "/arbor/comped-invites", label: "Invites", icon: Gift },
		{ href: "/arbor/status", label: "Status", icon: Activity },
		{ href: "/arbor/tenants", label: "Tenants", icon: Users },
		{ href: "/arbor/minecraft", label: "Minecraft", icon: Gamepad2 },
		{ href: "/arbor/uploads", label: "Uploads", icon: ImagePlus },
		{ href: "/arbor/zephyr", label: "Zephyr", icon: Wind },
		{ href: "/arbor/lumen", label: "Lumen", icon: Sparkles },
		{ href: "/arbor/vista", label: "Vista", icon: Eye },
	];

	let navItems = $derived(data.isWayfinder ? [...baseItems, ...wayfinderItems] : baseItems);

	const footerLinks = [
		{ href: "https://grove.place/knowledge/help", label: "Help Center", external: true },
		{ href: "https://grove.place/porch", label: "Get Support", external: true },
	];
</script>

{#if isLoginPage}
	<!-- Login page redirects to login.grove.place (fallback renders without ArborPanel) -->
	{@render children()}
{:else if isVistaPage}
	<!-- Vista has its own ArborPanel in /arbor/vista/+layout.svelte — just render children -->
	{@render children()}
{:else}
	<!-- Chrome Header with sidebar toggle (matches engine's arbor pattern) -->
	<Header showSidebarToggle={true} user={headerUser} userHref="/arbor" />

	<ArborPanel
		{navItems}
		{footerLinks}
		user={data.user}
		brandTitle="Admin"
		onLogout={handleLogoutClick}
		messages={data.messages}
	>
		{@render children()}
	</ArborPanel>

	<!-- Footer with sidebar margin offset -->
	<div class="arbor-footer-wrapper" class:collapsed={sidebarCollapsed}>
		<Footer />
	</div>

	<GlassConfirmDialog
		bind:open={showSignOutDialog}
		title="Sign Out"
		message="Are you sure you want to sign out of the admin dashboard?"
		confirmLabel="Sign Out"
		variant="default"
		onconfirm={handleSignOutConfirm}
	/>
{/if}

<style>
	/* Footer offset to account for sidebar width, matching engine pattern */
	.arbor-footer-wrapper {
		margin-left: calc(250px + 0.75rem);
		transition: margin-left 0.3s ease;
	}

	.arbor-footer-wrapper.collapsed {
		margin-left: calc(72px + 0.75rem);
	}

	@media (max-width: 768px) {
		.arbor-footer-wrapper,
		.arbor-footer-wrapper.collapsed {
			margin-left: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.arbor-footer-wrapper {
			transition: none;
		}
	}
</style>
