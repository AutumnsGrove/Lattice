<script lang="ts">
	/**
	 * Checkout Flow Page
	 *
	 * If a checkoutUrl is returned from the server, redirect immediately
	 * to Stripe Checkout. Otherwise, show a billing landing page with
	 * links to manage subscription.
	 */

	let { data } = $props();

	// Auto-redirect to Stripe Checkout if URL is available
	$effect(() => {
		if (data.checkoutUrl) {
			window.location.href = data.checkoutUrl;
		}
	});
</script>

<svelte:head>
	<title>Billing - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	{#if data.checkoutUrl}
		<!-- Redirecting to Stripe Checkout -->
		<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-md">
			<div class="spinner mx-auto mb-4"></div>
			<h1 class="text-lg font-serif text-foreground mb-2">Redirecting to checkout...</h1>
			<p class="text-sm text-foreground-muted">
				You'll be taken to our secure payment page in a moment.
			</p>
		</div>
	{:else if !data.authenticated}
		<!-- Not signed in -->
		<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-md">
			<div class="text-4xl mb-4">&#127793;</div>
			<h1 class="text-xl font-serif text-foreground mb-2">Grove Billing</h1>
			<p class="text-foreground-muted mb-6">Sign in to manage your subscription and billing.</p>
			<a
				href="https://login.grove.place?redirect={encodeURIComponent(
					'https://billing.grove.place',
				)}"
				class="btn-primary w-full"
			>
				Sign in
			</a>
		</div>
	{:else}
		<!-- Signed in, no checkout action — show management links -->
		<div class="glass-grove rounded-2xl border border-default p-8 shadow-md">
			<div class="text-center mb-6">
				<div class="text-4xl mb-4">&#127793;</div>
				<h1 class="text-xl font-serif text-foreground mb-2">Manage your Grove</h1>
				<p class="text-foreground-muted">
					View and manage your subscription, payment methods, and billing history.
				</p>
			</div>

			<div class="flex flex-col gap-3">
				<a href="/portal" class="btn-primary w-full text-center"> Open Billing Portal </a>
				<a href="/cancel" class="btn-secondary w-full text-center"> Cancel Subscription </a>
			</div>

			{#if data.redirectUrl && data.redirectUrl !== "https://grove.place"}
				<div class="mt-6 pt-4 border-t border-default text-center">
					<a
						href={data.redirectUrl}
						class="text-sm text-foreground-subtle hover:text-foreground-muted transition-colors"
					>
						&larr; Back to your Grove
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>
