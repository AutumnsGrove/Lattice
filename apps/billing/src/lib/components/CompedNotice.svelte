<script lang="ts">
	/**
	 * Comped account notice
	 *
	 * Paid tier with no Stripe customer — there is nothing to bill, cancel, or
	 * resume, so the portal/cancel/resume pages show this instead of a 502 (#1542).
	 */

	let { redirectUrl }: { redirectUrl: string } = $props();
</script>

<div class="status-card mb-6">
	<p class="text-sm text-foreground">
		Your plan is complimentary — no invoices, no payment method, nothing to change here.
	</p>
</div>

<a href={redirectUrl} class="btn-primary w-full text-center">Back to your Grove</a>
