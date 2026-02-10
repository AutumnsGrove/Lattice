<script lang="ts">
	/**
	 * GardenStatus
	 *
	 * Overview widget showing garden health and subscription status.
	 * Used in dashboard sidebars and account pages.
	 */

	import {
		Sprout,
		TreeDeciduous,
		Trees,
		Crown,
		Footprints,
		Calendar,
		CreditCard,
		Settings,
		AlertCircle,
		CheckCircle2,
		Clock,
	} from 'lucide-svelte';
	import type { GardenStatusProps } from './types.js';
	import type { TierKey } from '$lib/config/tiers';
	import type { FlourishState } from '../types.js';

	let {
		currentStage = 'free',
		flourishState = 'active' as FlourishState,
		currentPeriodEnd = null,
		pruningScheduled = false,
		paymentBrand = '',
		paymentLast4 = '',
		showDetails = true,
		onTend,
		class: className = '',
	}: GardenStatusProps = $props();

	// Icon mapping — keyed by TierKey
	const iconComponents: Record<TierKey, typeof Sprout> = {
		free: Footprints,
		seedling: Sprout,
		sapling: TreeDeciduous,
		oak: Trees,
		evergreen: Crown,
	};

	// Stage display names
	const stageNames: Record<TierKey, string> = {
		free: 'Wanderer',
		seedling: 'Seedling',
		sapling: 'Sapling',
		oak: 'Oak',
		evergreen: 'Evergreen',
	};

	// State icons
	const stateIcons: Record<FlourishState, typeof CheckCircle2> = {
		active: CheckCircle2,
		past_due: AlertCircle,
		resting: Clock,
		pruned: AlertCircle,
	};

	// State labels and colors
	const stateConfig: Record<FlourishState, { label: string; color: string; bg: string }> = {
		active: { label: 'Flourishing', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
		past_due: { label: 'Past Due', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
		resting: { label: 'Scheduled End', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
		pruned: { label: 'Ended', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
	};

	let IconComponent = $derived(iconComponents[currentStage] || Sprout);
	let StateIcon = $derived(stateIcons[flourishState]);
	let stateInfo = $derived(stateConfig[flourishState]);

	// Format period end date
	let formattedPeriodEnd = $derived.by(() => {
		if (!currentPeriodEnd) return null;
		return new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	});
</script>

<div
	class="
    p-5 rounded-xl
    bg-white/60 dark:bg-grove-950/40 backdrop-blur-sm
    border border-white/40 dark:border-grove-800/30
    {className}
  "
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-4">
		<div class="flex items-center gap-3">
			<div
				class="w-12 h-12 rounded-full bg-grove-100/50 dark:bg-grove-900/50 flex items-center justify-center"
			>
				<IconComponent class="w-6 h-6 text-grove-600 dark:text-grove-400" />
			</div>
			<div>
				<h3 class="font-serif text-lg text-foreground">Garden Status</h3>
				<p class="text-sm text-foreground-muted">{stageNames[currentStage]}</p>
			</div>
		</div>

		<button
			type="button"
			class="p-2 rounded-lg hover:bg-grove-100 dark:hover:bg-grove-800 transition-colors"
			onclick={() => onTend?.()}
			aria-label="Open garden shed"
		>
			<Settings class="w-4 h-4 text-foreground-muted" />
		</button>
	</div>

	<!-- Flourish state -->
	<div
		class="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 {stateInfo.bg}"
	>
		<StateIcon class="w-4 h-4 {stateInfo.color}" />
		<span class="text-sm font-medium {stateInfo.color}">{stateInfo.label}</span>
		{#if pruningScheduled}
			<span class="text-xs text-foreground-muted">(ends {formattedPeriodEnd})</span>
		{/if}
	</div>

	<!-- Details -->
	{#if showDetails}
		<div class="space-y-3">
			<!-- Billing period -->
			{#if currentPeriodEnd && flourishState !== 'pruned'}
				<div class="flex items-center gap-3 text-sm">
					<Calendar class="w-4 h-4 text-foreground-muted" />
					<span class="text-foreground-muted">Next billing period:</span>
					<span class="font-medium text-foreground">{formattedPeriodEnd}</span>
				</div>
			{/if}

			<!-- Payment method -->
			{#if paymentLast4 && flourishState !== 'pruned'}
				<div class="flex items-center gap-3 text-sm">
					<CreditCard class="w-4 h-4 text-foreground-muted" />
					<span class="text-foreground-muted">Payment:</span>
					<span class="font-medium text-foreground"
						>{paymentBrand} •••• {paymentLast4}</span
					>
				</div>
			{/if}

			<!-- Wanderer special case -->
			{#if currentStage === 'free' && flourishState === 'active'}
				<div class="mt-2 p-3 rounded-lg bg-grove-50 dark:bg-grove-900/30 text-sm">
					<p class="text-foreground-muted">
						Free tier. <button
							type="button"
							class="text-accent hover:underline"
							onclick={() => onTend?.()}
						>
							Cultivate to Seedling
						</button>
						to unlock more features.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
