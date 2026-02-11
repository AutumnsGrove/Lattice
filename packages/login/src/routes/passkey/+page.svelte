<script lang="ts">
	/**
	 * Passkey Registration Page — login.grove.place/passkey
	 *
	 * Allows authenticated users to register a new passkey.
	 * Uses better-auth's client library which handles the entire WebAuthn ceremony:
	 * - Fetches registration options from /api/auth/passkey/generate-register-options
	 * - Triggers browser's credential creation prompt (Face ID, Touch ID, etc.)
	 * - Sends the credential back to /api/auth/passkey/verify-registration
	 *
	 * All of this is same-origin via our proxy, so cookies flow naturally.
	 *
	 * Protected: requires an active session. Redirects to / if not logged in.
	 */

	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { validateRedirectUrl } from '$lib/redirect';

	// Where to go after passkey setup (or skip)
	const redirectTo = $derived(
		validateRedirectUrl(page.url.searchParams.get('redirect'))
	);

	let isRegistering = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	/**
	 * Get a descriptive name for the current device.
	 */
	function getDeviceName(): string {
		if (!browser) return 'My Passkey';
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('iphone')) return 'iPhone';
		if (ua.includes('ipad')) return 'iPad';
		if (ua.includes('macintosh') || ua.includes('mac os')) return 'MacBook';
		if (ua.includes('windows')) return 'Windows PC';
		if (ua.includes('android')) return 'Android Device';
		if (ua.includes('linux')) return 'Linux Device';
		return 'My Passkey';
	}

	/**
	 * Register a new passkey using better-auth's client library.
	 */
	async function registerPasskey() {
		if (!browser || isRegistering) return;
		isRegistering = true;
		error = null;

		try {
			const result = await authClient.passkey.addPasskey({
				name: getDeviceName(),
			});

			if (result.error) {
				throw new Error(result.error.message || 'Failed to create passkey');
			}

			success = true;

			// Brief delay to show success, then redirect
			setTimeout(() => {
				window.location.href = redirectTo;
			}, 1500);
		} catch (err) {
			if (err instanceof Error) {
				if (err.name === 'NotAllowedError') {
					error = 'Passkey creation was cancelled or timed out.';
				} else if (err.name === 'SecurityError') {
					error = 'Security error. Make sure you\'re using HTTPS.';
				} else if (err.name === 'InvalidStateError') {
					error = 'A passkey for this device already exists.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to create passkey. Please try again.';
			}
		} finally {
			isRegistering = false;
		}
	}

	function skipSetup() {
		window.location.href = redirectTo;
	}
</script>

<svelte:head>
	<title>Create Passkey - Grove</title>
</svelte:head>

<div class="w-full max-w-md animate-fade-in">
	<!-- Header -->
	<div class="text-center mb-8 space-y-4">
		<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 backdrop-blur-md border border-emerald-200/40 dark:border-emerald-700/30">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400" aria-hidden="true">
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
		</div>
		<div>
			<h1 class="text-2xl font-serif text-foreground">Secure your account</h1>
			<p class="mt-2 text-sm text-foreground-muted">
				Add a passkey for fast, secure sign-in
			</p>
		</div>
	</div>

	<!-- Card -->
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-lg space-y-6">
		{#if success}
			<!-- Success state -->
			<div class="text-center py-8 space-y-4" role="status" aria-live="polite">
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400" aria-hidden="true">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
						<path d="m9 11 3 3L22 4"/>
					</svg>
				</div>
				<div>
					<h2 class="text-lg font-medium text-foreground">Passkey created!</h2>
					<p class="text-sm text-foreground-muted mt-1">Redirecting...</p>
				</div>
			</div>
		{:else}
			<!-- Explanation -->
			<div class="space-y-4">
				<p class="text-sm text-foreground-muted">
					Passkeys use your device's biometrics (fingerprint, face) or security key
					to sign you in securely — no passwords needed.
				</p>

				<div class="grid gap-3">
					<div class="flex items-start gap-3">
						<div class="p-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 mt-0.5">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400" aria-hidden="true">
								<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">Phishing-resistant</p>
							<p class="text-xs text-foreground-muted">
								Passkeys can't be stolen or reused on fake sites
							</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="p-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 mt-0.5">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600 dark:text-emerald-400" aria-hidden="true">
								<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">One-tap sign in</p>
							<p class="text-xs text-foreground-muted">
								Just use your fingerprint or face to log in instantly
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Error -->
			{#if error}
				<div role="alert" class="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true">
						<circle cx="12" cy="12" r="10"/>
						<line x1="12" x2="12" y1="8" y2="12"/>
						<line x1="12" x2="12.01" y1="16" y2="16"/>
					</svg>
					<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="space-y-3">
				<button
					onclick={registerPasskey}
					disabled={isRegistering}
					class="btn-primary w-full flex items-center justify-center gap-2"
				>
					{#if isRegistering}
						<div class="spinner"></div>
						Creating passkey...
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
						Create Passkey
					{/if}
				</button>

				<button
					onclick={skipSetup}
					disabled={isRegistering}
					class="btn-secondary w-full flex items-center justify-center gap-2 text-foreground-muted"
				>
					Skip for now
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M5 12h14"/>
						<path d="m12 5 7 7-7 7"/>
					</svg>
				</button>
			</div>

			<p class="text-xs text-foreground-subtle text-center">
				You can always add a passkey later in your account settings.
			</p>
		{/if}
	</div>
</div>
