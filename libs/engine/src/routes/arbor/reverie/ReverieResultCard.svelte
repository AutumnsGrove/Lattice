<script lang="ts">
	import { Check, X } from "lucide-svelte";

	interface ExecuteStep {
		domain: string;
		field: string;
		success: boolean;
		error?: string;
	}

	interface Props {
		appliedCount: number;
		failedCount: number;
		steps: ExecuteStep[];
	}

	let { appliedCount, failedCount, steps }: Props = $props();

	const total = $derived(appliedCount + failedCount);
	const allSuccess = $derived(failedCount === 0);

	/** Deduplicate steps by domain for the summary grid */
	const domainResults = $derived.by(() => {
		const map = new Map<string, boolean>();
		for (const step of steps) {
			const parts = step.domain.split(".");
			const label = parts.length > 1 ? capitalize(parts[1]) : capitalize(parts[0]);
			// A domain fails if any of its steps failed
			const prev = map.get(label);
			map.set(label, prev === undefined ? step.success : prev && step.success);
		}
		return [...map.entries()];
	});

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
</script>

<div class="result-card" class:partial={!allSuccess}>
	<div class="result-header">
		{#if allSuccess}
			<Check size={16} class="text-emerald-400" aria-hidden="true" />
			<span>Applied {appliedCount} change{appliedCount === 1 ? "" : "s"}</span>
		{:else}
			<span>Applied {appliedCount} of {total} change{total === 1 ? "" : "s"}</span>
		{/if}
	</div>

	{#if domainResults.length > 0}
		<div class="domain-grid" role="list" aria-label="Change results by domain">
			{#each domainResults as [label, success] (label)}
				<span class="domain-item" class:failed={!success} role="listitem">
					{#if success}
						<Check size={12} aria-hidden="true" />
						<span class="sr-only">succeeded: </span>
					{:else}
						<X size={12} aria-hidden="true" />
						<span class="sr-only">failed: </span>
					{/if}
					{label}
				</span>
			{/each}
		</div>
	{/if}

	<p class="result-message">
		{#if allSuccess}
			Your grove has a new atmosphere.
		{:else}
			Almost there. Some changes couldn't be applied right now.
		{/if}
	</p>
</div>

<style>
	.result-card {
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: rgba(34, 197, 94, 0.05);
		border: 1px solid rgba(34, 197, 94, 0.15);
		box-shadow: inset 0 1px 0 rgba(34, 197, 94, 0.06);
	}

	.result-card.partial {
		background: rgba(245, 158, 11, 0.05);
		border-color: rgba(245, 158, 11, 0.15);
		box-shadow: inset 0 1px 0 rgba(245, 158, 11, 0.06);
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.5rem;
	}

	.domain-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 0.75rem;
		margin-bottom: 0.5rem;
	}

	.domain-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: rgba(74, 222, 128, 0.8);
	}

	.domain-item.failed {
		color: rgba(248, 113, 113, 0.8);
	}

	.result-message {
		margin: 0;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.45);
	}

	/* Screen reader only utility */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
