<!-- Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond) -->
<script>
	// Cart feature is disabled
</script>

<svelte:head>
	<title>Cart - Coming Soon - The Midnight Bloom</title>
</svelte:head>

<div class="shop-disabled">
	<div class="icon">
		<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="8" cy="21" r="1"></circle>
			<circle cx="19" cy="21" r="1"></circle>
			<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
		</svg>
	</div>

	<h1>Cart Coming Soon</h1>
	<p class="subtitle">We're brewing something special</p>

	<div class="notice">
		<p>Our online shop and cart is temporarily unavailable while we focus on perfecting the core experience.</p>
		<p>In the meantime, visit us in person to purchase our teas and accessories.</p>
	</div>

	<a href="/" class="back-home">Back to Home</a>
</div>

<style>
	.shop-disabled {
		max-width: 500px;
		margin: 4rem auto;
		text-align: center;
		padding: 2rem;
	}

	.icon {
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 2rem;
		color: hsl(var(--primary));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin: 0 0 2rem 0;
	}

	.notice {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.notice p {
		margin: 0 0 0.75rem 0;
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
	}

	.notice p:last-child {
		margin-bottom: 0;
	}

	.back-home {
		display: inline-block;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-family: system-ui, sans-serif;
		font-weight: 500;
		transition: background 0.2s;
	}

	.back-home:hover {
		background: hsl(var(--accent));
	}
</style>
