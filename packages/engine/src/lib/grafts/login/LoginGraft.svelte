<script lang="ts">
	/**
	 * LoginGraft - Unified login component for all Grove properties
	 *
	 * Main orchestrator component that provides consistent login UI.
	 * Uses Better Auth for OAuth flows - POSTs JSON to GroveAuth's
	 * Better Auth endpoints which handle the full OAuth dance.
	 *
	 * IMPORTANT: Better Auth's /api/auth/sign-in/social endpoint requires:
	 * - POST method
	 * - Content-Type: application/json
	 * - JSON body with { provider, callbackURL }
	 *
	 * Supports three variants:
	 * - default: Card with providers and optional header/footer
	 * - compact: Minimal button only (for embedding)
	 * - fullpage: Centered card with logo and branding
	 *
	 * @example Default variant with header
	 * ```svelte
	 * <LoginGraft providers={['google']} returnTo="/dashboard">
	 *   {#snippet header()}
	 *     <h1 class="text-2xl font-bold">Welcome back, Wanderer</h1>
	 *   {/snippet}
	 * </LoginGraft>
	 * ```
	 *
	 * @example Compact variant for embedding
	 * ```svelte
	 * <LoginGraft variant="compact" providers={['google']} />
	 * ```
	 *
	 * @example Fullpage variant with logo
	 * ```svelte
	 * <LoginGraft variant="fullpage" providers={['google']}>
	 *   {#snippet logo()}
	 *     <GroveLogo class="w-16 h-16" />
	 *   {/snippet}
	 * </LoginGraft>
	 * ```
	 */

	import { browser } from "$app/environment";
	import type { LoginGraftProps, AuthProvider } from "./types.js";
	import {
		DEFAULT_PROVIDERS,
		GROVEAUTH_URLS,
		isProviderAvailable,
		getProviderName,
	} from "./config.js";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import GroveSwap from "$lib/ui/components/ui/groveterm/GroveSwap.svelte";
	import PasskeyButton from "./PasskeyButton.svelte";
	import EmailButton from "./EmailButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";

	let {
		providers = DEFAULT_PROVIDERS,
		returnTo = "/arbor",
		clientId,
		variant = "default",
		header,
		footer,
		logo,
		class: className = "",
	}: LoginGraftProps = $props();

	// Filter to only available providers
	const availableProviders = $derived(
		providers.filter((p) => isProviderAvailable(p))
	);

	// Loading state for buttons
	let loadingProvider = $state<AuthProvider | null>(null);
	let error = $state<string | null>(null);

	/**
	 * Get the callback URL for OAuth redirects.
	 * This URL is where Better Auth will redirect after OAuth completes.
	 */
	function getCallbackUrl(): string {
		const origin = browser ? window.location.origin : "";
		return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
	}

	/**
	 * Initiate social sign-in via Better Auth.
	 * Makes a JSON POST request and redirects to the OAuth provider.
	 */
	async function signInWithProvider(provider: AuthProvider) {
		if (!browser || loadingProvider) return;

		loadingProvider = provider;
		error = null;

		try {
			const response = await fetch(GROVEAUTH_URLS.socialSignIn, { // csrf-ok: cross-origin POST to GroveAuth
				method: "POST",
				credentials: "include",  // Required for cross-origin cookies
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					provider,
					callbackURL: getCallbackUrl(),
				}),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(data.message || `Sign-in failed (${response.status})`);
			}

			const data = (await response.json()) as { url?: string };

			// Better Auth returns { url: "https://accounts.google.com/..." }
			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error("No redirect URL returned from auth server");
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Sign-in failed";
			loadingProvider = null;
		}
	}

	// For compact variant, use first available provider
	const primaryProvider = $derived(availableProviders[0]);
</script>

{#if variant === "compact"}
	<!-- Compact: Single button only -->
	{#if primaryProvider}
		{#if primaryProvider === "passkey"}
			<!-- Passkey uses its own button with WebAuthn ceremony -->
			<PasskeyButton {returnTo} size="md" class={className} />
		{:else if primaryProvider === "email"}
			<!-- Email uses its own button with magic link form -->
			<EmailButton {returnTo} size="md" class={className} />
		{:else}
			<GlassButton
				variant="default"
				size="md"
				type="button"
				class={className}
				disabled={loadingProvider !== null}
				onclick={() => signInWithProvider(primaryProvider)}
			>
				<ProviderIcon provider={primaryProvider} size={18} />
				<span>
					{#if loadingProvider === primaryProvider}
						Redirecting...
					{:else}
						Sign in with {getProviderName(primaryProvider)}
					{/if}
				</span>
			</GlassButton>
		{/if}
	{/if}
{:else if variant === "fullpage"}
	<!-- Fullpage: Centered layout with logo and branding -->
	<div class="min-h-[60vh] flex flex-col items-center justify-center px-4 {className}">
		<!-- Logo area -->
		{#if logo}
			<div class="mb-8">
				{@render logo()}
			</div>
		{/if}

		<!-- Login card -->
		<GlassCard variant="default" class="w-full max-w-sm">
			{#snippet children()}
				<!-- Header slot or default -->
				<div class="mb-6 text-center">
					{#if header}
						{@render header()}
					{:else}
						<h1 class="text-2xl font-semibold text-foreground">
							Welcome back<GroveSwap term="wanderer" standard="">, Wanderer</GroveSwap>
						</h1>
						<p class="mt-2 text-sm text-muted-foreground">
							Sign in to continue to Grove
						</p>
					{/if}
				</div>

				<!-- Error message -->
				{#if error}
					<div class="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
						{error}
					</div>
				{/if}

				<!-- Provider buttons -->
				{#if availableProviders.length > 0}
					<div class="space-y-3">
						{#each availableProviders as provider}
							{#if provider === "passkey"}
								<!-- Passkey uses its own button with WebAuthn ceremony -->
								<PasskeyButton {returnTo} />
							{:else if provider === "email"}
								<!-- Email uses its own button with magic link form -->
								<EmailButton {returnTo} />
							{:else}
								<GlassButton
									variant="default"
									size="lg"
									type="button"
									class="w-full justify-start gap-3"
									disabled={loadingProvider !== null}
									onclick={() => signInWithProvider(provider)}
								>
									<ProviderIcon {provider} size={20} />
									<span>
										{#if loadingProvider === provider}
											Redirecting...
										{:else}
											Continue with {getProviderName(provider)}
										{/if}
									</span>
								</GlassButton>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="text-center text-muted-foreground">
						No login providers available
					</p>
				{/if}

				<!-- Footer slot or default -->
				<div class="mt-6 text-center text-sm text-muted-foreground">
					{#if footer}
						{@render footer()}
					{:else}
						<p>Grove • Better Auth</p>
					{/if}
				</div>
			{/snippet}
		</GlassCard>
	</div>
{:else}
	<!-- Default: Card with providers -->
	<GlassCard variant="default" class="max-w-sm mx-auto {className}">
		{#snippet children()}
			<!-- Header slot -->
			{#if header}
				<div class="mb-6 text-center">
					{@render header()}
				</div>
			{/if}

			<!-- Error message -->
			{#if error}
				<div class="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
					{error}
				</div>
			{/if}

			<!-- Provider buttons -->
			{#if availableProviders.length > 0}
				<div class="space-y-3">
					{#each availableProviders as provider}
						{#if provider === "passkey"}
							<!-- Passkey uses its own button with WebAuthn ceremony -->
							<PasskeyButton {returnTo} />
						{:else if provider === "email"}
							<!-- Email uses its own button with magic link form -->
							<EmailButton {returnTo} />
						{:else}
							<GlassButton
								variant="default"
								size="lg"
								type="button"
								class="w-full justify-start gap-3"
								disabled={loadingProvider !== null}
								onclick={() => signInWithProvider(provider)}
							>
								<ProviderIcon {provider} size={20} />
								<span>
									{#if loadingProvider === provider}
										Redirecting...
									{:else}
										Continue with {getProviderName(provider)}
									{/if}
								</span>
							</GlassButton>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-center text-muted-foreground">
					No login providers available
				</p>
			{/if}

			<!-- Footer slot -->
			{#if footer}
				<div class="mt-6 text-center text-sm text-muted-foreground">
					{@render footer()}
				</div>
			{/if}
		{/snippet}
	</GlassCard>
{/if}
