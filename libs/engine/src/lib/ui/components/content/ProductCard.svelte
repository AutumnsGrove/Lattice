<script lang="ts">
	import Icons from '../icons/Icons.svelte';
	import ScoreBar from '../indicators/ScoreBar.svelte';

	interface Props {
		name: string;
		price: number;
		originalPrice?: number;
		retailer: string;
		url: string;
		imageUrl?: string;
		matchScore?: number;
		matchReason?: string;
		index?: number;
	}

	let {
		name,
		price,
		originalPrice,
		retailer,
		url,
		imageUrl,
		matchScore = 0,
		matchReason,
		index = 0
	}: Props = $props();

	const discount = $derived(
		originalPrice && originalPrice > price
			? Math.round(((originalPrice - price) / originalPrice) * 100)
			: 0
	);

	const formatPrice = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100);
	};

	// Stagger animation delay based on index
	const animationDelay = $derived(`${index * 100}ms`);
</script>

<article
	class="scout-product-card animate-deal-pop"
	style="animation-delay: {animationDelay}"
>
	<!-- Image Section -->
	<div class="scout-product-image relative">
		{#if imageUrl}
			<img src={imageUrl} alt={name} class="w-full h-full object-cover" loading="lazy" />
		{:else}
			<div class="flex flex-col items-center justify-center text-bark-300 dark:text-bark-600">
				<Icons name="shopping-bag" size="xl" />
				<span class="text-xs mt-2">No image</span>
			</div>
		{/if}

		<!-- Discount Badge -->
		{#if discount > 0}
			<div class="absolute top-3 left-3 scout-badge-deal text-sm font-bold px-2.5 py-1">
				{discount}% OFF
			</div>
		{/if}

		<!-- Retailer Badge -->
		<div class="absolute bottom-3 right-3 bg-white/90 dark:bg-bark-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-bark dark:text-cream">
			{retailer}
		</div>
	</div>

	<!-- Content Section -->
	<div class="scout-product-body">
		<h3 class="font-medium text-bark dark:text-cream mb-2 line-clamp-2 leading-snug">
			{name}
		</h3>

		<!-- Price -->
		<div class="flex items-baseline gap-2 mb-3">
			<span class="scout-price">{formatPrice(price)}</span>
			{#if originalPrice && originalPrice > price}
				<span class="scout-price-original">{formatPrice(originalPrice)}</span>
			{/if}
		</div>

		<!-- Match Score -->
		{#if matchScore > 0}
			<div class="mb-3">
				<ScoreBar score={matchScore} size="sm" />
			</div>
		{/if}

		<!-- Match Reason -->
		{#if matchReason}
			<p class="text-sm text-bark-500 dark:text-cream-500 mb-4 line-clamp-2">
				{matchReason}
			</p>
		{/if}

		<!-- Action Button -->
		<div class="mt-auto">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				class="scout-btn-primary w-full text-sm"
			>
				View Deal
				<Icons name="external" size="sm" />
			</a>
		</div>
	</div>
</article>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
