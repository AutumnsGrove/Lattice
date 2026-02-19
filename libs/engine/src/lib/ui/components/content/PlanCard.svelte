<script lang="ts">
	import Icons from '../icons/Icons.svelte';

	interface Props {
		name: string;
		price: number;
		searches: number;
		features: string[];
		popular?: boolean;
		current?: boolean;
		priceId?: string;
		onselect?: (priceId: string) => void;
	}

	let {
		name,
		price,
		searches,
		features,
		popular = false,
		current = false,
		priceId = '',
		onselect
	}: Props = $props();

	const pricePerSearch = $derived((price / searches).toFixed(2));

	function handleSelect() {
		if (onselect && priceId) {
			onselect(priceId);
		}
	}
</script>

<div
	class="scout-card relative flex flex-col h-full {popular ? 'ring-2 ring-grove-500 shadow-grove-lg' : ''}"
>
	<!-- Popular badge -->
	{#if popular}
		<div class="absolute -top-3 left-1/2 -translate-x-1/2">
			<span class="bg-grove-500 text-white text-xs font-bold px-3 py-1 rounded-full">
				MOST POPULAR
			</span>
		</div>
	{/if}

	<div class="p-6 flex-1 flex flex-col">
		<!-- Header -->
		<div class="text-center mb-6">
			<h3 class="text-xl font-bold text-bark dark:text-cream mb-2">{name}</h3>
			<div class="flex items-baseline justify-center gap-1">
				<span class="text-4xl font-bold text-bark dark:text-cream">${price}</span>
				<span class="text-bark-400 dark:text-cream-500">/month</span>
			</div>
			<p class="text-sm text-bark-400 dark:text-cream-500 mt-2">
				{searches} searches • ${pricePerSearch}/search
			</p>
		</div>

		<!-- Features -->
		<ul class="space-y-3 mb-6 flex-1">
			{#each features as feature}
				<li class="flex items-start gap-2 text-sm text-bark-600 dark:text-cream-400">
					<Icons name="check" size="sm" class="text-grove-500 mt-0.5 flex-shrink-0" />
					<span>{feature}</span>
				</li>
			{/each}
		</ul>

		<!-- CTA -->
		{#if current}
			<button
				disabled
				class="scout-btn-secondary w-full opacity-75 cursor-not-allowed"
			>
				Current Plan
			</button>
		{:else}
			<button
				onclick={handleSelect}
				class="{popular ? 'scout-btn-primary' : 'scout-btn-secondary'} w-full"
			>
				{#if popular}
					Get Started
				{:else}
					Choose {name}
				{/if}
			</button>
		{/if}
	</div>
</div>
