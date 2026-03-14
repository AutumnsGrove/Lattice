<script lang="ts">
	/**
	 * CurioActivitystatus — Inline activity status indicator
	 *
	 * Shows a brief emoji + text status (e.g., "☕ Busy with tea").
	 * Displays nothing if no status or if expired.
	 * Very compact, single-line display.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		status: {
			text: string;
			emoji: string;
			type: string;
			isExpired: boolean;
		} | null;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/activitystatus') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioActivitystatus] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	let activeStatus = $derived(
		data?.status && !data.status.isExpired ? data.status : null
	);
</script>

{#if loading}
	<span class="activitystatus-skeleton" role="status">
		<span class="sr-only">Loading activity status…</span>
	</span>
{:else if error}
	<!-- Silent fail for activity status - it's optional -->
{:else if activeStatus}
	<span
		class="activitystatus"
		role="status"
		aria-label="Activity status: {activeStatus.emoji} {activeStatus.text}"
	>
		<span class="activitystatus-emoji" aria-hidden="true">{activeStatus.emoji}</span>
		<span class="activitystatus-text">{activeStatus.text}</span>
	</span>
{/if}

<style>
	.activitystatus {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.04);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	:global(.dark) .activitystatus {
		background: rgba(255, 255, 255, 0.06);
	}

	.activitystatus-emoji {
		display: inline-flex;
		font-size: 1rem;
		line-height: 1;
	}

	.activitystatus-text {
		opacity: 0.85;
	}

	.activitystatus-skeleton {
		display: inline-flex;
		width: 120px;
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 0.25rem;
	}
</style>
