<script lang="ts">
	/**
	 * Domain Finder Admin Login Page
	 *
	 * Uses LoginGraft for unified authentication across Grove properties.
	 * Redirects directly to Better Auth for OAuth, supports passkeys via WebAuthn.
	 */

	import { LoginGraft } from '@autumnsgrove/groveengine/grafts/login';
	import { page } from '$app/stores';

	// Get error from URL params (set by callback on auth failure)
	const error = $derived($page.url.searchParams.get('error'));
</script>

<svelte:head>
	<title>Admin Login - Domain Finder</title>
</svelte:head>

<LoginGraft
	variant="fullpage"
	providers={['google', 'passkey']}
	returnTo="/admin"
>
	{#snippet logo()}
		<a href="/" class="inline-block text-domain-600 hover:text-domain-700 transition-colors" aria-label="Back to home">
			<svg class="w-14 h-14" viewBox="0 0 100 100" fill="none">
				<circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="3" fill="none" opacity="0.2" />
				<circle cx="50" cy="50" r="20" fill="currentColor" fill-opacity="0.15" />
				<circle cx="50" cy="50" r="10" fill="currentColor" />
				<circle cx="68" cy="68" r="12" stroke="currentColor" stroke-width="3" fill="white" />
				<line x1="77" y1="77" x2="88" y2="88" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
			</svg>
		</a>
	{/snippet}

	{#snippet header()}
		<h1 class="text-2xl font-semibold text-foreground">Admin Login</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Sign in to access Domain Finder admin
		</p>
		{#if error}
			<div class="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
				{error}
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<a
			href="/"
			class="text-sm text-muted-foreground hover:text-domain-600 transition-colors"
		>
			Back to Domain Finder
		</a>
	{/snippet}
</LoginGraft>
