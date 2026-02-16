<script lang="ts">
	/**
	 * Sign-in Page — login.grove.place
	 *
	 * The unified auth entry point for all Grove properties.
	 * Supports Google OAuth, passkey sign-in, and email magic links.
	 *
	 * Reads ?redirect=URL to know where to send the user after auth.
	 * Defaults to grove.place when no redirect is specified.
	 */

	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { authClient } from '$lib/auth-client';
	import { validateRedirectUrl } from '$lib/redirect';
	import { Waystone } from '@autumnsgrove/groveengine/ui';

	// Read redirect param from URL
	const redirectTo = $derived(
		validateRedirectUrl(page.url.searchParams.get('redirect'))
	);

	// UI state
	let loadingProvider = $state<'google' | 'passkey' | 'email' | null>(null);
	let error = $state<string | null>(null);
	let emailSent = $state(false);
	let email = $state('');

	/**
	 * Store redirect URL in a cookie before starting OAuth.
	 * This is a fallback for when Better Auth doesn't preserve query
	 * parameters in the callbackURL during the OAuth redirect chain.
	 *
	 * NOTE: HttpOnly is intentionally omitted — this cookie is set via
	 * document.cookie (client-side) because the server-side +page.svelte
	 * load function doesn't run for client-initiated OAuth navigations.
	 * The value is always a validated grove.place URL (via validateRedirectUrl),
	 * so XSS exfiltration risk is limited to leaking the redirect target,
	 * not session tokens.
	 */
	function storeRedirectCookie() {
		if (!browser) return;
		document.cookie = `grove_auth_redirect=${encodeURIComponent(redirectTo)};path=/;max-age=600;samesite=lax;secure`;
	}

	/**
	 * Sign in with Google OAuth.
	 * better-auth handles the full OAuth dance — we just redirect.
	 */
	async function signInWithGoogle() {
		if (!browser || loadingProvider) return;
		loadingProvider = 'google';
		error = null;

		try {
			storeRedirectCookie();
			await authClient.signIn.social({
				provider: 'google',
				callbackURL: `/callback?redirect=${encodeURIComponent(redirectTo)}`,
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Google sign-in failed';
			loadingProvider = null;
		}
	}

	/**
	 * Sign in with passkey.
	 * better-auth handles the WebAuthn ceremony — same-origin, no cookie issues.
	 */
	async function signInWithPasskey() {
		if (!browser || loadingProvider) return;
		loadingProvider = 'passkey';
		error = null;

		try {
			const result = await authClient.signIn.passkey();
			if (result.error) {
				throw new Error(result.error.message || 'Passkey sign-in failed');
			}
			// Session cookie is set — redirect to destination
			window.location.href = redirectTo;
		} catch (err) {
			if (err instanceof Error && err.name === 'NotAllowedError') {
				error = 'Passkey sign-in was cancelled or timed out.';
			} else {
				error = err instanceof Error ? err.message : 'Passkey sign-in failed';
			}
			loadingProvider = null;
		}
	}

	/**
	 * Sign in with email magic link.
	 */
	async function signInWithEmail() {
		if (!browser || loadingProvider || !email.trim()) return;
		loadingProvider = 'email';
		error = null;

		try {
			storeRedirectCookie();
			const result = await authClient.signIn.magicLink({
				email: email.trim(),
				callbackURL: `/callback?redirect=${encodeURIComponent(redirectTo)}`,
			});
			if (result.error) {
				throw new Error(result.error.message || 'Failed to send magic link');
			}
			emailSent = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send magic link';
		} finally {
			loadingProvider = null;
		}
	}
</script>

<svelte:head>
	<title>Sign In - Grove</title>
</svelte:head>

<div class="w-full max-w-sm animate-fade-in">
	<!-- Card -->
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-lg">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-2xl font-serif text-foreground">
				Welcome back, Wanderer
			</h1>
			<p class="mt-2 text-sm text-foreground-muted">
				Sign in to continue to Grove
			</p>
		</div>

		<!-- Error -->
		{#if error}
			<div role="alert" class="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 text-sm text-red-700 dark:text-red-300 text-center">
				{error}
			</div>
		{/if}

		{#if emailSent}
			<!-- Email sent confirmation -->
			<div class="text-center space-y-4 py-4" role="status" aria-live="polite">
				<div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400" aria-hidden="true">
						<rect width="20" height="16" x="2" y="4" rx="2" />
						<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
					</svg>
				</div>
				<div>
					<p class="text-foreground font-medium">Check your email</p>
					<p class="text-sm text-foreground-muted mt-1">
						We sent a magic link to <strong class="text-foreground">{email}</strong>
					</p>
				</div>
				<button
					onclick={() => { emailSent = false; email = ''; }}
					class="text-sm text-primary hover:underline"
				>
					Use a different method
				</button>
			</div>
		{:else}
			<!-- Provider buttons -->
			<div class="space-y-3">
				<!-- Google -->
				<button
					onclick={signInWithGoogle}
					disabled={loadingProvider !== null}
					class="btn-auth"
				>
					{#if loadingProvider === 'google'}
						<div class="spinner"></div>
						<span>Redirecting...</span>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
						</svg>
						<span>Continue with Google</span>
					{/if}
				</button>

				<!-- Passkey -->
				<div class="relative">
					<button
						onclick={signInWithPasskey}
						disabled={loadingProvider !== null}
						class="btn-auth w-full"
					>
						{#if loadingProvider === 'passkey'}
							<div class="spinner"></div>
							<span>Authenticating...</span>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
								<path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
								<path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
								<path d="M2 12a10 10 0 0 1 18-6"/>
								<path d="M2 16h.01"/>
								<path d="M21.8 16c.2-2 .131-5.354 0-6"/>
								<path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
								<path d="M8.65 22c.21-.66.45-1.32.57-2"/>
								<path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
							</svg>
							<span>Continue with Passkey</span>
						{/if}
					</button>
					<div class="absolute right-2 top-1/2 -translate-y-1/2">
						<Waystone slug="what-are-passkeys" label="What's a passkey?" size="sm" />
					</div>
				</div>

				<!-- Divider -->
				<div class="relative py-2">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-default"></div>
					</div>
					<div class="relative flex justify-center">
						<span class="px-3 text-xs text-foreground-subtle bg-page">or</span>
					</div>
				</div>

				<!-- Email magic link -->
				<form onsubmit={(e) => { e.preventDefault(); signInWithEmail(); }}>
					<div class="space-y-3">
						<label for="email-input" class="sr-only">Email address</label>
						<input
							id="email-input"
							type="email"
							bind:value={email}
							placeholder="your@email.com"
							required
							autocomplete="email"
							class="input-field"
							disabled={loadingProvider !== null}
						/>
						<button
							type="submit"
							disabled={loadingProvider !== null || !email.trim()}
							class="btn-auth"
						>
							{#if loadingProvider === 'email'}
								<div class="spinner"></div>
								<span>Sending...</span>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<rect width="20" height="16" x="2" y="4" rx="2" />
									<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
								</svg>
								<span>Continue with Email</span>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<p class="mt-6 text-center text-xs text-foreground-subtle">
				By signing in, you agree to Grove's
				<a href="https://grove.place/knowledge/legal/terms-of-service" class="underline hover:text-foreground-muted" target="_blank" rel="noopener noreferrer">Terms</a>
				and
				<a href="https://grove.place/knowledge/legal/privacy-policy" class="underline hover:text-foreground-muted" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
				<Waystone slug="understanding-your-privacy" label="How we protect your data" size="sm" inline />
			</p>
		{/if}
	</div>
</div>
