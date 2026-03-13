<script lang="ts">
	/**
	 * Portal page
	 *
	 * Normal flow: server redirects to Stripe before this renders.
	 * Greenhouse mode: shows a mock portal summary instead.
	 */

	let { data } = $props();
	const isGreenhouse = $derived(data.greenhouse ?? false);
</script>

<svelte:head>
	<title>Billing Portal - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	{#if isGreenhouse}
		<!-- Greenhouse: mock portal view -->
		<div class="glass-grove rounded-2xl border border-default p-8 shadow-lg">
			<div class="text-center mb-6">
				<h1 class="text-xl font-serif text-foreground mb-2 tracking-tight">Billing Portal</h1>
				<p class="text-foreground-muted text-sm">
					In production, this redirects to Stripe's hosted billing portal.
				</p>
			</div>

			<!-- Mock portal content -->
			<div class="status-card mb-4">
				<div class="flex justify-between items-center mb-2">
					<span class="text-sm text-foreground-muted">Plan</span>
					<span class="text-sm font-medium text-foreground">Sapling</span>
				</div>
				<div class="flex justify-between items-center mb-2">
					<span class="text-sm text-foreground-muted">Status</span>
					<span class="text-sm font-medium text-success">Active</span>
				</div>
				<div class="flex justify-between items-center mb-2">
					<span class="text-sm text-foreground-muted">Payment</span>
					<span class="text-sm font-medium text-foreground">Visa ending in 4242</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-sm text-foreground-muted">Next billing</span>
					<span class="text-sm font-medium text-foreground">
						{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
					</span>
				</div>
			</div>

			<p class="text-xs text-foreground-subtle text-center mb-6">
				Greenhouse mock — Stripe portal would show payment methods, invoices, and plan management here.
			</p>

			<div class="flex flex-col gap-3">
				<a href="/" class="btn-primary w-full text-center">Back to billing</a>
				<a href="/cancel" class="btn-secondary w-full text-center">Cancel subscription</a>
			</div>
		</div>
	{:else}
		<!-- Real flow: brief loading state before Stripe redirect -->
		<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-lg">
			<div class="spinner mx-auto mb-4" role="status" aria-label="Loading"></div>
			<h1 class="text-lg font-serif text-foreground mb-2 tracking-tight">Opening billing portal...</h1>
			<p class="text-sm text-foreground-muted">
				You'll be redirected to manage your subscription in a moment.
			</p>
		</div>
	{/if}
</div>
