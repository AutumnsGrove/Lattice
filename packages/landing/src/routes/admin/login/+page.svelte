<script lang="ts">
	/**
	 * Landing Admin Login Page
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
	<title>Admin Login - Grove</title>
</svelte:head>

<LoginGraft
	variant="fullpage"
	providers={['google', 'passkey']}
	returnTo="/admin"
>
	{#snippet logo()}
		<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors" aria-label="Go to home">
			<svg class="w-16 h-16" viewBox="0 0 100 100" fill="none">
				<path
					d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
					fill="currentColor"
					fill-opacity="0.3"
				/>
				<path
					d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
					fill="currentColor"
				/>
				<path d="M50 70V85" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
			</svg>
		</a>
	{/snippet}

	{#snippet header()}
		<h1 class="text-2xl font-semibold text-foreground">Admin Login</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Sign in to access the Grove admin panel
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
			class="text-sm text-muted-foreground hover:text-grove-600 transition-colors"
		>
			Back to Grove
		</a>
	{/snippet}
</LoginGraft>
