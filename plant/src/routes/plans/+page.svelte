<script lang="ts">
	import { Check } from 'lucide-svelte';

	let { data } = $props();

	// Billing cycle toggle
	let billingCycle = $state<'monthly' | 'yearly'>('monthly');

	// Selected plan
	let selectedPlan = $state<string | null>(null);

	// Plan definitions
	const plans = [
		{
			id: 'seedling',
			name: 'Seedling',
			description: 'Perfect for getting started',
			monthlyPrice: 8,
			yearlyPrice: 81.60,
			features: [
				'50 posts',
				'1 GB storage',
				'3 themes',
				'Meadow access',
				'RSS feed',
				'No ads ever'
			],
			highlight: null
		},
		{
			id: 'sapling',
			name: 'Sapling',
			description: 'For growing blogs',
			monthlyPrice: 12,
			yearlyPrice: 122.40,
			features: [
				'250 posts',
				'5 GB storage',
				'10 themes',
				'Email forwarding',
				'Priority email support',
				'Everything in Seedling'
			],
			highlight: 'popular'
		},
		{
			id: 'oak',
			name: 'Oak',
			description: 'Full creative control',
			monthlyPrice: 25,
			yearlyPrice: 255,
			features: [
				'Unlimited posts',
				'20 GB storage',
				'Theme customizer',
				'Bring your own domain',
				'Full email suite',
				'Priority support'
			],
			highlight: 'value'
		},
		{
			id: 'evergreen',
			name: 'Evergreen',
			description: 'The complete package',
			monthlyPrice: 35,
			yearlyPrice: 357,
			features: [
				'Unlimited everything',
				'100 GB storage',
				'Custom fonts',
				'Domain included',
				'Domain search & registration',
				'8 hrs/mo dedicated support'
			],
			highlight: null
		}
	];

	// Calculate displayed price
	function getPrice(plan: (typeof plans)[0]) {
		if (billingCycle === 'yearly') {
			return (plan.yearlyPrice / 12).toFixed(2);
		}
		return plan.monthlyPrice;
	}

	// Calculate savings for yearly
	function getYearlySavings(plan: (typeof plans)[0]) {
		const monthlyCost = plan.monthlyPrice * 12;
		const savings = monthlyCost - plan.yearlyPrice;
		return savings.toFixed(0);
	}
</script>

<div class="animate-fade-in">
	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">Choose your plan</h1>
		<p class="text-foreground-muted">
			All plans include a 14-day free trial. Cancel anytime.
		</p>
	</div>

	<!-- Billing toggle -->
	<div class="flex justify-center mb-8">
		<div class="inline-flex items-center gap-3 p-1 rounded-lg bg-surface border border-default">
			<button
				onclick={() => (billingCycle = 'monthly')}
				class="px-4 py-2 rounded-md text-sm font-medium transition-all"
				class:bg-surface-elevated={billingCycle === 'monthly'}
				class:text-foreground={billingCycle === 'monthly'}
				class:text-foreground-muted={billingCycle !== 'monthly'}
			>
				Monthly
			</button>
			<button
				onclick={() => (billingCycle = 'yearly')}
				class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
				class:bg-surface-elevated={billingCycle === 'yearly'}
				class:text-foreground={billingCycle === 'yearly'}
				class:text-foreground-muted={billingCycle !== 'yearly'}
			>
				Yearly
				<span class="text-xs px-1.5 py-0.5 rounded bg-primary text-white">Save 15%</span>
			</button>
		</div>
	</div>

	<!-- Plans grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
		{#each plans as plan}
			<button
				onclick={() => (selectedPlan = plan.id)}
				class="plan-card text-left relative"
				class:selected={selectedPlan === plan.id}
				class:popular={plan.highlight === 'popular'}
			>
				{#if plan.highlight === 'popular'}
					<span
						class="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white"
					>
						Most Popular
					</span>
				{:else if plan.highlight === 'value'}
					<span
						class="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-grove-700 text-white"
					>
						Best Value
					</span>
				{/if}

				<div class="flex justify-between items-start mb-4">
					<div>
						<h3 class="text-lg font-medium text-foreground">{plan.name}</h3>
						<p class="text-sm text-foreground-muted">{plan.description}</p>
					</div>
					<div
						class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
						class:border-primary={selectedPlan === plan.id}
						class:bg-primary={selectedPlan === plan.id}
						class:border-default={selectedPlan !== plan.id}
					>
						{#if selectedPlan === plan.id}
							<Check size={12} class="text-white" />
						{/if}
					</div>
				</div>

				<div class="mb-4">
					<span class="text-3xl font-semibold text-foreground">${getPrice(plan)}</span>
					<span class="text-foreground-muted">/mo</span>
					{#if billingCycle === 'yearly'}
						<p class="text-xs text-success mt-1">
							Save ${getYearlySavings(plan)}/year
						</p>
					{/if}
				</div>

				<ul class="space-y-2">
					{#each plan.features as feature}
						<li class="flex items-center gap-2 text-sm text-foreground-muted">
							<Check size={16} class="text-primary flex-shrink-0" />
							<span>{feature}</span>
						</li>
					{/each}
				</ul>
			</button>
		{/each}
	</div>

	<!-- Free tier note -->
	<div class="text-center mt-6">
		<p class="text-sm text-foreground-subtle">
			Just want to hang out in Meadow?
			<span class="text-foreground-muted">Free social-only tier coming soon.</span>
		</p>
	</div>

	<!-- Continue button -->
	<form method="POST" class="max-w-md mx-auto mt-8">
		<input type="hidden" name="plan" value={selectedPlan || ''} />
		<input type="hidden" name="billingCycle" value={billingCycle} />
		<button type="submit" disabled={!selectedPlan} class="btn-primary w-full">
			Continue to Payment
		</button>
		<p class="text-xs text-foreground-subtle text-center mt-3">
			You won't be charged until after your 14-day trial.
		</p>
	</form>

	<!-- Comparison link -->
	<div class="text-center mt-6">
		<a href="https://grove.place/pricing" target="_blank" class="text-sm text-primary hover:underline">
			View full plan comparison →
		</a>
	</div>
</div>
