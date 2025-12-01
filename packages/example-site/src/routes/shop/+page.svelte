<script>
	// Example products for the shop stub
	const products = [
		{
			id: 'moonlight-jasmine',
			name: 'Moonlight Jasmine Blend',
			description: 'Our signature house blend - jasmine pearls with a secret midnight twist.',
			price: 24.00,
			category: 'tea'
		},
		{
			id: 'midnight-earl-grey',
			name: 'Midnight Earl Grey',
			description: 'Classic bergamot with notes of lavender, blended for the late hours.',
			price: 18.00,
			category: 'tea'
		},
		{
			id: 'sleepless-oolong',
			name: 'Sleepless Oolong',
			description: 'A robust Taiwanese oolong with honey undertones. Ironically named.',
			price: 28.00,
			category: 'tea'
		},
		{
			id: 'stargazer-white',
			name: "Stargazer's White",
			description: 'Delicate silver needle white tea, best enjoyed while watching the night sky.',
			price: 32.00,
			category: 'tea'
		},
		{
			id: 'ceramic-gaiwan',
			name: 'Handmade Ceramic Gaiwan',
			description: 'Traditional brewing vessel, glazed in our signature midnight blue.',
			price: 45.00,
			category: 'accessories'
		},
		{
			id: 'glass-teapot',
			name: 'Borosilicate Glass Teapot',
			description: 'Watch your tea unfurl. Heat-resistant with removable infuser.',
			price: 38.00,
			category: 'accessories'
		}
	];

	let selectedCategory = $state('all');

	let filteredProducts = $derived(
		selectedCategory === 'all'
			? products
			: products.filter(p => p.category === selectedCategory)
	);
</script>

<svelte:head>
	<title>Shop - The Midnight Bloom</title>
	<meta name="description" content="Shop our curated selection of rare teas and brewing accessories." />
</svelte:head>

<div class="shop-page">
	<header class="page-header">
		<h1>Shop</h1>
		<p class="subtitle">Take the midnight home with you</p>
	</header>

	<div class="shop-notice">
		<p><strong>Coming Soon:</strong> Our online shop is currently under development. For now, visit us in person to purchase our teas and accessories.</p>
	</div>

	<div class="filters">
		<button class:active={selectedCategory === 'all'} onclick={() => selectedCategory = 'all'}>All</button>
		<button class:active={selectedCategory === 'tea'} onclick={() => selectedCategory = 'tea'}>Teas</button>
		<button class:active={selectedCategory === 'accessories'} onclick={() => selectedCategory = 'accessories'}>Accessories</button>
	</div>

	<div class="products-grid">
		{#each filteredProducts as product}
			<article class="product-card">
				<div class="product-image">
					<span class="placeholder-icon">
						{#if product.category === 'tea'}
							<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
								<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
								<line x1="6" y1="2" x2="6" y2="4"></line>
								<line x1="10" y1="2" x2="10" y2="4"></line>
								<line x1="14" y1="2" x2="14" y2="4"></line>
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
								<path d="M3 6h18"></path>
								<path d="M16 10a4 4 0 0 1-8 0"></path>
							</svg>
						{/if}
					</span>
				</div>
				<div class="product-info">
					<h2><a href="/shop/{product.id}">{product.name}</a></h2>
					<p class="description">{product.description}</p>
					<p class="price">${product.price.toFixed(2)}</p>
					<button class="add-to-cart" disabled>Coming Soon</button>
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	.shop-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin: 0;
	}

	.shop-notice {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--accent));
		border-radius: 8px;
		padding: 1rem 1.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.shop-notice p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	.shop-notice strong {
		color: hsl(var(--accent));
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.filters button {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		padding: 0.5rem 1.25rem;
		border-radius: 20px;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		font-family: system-ui, sans-serif;
		transition: all 0.2s;
	}

	.filters button:hover {
		border-color: hsl(var(--primary));
		color: hsl(var(--primary));
	}

	.filters button.active {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary));
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.product-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
		transition: border-color 0.2s;
	}

	.product-card:hover {
		border-color: hsl(var(--primary));
	}

	.product-image {
		background: hsl(var(--muted));
		height: 180px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-icon {
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.product-info {
		padding: 1.25rem;
	}

	.product-info h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-family: system-ui, sans-serif;
	}

	.product-info h2 a {
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.product-info h2 a:hover {
		color: hsl(var(--primary));
	}

	.description {
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 1rem 0;
	}

	.price {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--accent));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.add-to-cart {
		width: 100%;
		background: hsl(var(--muted));
		border: none;
		padding: 0.75rem;
		border-radius: 6px;
		color: hsl(var(--muted-foreground));
		font-family: system-ui, sans-serif;
		cursor: not-allowed;
	}

	@media (max-width: 600px) {
		.products-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
