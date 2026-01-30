<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { AdminHeader } from '@autumnsgrove/groveengine/ui/chrome';
	import { LayoutDashboard, Search, Clock, Settings } from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Don't show the admin layout on login page
	const isLoginPage = $derived(page.url.pathname === '/admin/login');

	const tabs = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/admin/searcher', label: 'Searcher', icon: Search },
		{ href: '/admin/history', label: 'History', icon: Clock },
		{ href: '/admin/config', label: 'Config', icon: Settings }
	];

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="min-h-screen flex flex-col">
		<AdminHeader
			{tabs}
			brandTitle="Domain Finder"
			user={data.user}
			onLogout={logout}
			maxWidth="full"
			accentColor="var(--domain-600)"
		>
			{#snippet brandLogo()}
				<svg class="w-8 h-8 text-domain-600 dark:text-domain-400 group-hover:text-domain-700 dark:group-hover:text-domain-300 transition-colors" viewBox="0 0 100 100" fill="none">
					<circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="3" fill="none" opacity="0.2" />
					<circle cx="50" cy="50" r="10" fill="currentColor" />
					<circle cx="68" cy="68" r="12" stroke="currentColor" stroke-width="3" fill="white" class="dark:fill-neutral-900" />
					<line x1="77" y1="77" x2="88" y2="88" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				</svg>
			{/snippet}
		</AdminHeader>

		<main class="flex-1 py-8">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
