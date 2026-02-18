<script lang="ts">
	/**
	 * Vista Dashboard Layout
	 *
	 * Provides Vista's own sidebar navigation with observability-specific nav items.
	 * This layout bypasses the parent ArborPanel (which is skipped via the /arbor/+layout.svelte
	 * isVistaPage check) and renders its own ArborPanel instance with Vista nav.
	 */

	import { ArborPanel } from "@autumnsgrove/groveengine/ui/arbor";
	import { sidebarStore } from "@autumnsgrove/groveengine/ui/arbor";
	import { GlassConfirmDialog } from "@autumnsgrove/groveengine/ui";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import {
		LayoutDashboard,
		Server,
		Database,
		HardDrive,
		Box,
		DollarSign,
		Brain,
		Shield,
		Lock,
		Flower2,
		Flame,
		Bell,
		ArrowLeft,
	} from "lucide-svelte";
	import type { ArborNavEntry } from "@autumnsgrove/groveengine/ui/arbor";
	import type { LayoutData } from "./$types";
	import type { Snippet } from "svelte";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let showSignOutDialog = $state(false);
	let sidebarCollapsed = $derived(sidebarStore.collapsed);

	function handleLogoutClick() {
		showSignOutDialog = true;
	}

	async function handleSignOutConfirm() {
		await fetch("/api/auth/signout", { method: "POST" }); // csrf-ok
		window.location.href = "/";
	}

	const headerUser = $derived(
		data.user
			? {
					id: data.user.id,
					name: data.user.name,
					email: data.user.email,
				}
			: null,
	);

	const vistaNav: ArborNavEntry[] = [
		{ href: "/arbor", label: "Back to Admin", icon: ArrowLeft },
		{ kind: "divider", label: "Vista", style: "grove" },
		{ href: "/arbor/vista", label: "Overview", icon: LayoutDashboard },
		{ href: "/arbor/vista/workers", label: "Workers", icon: Server },
		{ href: "/arbor/vista/databases", label: "Databases", icon: Database },
		{ href: "/arbor/vista/storage", label: "Storage", icon: HardDrive },
		{ href: "/arbor/vista/durable-objects", label: "Durable Objects", icon: Box },
		{ href: "/arbor/vista/costs", label: "Costs", icon: DollarSign },
		{ kind: "divider", label: "Services", style: "line" },
		{ href: "/arbor/vista/ai", label: "AI Usage", icon: Brain },
		{ href: "/arbor/vista/moderation", label: "Moderation", icon: Shield },
		{ href: "/arbor/vista/warden", label: "Warden", icon: Lock },
		{ href: "/arbor/vista/meadow", label: "Meadow", icon: Flower2 },
		{ href: "/arbor/vista/firefly", label: "Firefly", icon: Flame },
		{ kind: "divider", style: "line" },
		{ href: "/arbor/vista/alerts", label: "Alerts", icon: Bell },
	];

	const footerLinks = [
		{ href: "https://grove.place/knowledge/help", label: "Help Center", external: true },
		{ href: "https://grove.place/porch", label: "Get Support", external: true },
	];
</script>

<!-- Chrome Header with sidebar toggle -->
<Header showSidebarToggle={true} user={headerUser} userHref="/arbor" />

<ArborPanel
	navItems={vistaNav}
	{footerLinks}
	user={data.user}
	brandTitle="Vista"
	onLogout={handleLogoutClick}
>
	{@render children()}
</ArborPanel>

<!-- Footer with sidebar margin offset -->
<div class="vista-footer-wrapper" class:collapsed={sidebarCollapsed}>
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

<style>
	.vista-footer-wrapper {
		margin-left: calc(250px + 0.75rem);
		transition: margin-left 0.3s ease;
	}

	.vista-footer-wrapper.collapsed {
		margin-left: calc(72px + 0.75rem);
	}

	@media (max-width: 768px) {
		.vista-footer-wrapper,
		.vista-footer-wrapper.collapsed {
			margin-left: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.vista-footer-wrapper {
			transition: none;
		}
	}
</style>
