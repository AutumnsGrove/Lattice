<script lang="ts">
	/**
	 * Resume Subscription Page
	 *
	 * Shows confirmation to undo a scheduled cancellation.
	 * Only meaningful if cancelAtPeriodEnd is true.
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
	<title>Resume Subscription - Grove</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-md">
		<div class="text-center mb-6">
			<div class="text-4xl mb-4">&#127793;</div>
			<h1 class="text-xl font-serif text-foreground mb-2">Resume your subscription?</h1>
			<p class="text-foreground-muted">
				Welcome back! Your {planName} plan can pick up right where it left off.
			</p>
		</div>

		{#if !data.status?.cancelAtPeriodEnd}
			<!-- Not actually cancelled — redirect back -->
			<div class="rounded-lg p-4 mb-6" style="background-color: var(--color-success-bg);">
				<p class="text-sm text-foreground">
					Your subscription is already active. No action needed.
				</p>
			</div>

			<a href={data.redirectUrl} class="btn-primary w-full text-center"> Back to your Grove </a>
		{:else}
			<!-- Scheduled for cancellation — offer resume -->
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
						<span class="text-sm text-foreground-muted">Would cancel on</span>
						<span class="text-sm font-medium text-foreground">{periodEnd}</span>
					</div>
				{/if}
			</div>

			<p class="text-sm text-foreground-muted mb-6">
				Resuming will keep your {planName} plan active. You'll continue to be billed normally.
			</p>

			<div class="flex flex-col gap-3">
				<form method="POST">
					<button type="submit" class="btn-primary w-full"> Resume subscription </button>
				</form>
				<a href={data.redirectUrl} class="btn-secondary w-full text-center"> Not now </a>
			</div>
		{/if}
	</div>
</div>
