<script lang="ts">
	/**
	 * EmailButton - Magic link email login button/form
	 *
	 * Handles the complete magic link authentication flow:
	 * - Shows email input when clicked
	 * - Sends magic link via GroveAuth
	 * - Shows "check your email" confirmation
	 *
	 * After clicking the magic link, users are redirected to a callback
	 * where they can set up a passkey for future passwordless sign-in.
	 *
	 * @example
	 * ```svelte
	 * <EmailButton returnTo="/profile" />
	 * ```
	 */

	import { browser } from "$app/environment";
	import type { BaseGraftProps } from "../types.js";
	import { GROVEAUTH_URLS } from "./config.js";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";

	interface EmailButtonProps extends BaseGraftProps {
		/** URL to redirect after successful authentication */
		returnTo?: string;
		/** Callback fired when magic link is sent successfully */
		onSuccess?: (email: string) => void;
		/** Callback fired on error */
		onError?: (error: string) => void;
		/** Button size variant */
		size?: "sm" | "md" | "lg";
	}

	let {
		returnTo = "/arbor",
		onSuccess,
		onError,
		size = "lg",
		class: className = "",
	}: EmailButtonProps = $props();

	// UI state: 'button' | 'input' | 'sending' | 'sent'
	let mode = $state<"button" | "input" | "sending" | "sent">("button");
	let email = $state("");
	let errorMessage = $state<string | null>(null);

	/**
	 * Basic email validation
	 */
	function isValidEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	/**
	 * Expand to show email input
	 */
	function showInput() {
		mode = "input";
		errorMessage = null;
	}

	/**
	 * Go back to button state
	 */
	function goBack() {
		mode = "button";
		errorMessage = null;
	}

	/**
	 * Send magic link email
	 */
	async function sendMagicLink() {
		if (!browser) return;

		const trimmedEmail = email.trim().toLowerCase();

		// Validate email
		if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
			errorMessage = "Please enter a valid email address";
			return;
		}

		mode = "sending";
		errorMessage = null;

		try {
			// Build callback URL
			const origin = window.location.origin;
			const callbackURL = `${origin}/auth/magic-link/callback?returnTo=${encodeURIComponent(returnTo)}`;

			// csrf-ok: cross-origin POST to GroveAuth, not an internal API
			const response = await fetch(GROVEAUTH_URLS.magicLink, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: trimmedEmail,
					callbackURL,
				}),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(data.message || `Failed to send magic link (${response.status})`);
			}

			// Success!
			mode = "sent";
			onSuccess?.(trimmedEmail);
		} catch (err) {
			mode = "input";
			const message = err instanceof Error ? err.message : "Failed to send magic link";
			errorMessage = message;
			onError?.(message);
		}
	}

	/**
	 * Handle form submission
	 */
	function handleSubmit(e: Event) {
		e.preventDefault();
		sendMagicLink();
	}

	/**
	 * Reset to try a different email
	 */
	function tryDifferentEmail() {
		mode = "input";
		email = "";
		errorMessage = null;
	}
</script>

<div class="email-button-wrapper {className}">
	{#if mode === "button"}
		<!-- Initial button state -->
		<GlassButton
			variant="default"
			{size}
			onclick={showInput}
			class="w-full justify-start gap-3"
		>
			<ProviderIcon provider="email" size={20} />
			<span>Continue with Email</span>
		</GlassButton>

	{:else if mode === "input" || mode === "sending"}
		<!-- Email input state -->
		<form onsubmit={handleSubmit} class="space-y-3">
			<div class="relative">
				<input
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					disabled={mode === "sending"}
					class="w-full px-4 py-3 rounded-xl
						bg-white/80 dark:bg-bark-800/40 backdrop-blur-md
						border border-bark-200/50 dark:border-bark-700/40
						text-foreground placeholder:text-muted-foreground
						focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
						disabled:opacity-50 disabled:cursor-not-allowed
						transition-colors"
					aria-label="Email address"
					aria-invalid={errorMessage ? "true" : undefined}
				/>
			</div>

			{#if errorMessage}
				<p class="text-sm text-red-600 dark:text-red-400" role="alert">
					{errorMessage}
				</p>
			{/if}

			<GlassButton
				variant="accent"
				{size}
				type="submit"
				disabled={mode === "sending"}
				class="w-full justify-center gap-2"
			>
				{#if mode === "sending"}
					<!-- Loading spinner -->
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span>Sending...</span>
				{:else}
					<ProviderIcon provider="email" size={18} />
					<span>Send Magic Link</span>
				{/if}
			</GlassButton>

			<button
				type="button"
				onclick={goBack}
				disabled={mode === "sending"}
				class="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
			>
				← Back
			</button>
		</form>

	{:else if mode === "sent"}
		<!-- Success state -->
		<div class="text-center space-y-4 py-2">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-grove-100/50 dark:bg-grove-900/30">
				<!-- Checkmark icon -->
				<svg
					class="w-6 h-6 text-grove-600 dark:text-grove-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<div>
				<p class="font-medium text-foreground">Check your email!</p>
				<p class="text-sm text-muted-foreground mt-1">
					We sent a link to <span class="font-medium text-foreground">{email}</span>
				</p>
			</div>

			<button
				type="button"
				onclick={tryDifferentEmail}
				class="text-sm text-primary hover:underline"
			>
				Use a different email
			</button>
		</div>
	{/if}
</div>
