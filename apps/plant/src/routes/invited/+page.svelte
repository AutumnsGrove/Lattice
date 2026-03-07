<script lang="ts">
	/**
	 * Beta Invite Landing Page
	 *
	 * Where invitees land after clicking the link in their invite email.
	 * Shows a warm welcome, the invite details, and a pre-filled
	 * sign-in form so they can get started with one click.
	 */

	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Sparkles, Mail, Check, Loader2, Heart, Leaf } from "@autumnsgrove/lattice/ui/icons";

	let { data } = $props();

	// UI state: 'ready' | 'sending' | 'sent' | 'error'
	let mode = $state<"ready" | "sending" | "sent" | "error">("ready");
	let errorMessage = $state<string | null>(null);

	// Show expired notification if redirected back from an expired magic link
	// svelte-ignore state_referenced_locally
	let showExpiredNotice = $state(data.expired ?? false);

	/**
	 * Capitalize a tier name for display
	 */
	function displayTier(tier: string): string {
		return tier.charAt(0).toUpperCase() + tier.slice(1);
	}

	/**
	 * Send the magic link to the invitee's email
	 */
	async function sendMagicLink() {
		mode = "sending";
		errorMessage = null;
		showExpiredNotice = false;

		try {
			const response = await fetch("/api/auth/magic-link", {
				// csrf-ok: unauthenticated invite flow
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: data.inviteEmail, inviteToken: data.token }),
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(result.message || "Failed to send magic link");
			}

			mode = "sent";
		} catch (err) {
			mode = "error";
			errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
		}
	}
</script>

<div class="space-y-8 animate-fade-in">
	<!-- Welcome header -->
	<section class="text-center space-y-4">
		<div
			class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning-bg/20 mb-2"
		>
			<Sparkles size={40} class="text-warning" aria-hidden="true" />
		</div>

		{#if data.inviteType === "beta"}
			<h1 class="text-2xl md:text-3xl font-medium text-foreground">Welcome to the Grove beta</h1>
			<p class="text-foreground-muted max-w-md mx-auto leading-relaxed">
				We're building a quiet corner of the internet for your words to grow. And we'd love for you
				to be one of the first to try it.
			</p>
		{:else}
			<h1 class="text-2xl md:text-3xl font-medium text-foreground">You've been invited to Grove</h1>
			<p class="text-foreground-muted max-w-md mx-auto leading-relaxed">
				Someone believes you deserve your own space online — a place where your words can grow
				without algorithms, ads, or tracking.
			</p>
		{/if}
	</section>

	<!-- Expired/error magic link notice -->
	{#if showExpiredNotice}
		<div
			class="max-w-md mx-auto p-4 rounded-xl bg-warning-bg/80 dark:bg-warning-bg/20 border border-warning/50 dark:border-warning/30 backdrop-blur-sm"
			role="alert"
		>
			<p class="text-sm text-warning dark:text-warning text-center">
				Your sign-in link didn't work — no worries! Click below to get a fresh one.
			</p>
			{#if data.errorCode}
				<p class="text-xs text-warning/70 dark:text-warning/50 text-center mt-2 font-mono">
					Error: {data.errorCode}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Invite details card -->
	<GlassCard variant="frosted" class="max-w-md mx-auto">
		<!-- Tier badge -->
		<div class="text-center mb-6">
			<div
				class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-bg/10 border border-warning/20 mb-4"
			>
				<Leaf size={16} class="text-warning" aria-hidden="true" />
				<span class="text-sm font-medium text-warning">
					{#if data.inviteType === "beta"}
						Beta Tester — {displayTier(data.inviteTier)} Plan
					{:else}
						Complimentary {displayTier(data.inviteTier)} Account
					{/if}
				</span>
			</div>

			{#if data.customMessage}
				<div
					class="p-4 rounded-lg bg-white/50 dark:bg-bark-800/30 border border-white/20 dark:border-bark-700/20 mb-4"
				>
					<p class="text-foreground-muted italic">
						"{data.customMessage}"
					</p>
				</div>
			{/if}

			<p class="text-foreground-muted text-sm">
				A free <span class="font-medium text-primary">{displayTier(data.inviteTier)}</span> plan is waiting
				for you.
			</p>
		</div>

		<!-- Magic link form -->
		<div class="border-t border-white/20 dark:border-bark-700/20 pt-6">
			{#if mode === "ready" || mode === "error"}
				<div class="space-y-4">
					<div>
						<p class="block text-sm font-medium text-foreground mb-2">Your email</p>
						<div
							class="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/60 dark:bg-bark-800/40 border border-border/50 dark:border-bark-700/40"
						>
							<Mail size={16} class="text-foreground-subtle flex-shrink-0" aria-hidden="true" />
							<span class="text-foreground">{data.inviteEmail}</span>
						</div>
					</div>

					{#if errorMessage}
						<p class="text-sm text-error" role="alert">
							{errorMessage}
						</p>
					{/if}

					<button
						type="button"
						onclick={sendMagicLink}
						class="btn-primary w-full justify-center text-base py-3 min-h-[44px]"
						aria-label="Send a sign-in link to {data.inviteEmail}"
					>
						<Mail size={18} aria-hidden="true" />
						Send me a sign-in link
					</button>

					<p class="text-xs text-foreground-subtle text-center">
						We'll send a magic link to this email. Click it to sign in — no password needed.
					</p>
				</div>
			{:else if mode === "sending"}
				<div class="text-center py-4 space-y-3" role="status" aria-live="polite">
					<Loader2 size={24} class="animate-spin mx-auto text-primary" aria-hidden="true" />
					<p class="text-foreground-muted">Sending your sign-in link...</p>
				</div>
			{:else if mode === "sent"}
				<div class="text-center py-4 space-y-4" role="status" aria-live="polite">
					<div
						class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-bg/50 dark:bg-success-bg/30"
					>
						<Check size={28} class="text-success" aria-hidden="true" />
					</div>

					<div>
						<p class="font-medium text-foreground">Check your email!</p>
						<p class="text-sm text-foreground-muted mt-1">
							We sent a sign-in link to <span class="font-medium text-foreground"
								>{data.inviteEmail}</span
							>
						</p>
					</div>

					<p class="text-xs text-foreground-subtle">
						Click the link in the email to continue setting up your blog.
					</p>

					<button
						type="button"
						onclick={() => {
							mode = "ready";
							errorMessage = null;
						}}
						class="text-sm text-primary hover:underline min-h-[44px] px-4 inline-flex items-center"
						aria-label="Send the sign-in link again"
					>
						Didn't get it? Send again
					</button>
				</div>
			{/if}
		</div>
	</GlassCard>

	<!-- What's next -->
	<section class="text-center">
		<p class="text-sm text-foreground-subtle flex items-center justify-center gap-1.5">
			<Heart size={14} class="text-accent" aria-hidden="true" />
			{#if data.inviteType === "beta"}
				Thank you for helping us grow
			{:else}
				A gift from someone who believes in you
			{/if}
		</p>
	</section>
</div>
