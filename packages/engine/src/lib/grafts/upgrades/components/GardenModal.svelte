<script lang="ts">
	/**
	 * GardenModal
	 *
	 * Modal dialog for comparing growth stages and initiating cultivation.
	 */

	import { X, Sprout, RefreshCw, Settings } from 'lucide-svelte';
	import type { GardenModalProps } from './types.js';
	import type { TierKey } from '$lib/config/tiers';
	import { transformAllTiers, type PricingTier, type BillingPeriod } from '$lib/grafts/pricing';
	import GrowthCard from './GrowthCard.svelte';
	import PricingToggle from '../../pricing/PricingToggle.svelte';

	let {
		open = false,
		currentStage = 'free',
		flourishState = 'active',
		billingPeriod = 'monthly' as BillingPeriod,
		availableStages = ['seedling', 'sapling', 'oak', 'evergreen'],
		onCultivate,
		onTend,
		onClose,
	}: GardenModalProps = $props();

	// Transform tiers for display
	const tiers = transformAllTiers();

	// Filter to available stages above current
	let displayStages = $derived(
		tiers.filter(
			(t) =>
				availableStages.includes(t.key) &&
				['seedling', 'sapling', 'oak', 'evergreen'].includes(t.key),
		),
	);

	// Get current stage index
	const stageOrder: TierKey[] = ['free', 'seedling', 'sapling', 'oak', 'evergreen'];
	let currentIndex = $derived(stageOrder.indexOf(currentStage));

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose?.();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose?.();
		}
	}

	// Cultivate handler
	function handleCultivate(stage: TierKey) {
		onCultivate?.(stage, billingPeriod);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="garden-modal-title"
	>
		<div
			class="
        relative w-full max-w-4xl max-h-[90vh] overflow-y-auto
        bg-white/90 dark:bg-grove-950/90 backdrop-blur-xl
        rounded-2xl shadow-2xl border border-white/40 dark:border-grove-800/30
      "
		>
			<!-- Close button -->
			<button
				type="button"
				class="absolute top-4 right-4 p-2 rounded-full hover:bg-grove-100 dark:hover:bg-grove-800 transition-colors"
				onclick={() => onClose?.()}
				aria-label="Close garden modal"
			>
				<X class="w-5 h-5 text-foreground-muted" />
			</button>

			<!-- Header -->
			<div class="p-6 border-b border-grove-200 dark:border-grove-800">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
						<Sprout class="w-5 h-5 text-accent" />
					</div>
					<div>
						<h2 id="garden-modal-title" class="text-xl font-serif text-foreground">
							Cultivate Your Grove
						</h2>
						<p class="text-sm text-foreground-muted">
							Help your grove flourish to the next stage
						</p>
					</div>
				</div>

				<!-- Current status badge -->
				<div class="flex items-center gap-2 mt-4">
					<span class="text-sm text-foreground-muted">Current stage:</span>
					<span
						class="px-3 py-1 rounded-full text-sm font-medium bg-grove-100 dark:bg-grove-800 text-foreground"
					>
						{currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
					</span>
					{#if flourishState !== 'active'}
						<span
							class="px-3 py-1 rounded-full text-sm font-medium {flourishState === 'past_due'
								? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
								: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}"
						>
							{flourishState.charAt(0).toUpperCase() + flourishState.slice(1).replace('_', ' ')}
						</span>
					{/if}
				</div>
			</div>

			<!-- Billing period toggle -->
			<div class="p-4 border-b border-grove-200 dark:border-grove-800 bg-grove-50/50 dark:bg-grove-900/20">
				<PricingToggle
					{billingPeriod}
					savingsPercent={17}
					onPeriodChange={(period) => {
						/* Handled by parent */
					}}
				/>
			</div>

			<!-- Growth stages -->
			<div class="p-6">
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{#each displayStages as tier}
						{@const stageIndex = stageOrder.indexOf(tier.key)}
						{@const isNext = stageIndex === currentIndex + 1}
						<GrowthCard
							stage={tier.key}
							displayName={tier.name}
							tagline={tier.tagline}
							icon={tier.icon}
							isCurrent={tier.key === currentStage}
							{isNext}
							monthlyPrice={tier.monthlyPrice}
							annualPrice={tier.annualPrice}
							features={tier.featureStrings}
							onCultivate={handleCultivate}
						/>
					{/each}
				</div>
			</div>

			<!-- Footer actions -->
			<div
				class="p-4 border-t border-grove-200 dark:border-grove-800 bg-grove-50/50 dark:bg-grove-900/20 flex items-center justify-between"
			>
				<button
					type="button"
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
					onclick={() => onTend?.()}
				>
					<Settings class="w-4 h-4" />
					Tend Garden
				</button>

				<p class="text-xs text-foreground-faint">
					Need help choosing? <button
						type="button"
						class="text-accent hover:underline"
						onclick={() => {
							/* Open help */
						}}
					>
						Compare stages
					</button>
				</p>
			</div>
		</div>
	</div>
{/if}
