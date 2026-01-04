<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Don't show the admin layout on login page
	const isLoginPage = $derived($page.url.pathname === '/admin/login');

	const tabs = [
		{ name: 'Dashboard', href: '/admin', icon: 'dashboard' },
		{ name: 'Searcher', href: '/admin/searcher', icon: 'search' },
		{ name: 'History', href: '/admin/history', icon: 'history' },
		{ name: 'Config', href: '/admin/config', icon: 'config' }
	];

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return $page.url.pathname === '/admin';
		}
		return $page.url.pathname.startsWith(href);
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="min-h-screen flex flex-col">
		<!-- Header -->
		<header class="glass-surface sticky top-0 z-50">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center h-16">
					<!-- Logo -->
					<a href="/" class="flex items-center gap-3 group">
						<svg class="w-8 h-8 text-domain-600 dark:text-domain-400 group-hover:text-domain-700 dark:group-hover:text-domain-300 transition-colors" viewBox="0 0 100 100" fill="none">
							<circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="3" fill="none" opacity="0.2" />
							<circle cx="50" cy="50" r="10" fill="currentColor" />
							<circle cx="68" cy="68" r="12" stroke="currentColor" stroke-width="3" fill="white" class="dark:fill-neutral-900" />
							<line x1="77" y1="77" x2="88" y2="88" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
						</svg>
						<span class="font-serif text-lg text-bark dark:text-neutral-100 group-hover:text-domain-700 dark:group-hover:text-domain-300 transition-colors">Domain Finder</span>
					</a>

					<!-- User menu -->
					<div class="flex items-center gap-4">
						<span class="text-sm text-bark/60 dark:text-neutral-400 font-sans hidden sm:block">
							{data.user?.email}
						</span>
						<button
							onclick={logout}
							class="text-sm text-bark/60 dark:text-neutral-400
								hover:text-red-600 dark:hover:text-red-400
								font-sans transition-colors px-3 py-1.5 rounded-lg
								hover:bg-red-50 dark:hover:bg-red-900/20"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Tab Navigation -->
		<nav class="glass-tabs sticky top-16 z-40">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex gap-1 -mb-px overflow-x-auto">
					{#each tabs as tab}
						<a
							href={tab.href}
							class="tab flex items-center gap-2 py-4 border-b-2 transition-colors
								{isActive(tab.href)
									? 'border-domain-600 dark:border-domain-400 text-domain-700 dark:text-domain-300'
									: 'border-transparent text-bark/60 dark:text-neutral-400 hover:text-bark dark:hover:text-neutral-200 hover:border-bark/20 dark:hover:border-neutral-600'}"
						>
							{#if tab.icon === 'dashboard'}
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
								</svg>
							{:else if tab.icon === 'search'}
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
								</svg>
							{:else if tab.icon === 'history'}
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
								</svg>
							{:else if tab.icon === 'config'}
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
								</svg>
							{/if}
							<span class="whitespace-nowrap">{tab.name}</span>
						</a>
					{/each}
				</div>
			</div>
		</nav>

		<!-- Main Content -->
		<main class="flex-1 py-8">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
