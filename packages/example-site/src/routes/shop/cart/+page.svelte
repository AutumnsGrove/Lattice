<script>
	// Cart stub - will be implemented with actual cart functionality later
	let cartItems = $state([]);
</script>

<svelte:head>
	<title>Cart - The Midnight Bloom</title>
</svelte:head>

<div class="cart-page">
	<h1>Your Cart</h1>

	<div class="cart-notice">
		<p><strong>Coming Soon:</strong> Our online shop and cart functionality is currently under development.</p>
		<p>For now, please visit us in person at 742 Twilight Lane to purchase our teas and accessories.</p>
	</div>

	{#if cartItems.length === 0}
		<div class="empty-cart">
			<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="8" cy="21" r="1"></circle>
				<circle cx="19" cy="21" r="1"></circle>
				<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
			</svg>
			<p>Your cart is empty</p>
			<a href="/shop" class="continue-shopping">Continue Shopping</a>
		</div>
	{/if}
</div>

<style>
	.cart-page {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		margin: 0 0 2rem 0;
		font-family: system-ui, sans-serif;
		text-align: center;
	}

	.cart-notice {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--accent));
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.cart-notice p {
		margin: 0 0 0.5rem 0;
		color: hsl(var(--muted-foreground));
	}

	.cart-notice p:last-child {
		margin-bottom: 0;
	}

	.cart-notice strong {
		color: hsl(var(--accent));
	}

	.empty-cart {
		text-align: center;
		padding: 4rem 2rem;
		color: hsl(var(--muted-foreground));
	}

	.empty-cart svg {
		opacity: 0.3;
		margin-bottom: 1.5rem;
	}

	.empty-cart p {
		margin: 0 0 1.5rem 0;
		font-size: 1.1rem;
	}

	.continue-shopping {
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

	.continue-shopping:hover {
		background: hsl(var(--accent));
	}
</style>
