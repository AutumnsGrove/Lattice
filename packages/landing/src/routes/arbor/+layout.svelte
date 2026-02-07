<script lang="ts">
	/**
	 * Admin Layout
	 *
	 * Provides consistent header, navigation, and theming for all admin pages.
	 * Uses the engine's AdminHeader component for proper glassmorphism and dark mode.
	 *
	 * Note: Login page (/arbor/login) uses LoginGraft with its own layout,
	 * so we conditionally render based on route.
	 */

	import { page } from '$app/state';
	import { AdminHeader } from '@autumnsgrove/groveengine/ui/chrome';
	import { GlassConfirmDialog, GroveMessages } from '@autumnsgrove/groveengine/ui';
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
		Megaphone
	} from 'lucide-svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Check if we're on the login page (which has its own layout)
	let isLoginPage = $derived(page.url.pathname === '/arbor/login');

	// Dialog state for logout confirmation
	let showSignOutDialog = $state(false);

	function handleLogoutClick() {
		showSignOutDialog = true;
	}

	async function handleSignOutConfirm() {
		await fetch('/api/auth/signout', { method: 'POST' }); // csrf-ok
		window.location.href = '/';
	}

	// Admin navigation tabs (Wayfinder-only tabs are conditionally included)
	const baseTabs = [
		{ href: '/arbor', label: 'Dashboard', icon: Home },
		{ href: '/arbor/feedback', label: 'Feedback', icon: MessageCircle },
		{ href: '/arbor/subscribers', label: 'Subscribers', icon: AtSign },
		{ href: '/arbor/cdn', label: 'CDN', icon: Upload }
	];

	// Wayfinder-only tabs
	const wayfinderTabs = [
		{ href: '/arbor/messages', label: 'Messages', icon: Megaphone },
		{ href: '/arbor/porch', label: 'Porch', icon: MessageSquare },
		{ href: '/arbor/greenhouse', label: 'Greenhouse', icon: Sprout },
		{ href: '/arbor/comped-invites', label: 'Invites', icon: Gift },
		{ href: '/arbor/status', label: 'Status', icon: Activity },
		{ href: '/arbor/tenants', label: 'Tenants', icon: Users },
		{ href: '/arbor/minecraft', label: 'Minecraft', icon: Gamepad2 }
	];

	let tabs = $derived(data.isWayfinder ? [...baseTabs, ...wayfinderTabs] : baseTabs);
</script>

{#if isLoginPage}
	<!-- Login page manages its own layout via LoginGraft -->
	{@render children()}
{:else}
	<!-- Full admin layout with header and navigation -->
	<div class="min-h-screen bg-cream dark:bg-bark-900 transition-colors">
		<AdminHeader
			{tabs}
			brandTitle="Admin"
			user={data.user}
			onLogout={handleLogoutClick}
			maxWidth="wide"
		/>

		<main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{#if data.messages?.length && !isLoginPage}
				<div class="mb-6">
					<GroveMessages messages={data.messages} dismissible={true} />
				</div>
			{/if}
			{@render children()}
		</main>
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
