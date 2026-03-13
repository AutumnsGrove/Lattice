<script lang="ts">
	/**
	 * Portal page — only shown briefly while redirecting to Stripe.
	 * The server load function redirects before this renders in normal flow.
	 * This page serves as a fallback if something unexpected happens.
	 */
</script>

<svelte:head>
	<title>Billing Portal - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-md">
		<div class="spinner mx-auto mb-4"></div>
		<h1 class="text-lg font-serif text-foreground mb-2">Opening billing portal...</h1>
		<p class="text-sm text-foreground-muted">
			You'll be redirected to manage your subscription in a moment.
		</p>
	</div>
</div>
