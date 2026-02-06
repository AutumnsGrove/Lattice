<script lang="ts">
	/**
	 * Engine Login Page
	 *
	 * Uses LoginGraft for unified authentication across Grove properties.
	 * Redirects directly to Better Auth for OAuth, supports passkeys via WebAuthn.
	 *
	 * Context-aware: shows "Admin Panel" copy when redirected from /arbor,
	 * otherwise shows a welcoming sign-in message for general visitors.
	 */

	import { LoginGraft } from '$lib/grafts/login';
	import { Logo, GroveSwap } from '$lib/ui/components/ui';
	import { sanitizeReturnTo } from '$lib/utils/grove-url.js';
	import { page } from '$app/stores';

	// Get error details from URL params (set by callback on auth failure)
	const error = $derived($page.url.searchParams.get('error'));
	const errorCode = $derived($page.url.searchParams.get('error_code'));

	// Dynamic return destination: /arbor redirects pass ?redirect=%2Farbor,
	// header sign-in links arrive with no param → default to /
	// Sanitized to prevent open redirect attacks via crafted ?redirect= param
	const returnTo = $derived(sanitizeReturnTo($page.url.searchParams.get('redirect'), '/'));
	const isAdminLogin = $derived(returnTo.startsWith('/arbor'));
</script>

<svelte:head>
	<title>{isAdminLogin ? 'Admin Login' : 'Sign In'} - Grove</title>
</svelte:head>

<LoginGraft
	variant="fullpage"
	providers={['google', 'passkey']}
	returnTo={returnTo}
>
	{#snippet logo()}
		<Logo class="w-16 h-16" />
	{/snippet}

	{#snippet header()}
		<h1 class="text-2xl font-semibold text-foreground">
			{#if isAdminLogin}<GroveSwap term="arbor" standard="Dashboard">Admin Panel</GroveSwap>{:else}Welcome{#if false}, <GroveSwap term="wanderer">Wanderer</GroveSwap>{/if}{/if}
		</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			{isAdminLogin ? 'Sign in to access your dashboard' : 'Sign in to continue'}
		</p>
		{#if error}
			<div class="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
				<p>{error}</p>
				{#if errorCode}
					<p class="mt-1 text-xs text-red-500 dark:text-red-400 font-mono">
						Error code: {errorCode}
					</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</LoginGraft>
