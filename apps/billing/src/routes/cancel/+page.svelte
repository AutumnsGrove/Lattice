<script lang="ts">
	/**
	 * Cancellation Confirmation Page
	 *
	 * Shows the user their current plan details and asks them to confirm
	 * cancellation. Cancellation schedules at period end (not immediate).
	 * Two clear options: Keep my plan / Cancel subscription.
	 */

	let { data } = $props();

	const planName = data.status?.plan
		? data.status.plan.charAt(0).toUpperCase() + data.status.plan.slice(1)
		: "Current";
	const periodEnd = data.status?.currentPeriodEnd
		? new Date(data.status.currentPeriodEnd).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;
</script>

<svelte:head>
	<title>Cancel Subscription - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-md">
		<div class="text-center mb-6">
			<div class="text-4xl mb-4">&#127810;</div>
			<h1 class="text-xl font-serif text-foreground mb-2">Cancel your subscription?</h1>
			<p class="text-foreground-muted">
				We're sorry to see you consider leaving. Here's what will happen.
			</p>
		</div>

		{#if data.status?.cancelAtPeriodEnd}
			<!-- Already scheduled for cancellation -->
			<div class="rounded-lg p-4 mb-6" style="background-color: var(--color-warning-bg);">
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
			<div class="rounded-lg border border-default p-4 mb-6">
				<div class="flex justify-between items-center mb-2">
					<span class="text-sm text-foreground-muted">Plan</span>
					<span class="text-sm font-medium text-foreground">{planName}</span>
				</div>
				{#if data.status?.paymentMethod}
					<div class="flex justify-between items-center mb-2">
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
					<button type="submit" class="btn-danger w-full"> Cancel subscription </button>
				</form>
			</div>
		{/if}
	</div>
</div>
