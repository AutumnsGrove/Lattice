<script lang="ts">
	/**
	 * Comped Welcome Page
	 *
	 * A warm welcome page for users with comped invites.
	 * Shows them their special status and creates their tenant directly.
	 */

	import { enhance } from '$app/forms';
	import { Gift, Check, Loader2, Sparkles, ArrowRight, Heart } from 'lucide-svelte';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { TIERS } from '@autumnsgrove/groveengine/config';

	let { data, form } = $props();

	let isClaiming = $state(false);
	let claimError = $state<string | null>(null);

	// Get tier display info
	const tierInfo = $derived(
		data.compedInvite?.tier ? TIERS[data.compedInvite.tier] : null
	);

	// After successful claim, redirect to the new blog
	$effect(() => {
		if (form?.success && form?.subdomain) {
			// Small delay for celebration, then redirect
			setTimeout(() => {
				window.location.href = `https://${form.subdomain}.grove.place/admin?welcome=true`;
			}, 2000);
		}
	});
</script>

<div class="animate-fade-in">
	{#if form?.success && form?.subdomain}
		<!-- Success state -->
		<div class="text-center">
			<GlassCard variant="accent" class="max-w-md mx-auto mb-8">
				<div class="flex flex-col items-center">
					<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-bg mb-6">
						<Check size={40} class="text-success" />
					</div>

					<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
						Your blog is ready!
					</h1>

					<p class="text-foreground-muted mb-2">
						Welcome to Grove, {data.user?.displayName || 'friend'}!
					</p>
					<p class="text-lg text-primary font-medium">
						{form.subdomain}.grove.place
					</p>
				</div>
			</GlassCard>

			<div class="text-center">
				<div class="flex justify-center gap-2 mb-4">
					<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms"></div>
					<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms"></div>
					<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms"></div>
				</div>
				<p class="text-foreground-muted">Redirecting you to your new blog...</p>
			</div>
		</div>
	{:else}
		<!-- Welcome state -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 mb-6 animate-pulse-slow">
				<Gift size={40} class="text-amber-500" />
			</div>

			{#if data.compedInvite?.inviteType === 'beta'}
				<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
					Welcome to the Grove beta!
				</h1>

				<p class="text-foreground-muted max-w-md mx-auto">
					Thank you for being one of our first <GroveSwap term="wanderer" standard="visitors">Wanderers</GroveSwap>. You're helping us grow.
				</p>
			{:else}
				<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
					You've been invited!
				</h1>

				<p class="text-foreground-muted max-w-md mx-auto">
					Someone special has gifted you a complimentary Grove account.
				</p>
			{/if}
		</div>

		<!-- Invitation card -->
		<GlassCard variant="frosted" class="max-w-md mx-auto mb-8">
			<div class="text-center mb-6">
				<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
					<Sparkles size={16} class="text-amber-500" />
					<span class="text-sm font-medium text-amber-600 dark:text-amber-400">
						{#if data.compedInvite?.inviteType === 'beta'}
							Beta Tester Access
						{:else}
							Complimentary {tierInfo?.display.name || 'Premium'} Account
						{/if}
					</span>
				</div>

				{#if data.compedInvite?.customMessage}
					<div class="p-4 rounded-lg bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-slate-700/20 mb-4">
						<p class="text-foreground-muted italic">
							"{data.compedInvite.customMessage}"
						</p>
					</div>
				{/if}

				<p class="text-foreground">
					You're getting the <span class="font-semibold text-primary">{tierInfo?.display.name || data.compedInvite?.tier}</span> plan,
					completely free.
				</p>
			</div>

			<!-- What's included -->
			{#if tierInfo}
				<div class="border-t border-white/20 dark:border-slate-700/20 pt-4 mb-6">
					<h3 class="text-sm font-medium text-foreground mb-3">What's included:</h3>
					<ul class="space-y-2 text-sm text-foreground-muted">
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success flex-shrink-0" />
							<span>Your own blog at <strong>{data.user?.username}.grove.place</strong></span>
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success flex-shrink-0" />
							<span>{tierInfo.limits.storageDisplay} storage</span>
						</li>
						{#if tierInfo.limits.aiWordsPerMonth > 0}
							<li class="flex items-center gap-2">
								<Check size={16} class="text-success flex-shrink-0" />
								<span>{tierInfo.limits.aiWordsPerMonth.toLocaleString()} AI words/month</span>
							</li>
						{/if}
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success flex-shrink-0" />
							<span>All {tierInfo.display.name} features</span>
						</li>
					</ul>
				</div>
			{/if}

			{#if claimError}
				<div class="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm mb-4">
					{claimError}
				</div>
			{/if}

			<form
				method="POST"
				action="?/claim"
				use:enhance={() => {
					isClaiming = true;
					claimError = null;
					return async ({ result }) => {
						isClaiming = false;
						if (result.type === 'failure' || result.type === 'error') {
							claimError = 'Something went wrong. Please try again.';
						}
					};
				}}
			>
				<button
					type="submit"
					disabled={isClaiming}
					class="btn-primary w-full justify-center text-lg py-3"
				>
					{#if isClaiming}
						<Loader2 size={20} class="animate-spin" />
						Creating your blog...
					{:else}
						<Gift size={20} />
						Claim Your Blog
						<ArrowRight size={20} />
					{/if}
				</button>
			</form>
		</GlassCard>

		<!-- Thank you note -->
		<div class="text-center">
			<p class="text-sm text-foreground-subtle flex items-center justify-center gap-1">
				<Heart size={14} class="text-pink-400" />
				{#if data.compedInvite?.inviteType === 'beta'}
					Thank you for helping us grow
				{:else}
					A gift from someone who believes in you
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	@keyframes pulse-slow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.animate-pulse-slow {
		animation: pulse-slow 3s ease-in-out infinite;
	}

	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
</style>
