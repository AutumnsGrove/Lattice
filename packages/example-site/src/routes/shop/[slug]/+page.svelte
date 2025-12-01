<script>
	import { page } from '$app/stores';

	// Example products
	const products = {
		'moonlight-jasmine': {
			id: 'moonlight-jasmine',
			name: 'Moonlight Jasmine Blend',
			description: 'Our signature house blend - jasmine pearls with a secret midnight twist. Each pearl is hand-rolled around jasmine blossoms and scented over multiple nights.',
			longDescription: `The Moonlight Jasmine Blend is the tea that started it all. This was the first blend Elena created for The Midnight Bloom, and it remains our most requested.

High-quality jasmine dragon pearls form the base, hand-rolled in Fujian province. We add dried lavender buds for a subtle floral complexity, a whisper of dried orange peel for brightness, and the tiniest pinch of pink salt to enhance all the other flavors.

The result is a tea that unfurls slowly, both literally and figuratively. Watch the pearls open as they steep. Notice how the aroma changes from the first cup to the third. Each steeping reveals new notes.

We only blend this tea on clear nights, by moonlight. Call it superstition, call it ritual. We call it the Midnight Bloom way.`,
			price: 24.00,
			weight: '2 oz (approximately 20 servings)',
			category: 'tea',
			origin: 'Fujian, China (jasmine pearls) + in-house blending'
		},
		'midnight-earl-grey': {
			id: 'midnight-earl-grey',
			name: 'Midnight Earl Grey',
			description: 'Classic bergamot with notes of lavender, blended for the late hours.',
			longDescription: `Our take on the classic. We start with a base of Ceylon black tea, then add bergamot oil that's been carefully balanced to avoid the harsh, soapy notes that plague lesser Earl Greys.

The lavender is our addition—just enough to round out the citrus without turning this into a floral tea. The result is sophisticated but approachable, perfect for those who find traditional Earl Grey too sharp.

This is the tea we recommend for newcomers to The Midnight Bloom. It's familiar enough to feel safe, interesting enough to spark curiosity.`,
			price: 18.00,
			weight: '2 oz (approximately 25 servings)',
			category: 'tea',
			origin: 'Sri Lanka (base tea) + Calabria, Italy (bergamot)'
		}
	};

	let product = $derived(products[$page.params.slug]);
	let quantity = $state(1);
</script>

<svelte:head>
	<title>{product?.name || 'Product'} - The Midnight Bloom</title>
</svelte:head>

<div class="product-page">
	{#if product}
		<div class="product-layout">
			<div class="product-image">
				<span class="placeholder-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
						<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
						<line x1="6" y1="2" x2="6" y2="4"></line>
						<line x1="10" y1="2" x2="10" y2="4"></line>
						<line x1="14" y1="2" x2="14" y2="4"></line>
					</svg>
				</span>
			</div>

			<div class="product-details">
				<h1>{product.name}</h1>
				<p class="price">${product.price.toFixed(2)}</p>
				<p class="short-desc">{product.description}</p>

				<div class="product-meta">
					<p><strong>Weight:</strong> {product.weight}</p>
					<p><strong>Origin:</strong> {product.origin}</p>
				</div>

				<div class="purchase-section">
					<div class="quantity">
						<label for="qty">Quantity:</label>
						<select id="qty" bind:value={quantity}>
							{#each [1,2,3,4,5] as n}
								<option value={n}>{n}</option>
							{/each}
						</select>
					</div>
					<button class="add-to-cart" disabled>Coming Soon</button>
				</div>

				<div class="long-description">
					{#each product.longDescription.split('\n\n') as paragraph}
						<p>{paragraph}</p>
					{/each}
				</div>
			</div>
		</div>

		<a href="/shop" class="back-link">← Back to Shop</a>
	{:else}
		<div class="not-found">
			<h1>Product Not Found</h1>
			<p>This product doesn't exist or has been removed.</p>
			<a href="/shop" class="back-link">← Back to Shop</a>
		</div>
	{/if}
</div>

<style>
	.product-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.product-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		margin-bottom: 2rem;
	}

	.product-image {
		background: hsl(var(--muted));
		border-radius: 12px;
		height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-icon {
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.product-details h1 {
		font-size: 2rem;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.price {
		font-size: 1.75rem;
		font-weight: 600;
		color: hsl(var(--accent));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.short-desc {
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.product-meta {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.product-meta p {
		margin: 0 0 0.5rem 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	.product-meta p:last-child {
		margin-bottom: 0;
	}

	.product-meta strong {
		color: hsl(var(--foreground));
	}

	.purchase-section {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-bottom: 2rem;
	}

	.quantity {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quantity label {
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
	}

	.quantity select {
		padding: 0.5rem 1rem;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.add-to-cart {
		flex: 1;
		background: hsl(var(--muted));
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		color: hsl(var(--muted-foreground));
		font-family: system-ui, sans-serif;
		cursor: not-allowed;
	}

	.long-description p {
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		margin: 0 0 1rem 0;
	}

	.back-link {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		font-family: system-ui, sans-serif;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.not-found {
		text-align: center;
		padding: 4rem 2rem;
	}

	.not-found h1 {
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
	}

	.not-found p {
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem 0;
	}

	@media (max-width: 768px) {
		.product-layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.product-image {
			height: 280px;
		}
	}
</style>
