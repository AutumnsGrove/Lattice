<script lang="ts">
	import { onMount } from 'svelte';
	import { Loader2, CreditCard, ShieldCheck } from 'lucide-svelte';

	let { data } = $props();

	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Plan info for display
	const planNames: Record<string, string> = {
		seedling: 'Seedling',
		sapling: 'Sapling',
		oak: 'Oak',
		evergreen: 'Evergreen'
	};

	const planPrices: Record<string, { monthly: number; yearly: number }> = {
		seedling: { monthly: 8, yearly: 81.6 },
		sapling: { monthly: 12, yearly: 122.4 },
		oak: { monthly: 25, yearly: 255 },
		evergreen: { monthly: 35, yearly: 357 }
	};

	$: planName = data.onboarding?.planSelected
		? planNames[data.onboarding.planSelected] || data.onboarding.planSelected
		: '';
	$: billingCycle = data.onboarding?.billingCycle || 'monthly';
	$: price = data.onboarding?.planSelected
		? billingCycle === 'yearly'
			? (planPrices[data.onboarding.planSelected]?.yearly / 12).toFixed(2)
			: planPrices[data.onboarding.planSelected]?.monthly
		: 0;

	onMount(async () => {
		// Create checkout session and redirect to Stripe
		try {
			const res = await fetch('/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await res.json();

			if (result.url) {
				// Redirect to Stripe Checkout
				window.location.href = result.url;
			} else if (result.error) {
				error = result.error;
				isLoading = false;
			}
		} catch (err) {
			error = 'Unable to initialize checkout. Please try again.';
			isLoading = false;
		}
	});
</script>

<div class="animate-fade-in">
	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">Complete your purchase</h1>
		<p class="text-foreground-muted">You're almost ready to start your blog!</p>
	</div>

	<!-- Order summary -->
	<div class="card max-w-md mx-auto mb-8">
		<h2 class="font-medium text-foreground mb-4">Order Summary</h2>

		<div class="flex justify-between items-center py-3 border-b border-default">
			<div>
				<p class="font-medium text-foreground">{planName} Plan</p>
				<p class="text-sm text-foreground-muted">
					{billingCycle === 'yearly' ? 'Billed yearly' : 'Billed monthly'}
				</p>
			</div>
			<div class="text-right">
				<p class="font-medium text-foreground">${price}/mo</p>
				{#if billingCycle === 'yearly'}
					<p class="text-xs text-success">Save 15%</p>
				{/if}
			</div>
		</div>

		<div class="flex justify-between items-center py-3 border-b border-default">
			<p class="text-foreground-muted">14-day free trial</p>
			<p class="text-success font-medium">Included</p>
		</div>

		<div class="flex justify-between items-center py-3">
			<p class="font-medium text-foreground">Due today</p>
			<p class="text-2xl font-semibold text-foreground">$0.00</p>
		</div>

		<p class="text-xs text-foreground-subtle mt-2">
			You won't be charged until your trial ends. Cancel anytime.
		</p>
	</div>

	<!-- Loading state / Error -->
	{#if isLoading}
		<div class="text-center">
			<div class="inline-flex items-center gap-3 px-6 py-4 rounded-lg bg-surface border border-default">
				<Loader2 size={24} class="animate-spin text-primary" />
				<span class="text-foreground">Redirecting to secure checkout...</span>
			</div>
		</div>
	{:else if error}
		<div class="max-w-md mx-auto">
			<div class="p-4 rounded-lg bg-error-bg border border-error text-error text-sm mb-4">
				{error}
			</div>
			<a href="/plans" class="btn-secondary w-full text-center block">
				← Back to Plans
			</a>
		</div>
	{/if}

	<!-- Security badges -->
	<div class="flex items-center justify-center gap-6 mt-8 text-foreground-subtle">
		<div class="flex items-center gap-2 text-sm">
			<ShieldCheck size={18} />
			<span>Secure checkout</span>
		</div>
		<div class="flex items-center gap-2 text-sm">
			<CreditCard size={18} />
			<span>Powered by Stripe</span>
		</div>
	</div>
</div>
