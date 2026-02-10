<script lang="ts">
	/**
	 * CurrentStageBadge
	 *
	 * Display the user's current growth stage with nurture CTAs.
	 * Used in dashboard headers and account settings.
	 */

	import { Sprout, TreeDeciduous, Trees, Crown, Footprints, Settings, ArrowRight } from 'lucide-svelte';
	import type { CurrentStageBadgeProps } from './types.js';
	import type { TierKey } from '$lib/config/tiers';

	let {
		currentStage = 'free',
		flourishState = 'active',
		showNurture = true,
		showTend = true,
		onNurture,
		onTend,
		class: className = '',
	}: CurrentStageBadgeProps = $props();

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

	let IconComponent = $derived(iconComponents[currentStage] || Sprout);

	// Flourish state colors
	const stateColors = {
		active: 'bg-green-500',
		past_due: 'bg-red-500',
		resting: 'bg-yellow-500',
		pruned: 'bg-gray-500',
	};

	// Flourish state labels
	const stateLabels = {
		active: 'Flourishing',
		past_due: 'Past Due',
		resting: 'Scheduled End',
		pruned: 'Ended',
	};

	// Next stage for nurture
	const nextStage: Record<TierKey, TierKey | null> = {
		free: 'seedling',
		seedling: 'sapling',
		sapling: 'oak',
		oak: 'evergreen',
		evergreen: null,
	};

	let canNurture = $derived(nextStage[currentStage] !== null);
</script>

<div
	class="
    inline-flex items-center gap-3 px-4 py-2 rounded-full
    bg-white/60 dark:bg-grove-950/40 backdrop-blur-sm
    border border-white/40 dark:border-grove-800/30
    {className}
  "
>
	<!-- Stage icon -->
	<div class="relative">
		<div
			class="w-10 h-10 rounded-full bg-grove-100/50 dark:bg-grove-900/50 flex items-center justify-center"
		>
			<IconComponent class="w-5 h-5 text-grove-600 dark:text-grove-400" />
		</div>

		<!-- Flourish state indicator -->
		<div
			class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-grove-950 {stateColors[flourishState]}"
			title={stateLabels[flourishState]}
		></div>
	</div>

	<!-- Stage info -->
	<div class="flex flex-col">
		<span class="text-xs text-foreground-faint uppercase tracking-wider">Current Stage</span>
		<span class="font-medium text-foreground">{stageNames[currentStage]}</span>
	</div>

	<!-- Action buttons -->
	{#if showNurture && canNurture}
		<div class="h-6 w-px bg-grove-200 dark:bg-grove-700 mx-1"></div>
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
			onclick={() => onNurture?.()}
		>
			<Sprout class="w-3.5 h-3.5" />
			Nurture
			<ArrowRight class="w-3 h-3" />
		</button>
	{/if}

	{#if showTend}
		<div class="h-6 w-px bg-grove-200 dark:bg-grove-700 mx-1"></div>
		<button
			type="button"
			class="p-2 rounded-full hover:bg-grove-100 dark:hover:bg-grove-800 transition-colors"
			onclick={() => onTend?.()}
			aria-label="Open garden shed"
		>
			<Settings class="w-4 h-4 text-foreground-muted" />
		</button>
	{/if}
</div>
