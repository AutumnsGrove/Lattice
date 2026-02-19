<script lang="ts">
	/**
	 * GrowthCard
	 *
	 * Display a growth stage with cultivation action button.
	 * Used in garden modals and dashboard widgets.
	 */

	import { Sprout, TreeDeciduous, Trees, Crown, User, Footprints, Check, ArrowRight } from 'lucide-svelte';
	import type { GrowthCardProps } from './types.js';

	let {
		stage,
		displayName,
		tagline,
		icon = 'sprout',
		isCurrent = false,
		available = true,
		isNext = false,
		monthlyPrice = 0,
		annualPrice = 0,
		features = [],
		variant = 'secondary',
		onCultivate,
		class: className = '',
	}: GrowthCardProps = $props();

	// Icon mapping
	const iconComponents: Record<string, typeof Sprout> = {
		user: User,
		footprints: Footprints,
		sprout: Sprout,
		'tree-deciduous': TreeDeciduous,
		trees: Trees,
		crown: Crown,
	};

	let IconComponent = $derived(iconComponents[icon] || Sprout);

	// Price display
	let displayPrice = $derived(
		monthlyPrice === 0 ? 'Free' : `$${monthlyPrice}`
	);

	let priceSuffix = $derived(monthlyPrice === 0 ? '' : '/mo');

	// Button text based on state
	let buttonText = $derived.by(() => {
		if (isCurrent) return 'Current Stage';
		if (!available) return 'Coming Soon';
		if (isNext) return 'Nurture';
		return 'Cultivate';
	});

	// Button disabled state
	let buttonDisabled = $derived(isCurrent || !available);

	// Button variant styles
	let buttonStyles = $derived.by(() => {
		switch (variant) {
			case 'primary':
				return 'bg-accent text-white hover:bg-accent/90';
			case 'outline':
				return 'border-2 border-accent text-accent hover:bg-accent/10';
			default:
				return 'bg-grove-100 dark:bg-grove-800 text-foreground hover:bg-grove-200 dark:hover:bg-grove-700';
		}
	});
</script>

<div
	class="
    relative flex flex-col h-full p-5 rounded-lg
    bg-white/60 dark:bg-grove-950/20 backdrop-blur-sm
    border transition-all duration-200
    {isCurrent
		? 'border-accent/50 bg-accent/5'
		: 'border-white/30 dark:border-grove-800/20'}
    {isNext ? 'ring-2 ring-accent/30 scale-[1.02]' : ''}
    {className}
  "
>
	<!-- Current stage indicator -->
	{#if isCurrent}
		<div
			class="absolute -top-2 -right-2 px-2 py-0.5 bg-accent text-white text-xs font-medium rounded-full"
		>
			Current
		</div>
	{/if}

	<!-- Next stage indicator -->
	{#if isNext && !isCurrent}
		<div
			class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full"
		>
			Next Stage
		</div>
	{/if}

	<!-- Header -->
	<div class="flex items-center gap-3 mb-3">
		<div
			class="flex-shrink-0 w-10 h-10 rounded-full bg-grove-100/50 dark:bg-grove-900/30 flex items-center justify-center"
		>
			<IconComponent class="w-5 h-5 text-grove-600 dark:text-grove-400" />
		</div>

		<div>
			<h4 class="font-serif text-foreground">{displayName}</h4>
			<p class="text-xs text-foreground-muted">{tagline}</p>
		</div>
	</div>

	<!-- Price -->
	{#if monthlyPrice > 0}
		<div class="mb-3">
			<span class="text-xl font-bold text-foreground">{displayPrice}</span>
			<span class="text-foreground-faint text-sm">{priceSuffix}</span>
			{#if annualPrice > 0 && annualPrice < monthlyPrice * 12}
				<p class="text-xs text-accent mt-0.5">
					${annualPrice}/yr (save {Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)}%)
				</p>
			{/if}
		</div>
	{/if}

	<!-- Features preview -->
	{#if features.length > 0}
		<ul class="flex-1 space-y-1.5 mb-4 text-sm">
			{#each features.slice(0, 4) as feature}
				<li class="flex items-center gap-1.5 text-foreground-muted">
					<Check class="w-3.5 h-3.5 text-accent flex-shrink-0" />
					<span class="truncate">{feature}</span>
				</li>
			{/each}
			{#if features.length > 4}
				<li class="text-xs text-foreground-faint italic">
					+{features.length - 4} more features
				</li>
			{/if}
		</ul>
	{/if}

	<!-- CTA Button -->
	<button
		type="button"
		class="w-full py-2 px-4 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-1.5 {buttonStyles}"
		disabled={buttonDisabled}
		onclick={() => onCultivate?.(stage)}
	>
		{#if isNext}
			<Sprout class="w-4 h-4" />
		{/if}
		{buttonText}
		{#if isNext && !buttonDisabled}
			<ArrowRight class="w-3.5 h-3.5" />
		{/if}
	</button>
</div>
