<script lang="ts">
	/**
	 * Engine Admin Login Page
	 *
	 * Uses LoginGraft for unified authentication across Grove properties.
	 * Redirects directly to Better Auth for OAuth, supports passkeys via WebAuthn.
	 */

	import { LoginGraft } from '$lib/grafts/login';
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
		<svg class="w-16 h-16 text-grove-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="currentColor" opacity="0.2"/>
			<path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 2.18l6 3v5.82c0 4.53-3.13 8.72-6 9.82-2.87-1.1-6-5.29-6-9.82V7.18l6-3z" fill="currentColor"/>
			<circle cx="12" cy="10" r="3" fill="currentColor"/>
		</svg>
	{/snippet}

	{#snippet header()}
		<h1 class="text-2xl font-semibold text-foreground">Admin Panel</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Sign in to access the admin panel
		</p>
		{#if error}
			<div class="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
				{error}
			</div>
		{/if}
	{/snippet}
</LoginGraft>
