<script lang="ts">
	/**
	 * Cancellation Confirmation Page
	 *
	 * Shows the user their current plan details and asks them to confirm
	 * cancellation. Cancellation schedules at period end (not immediate).
	 * Two clear options: Keep my plan / Cancel subscription.
	 */

	let { data } = $props();

	const planName = $derived(
		data.status?.plan
			? data.status.plan.charAt(0).toUpperCase() + data.status.plan.slice(1)
			: "Current",
	);
	const periodEnd = $derived(
		data.status?.currentPeriodEnd
			? new Date(data.status.currentPeriodEnd).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: null,
	);
</script>

<svelte:head>
	<title>Cancel Subscription - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-lg">
		<div class="text-center mb-6">
			<h1 class="text-xl font-serif text-foreground mb-2 tracking-tight">Cancel your subscription?</h1>
			<p class="text-foreground-muted">
				No pressure either way. Here's what happens if you do.
			</p>
		</div>

		{#if data.status?.cancelAtPeriodEnd}
			<!-- Already scheduled for cancellation -->
			<div class="banner-warning mb-6">
				<p class="text-sm text-foreground">
					Your subscription is already scheduled to cancel
					{#if periodEnd}
						on <strong>{periodEnd}</strong>.
					{:else}
						at the end of your current billing period.
					{/if}
				</p>
				<p class="text-sm text-foreground-muted mt-2">
					Changed your mind? You can resume anytime before then.
				</p>
			</div>

			<div class="flex flex-col gap-3">
				<a href="/resume" class="btn-primary w-full text-center"> Resume subscription </a>
				<a href={data.redirectUrl} class="btn-secondary w-full text-center"> Back to your Grove </a>
			</div>
		{:else}
			<!-- Active subscription — show confirmation -->
			<div class="status-card mb-6">
				<div class="flex justify-between items-center mb-3">
					<span class="text-sm text-foreground-muted">Plan</span>
					<span class="text-sm font-medium text-foreground">{planName}</span>
				</div>
				{#if data.status?.paymentMethod}
					<div class="flex justify-between items-center mb-3">
						<span class="text-sm text-foreground-muted">Payment</span>
						<span class="text-sm font-medium text-foreground capitalize"
							>{data.status.paymentMethod.brand} ending in {data.status.paymentMethod.last4}</span
						>
					</div>
				{/if}
				{#if periodEnd}
					<div class="flex justify-between items-center">
						<span class="text-sm text-foreground-muted">Access until</span>
						<span class="text-sm font-medium text-foreground">{periodEnd}</span>
					</div>
				{/if}
			</div>

			<p class="text-sm text-foreground-muted mb-6">
				Your subscription will remain active until the end of your current billing period. You won't
				be charged again after that.
			</p>

			<div class="flex flex-col gap-3">
				<a href={data.redirectUrl} class="btn-primary w-full text-center"> Keep my plan </a>
				<form method="POST">
					<button type="submit" class="btn-danger w-full" aria-label="Confirm cancellation of your subscription">
						Cancel subscription
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
