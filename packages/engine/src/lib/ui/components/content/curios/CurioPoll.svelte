<script lang="ts">
	/**
	 * CurioPoll — Display poll with results
	 *
	 * Fetches a poll by ID and displays the question, options with vote counts,
	 * and a horizontal bar chart showing results if visible.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		poll: {
			id: string;
			question: string;
			options: Array<{ id: string; label: string; votes: number }>;
			resultsVisibility: 'public' | 'private';
			isClosed: boolean;
			results: Record<string, number> | null;
			hasVoted: boolean;
		};
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		if (!arg) {
			error = true;
			loading = false;
			return;
		}

		fetch(`/api/curios/polls/${encodeURIComponent(arg)}`) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioPoll] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	function getMaxVotes(): number {
		if (!data?.poll) return 1;
		return Math.max(...data.poll.options.map((o) => o.votes), 1);
	}

	function getPercentage(votes: number): number {
		const max = getMaxVotes();
		return max > 0 ? (votes / max) * 100 : 0;
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading poll…</span>
		<div class="poll-skeleton">
			<div class="poll-question-placeholder">&nbsp;</div>
			{#each Array(3) as _}
				<div class="poll-option-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>
{:else if error}
	{#if !arg}
		<span class="grove-curio-error">No poll ID specified</span>
	{:else}
		<span class="grove-curio-error">Poll unavailable</span>
	{/if}
{:else if data?.poll}
	<div class="poll" role="region" aria-label="Poll: {data.poll.question}">
		<div class="poll-header">
			<h3 class="poll-question">{data.poll.question}</h3>
			{#if data.poll.isClosed}
				<span class="poll-badge">Closed</span>
			{/if}
		</div>

		<div class="poll-options">
			{#each data.poll.options as option (option.id)}
				<div class="poll-option">
					<div class="poll-option-label">{option.label}</div>
					<div class="poll-bar-container">
						<div
							class="poll-bar"
							style="width: {getPercentage(option.votes)}%"
							role="img"
							aria-label="{option.label}: {option.votes} votes"
						></div>
					</div>
					<div class="poll-votes">{option.votes}</div>
				</div>
			{/each}
		</div>

		{#if data.poll.hasVoted}
			<div class="poll-footer">
				<span class="poll-voted">✓ You voted</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.poll {
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.poll-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		justify-content: space-between;
	}

	.poll-question {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.poll-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.poll-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.poll-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 0.375rem;
	}

	.poll-option-label {
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 6rem;
		flex-shrink: 0;
	}

	.poll-bar-container {
		flex: 1;
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.poll-bar {
		height: 100%;
		background: linear-gradient(90deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.5));
		transition: width 0.3s ease;
		border-radius: 0.25rem;
	}

	.poll-votes {
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 3rem;
		text-align: right;
		flex-shrink: 0;
	}

	.poll-footer {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		text-align: center;
	}

	.poll-voted {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.poll-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.poll-question-placeholder {
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.poll-option-placeholder {
		height: 2rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	:global(.dark) .poll-badge {
		background: rgba(255, 255, 255, 0.15);
	}

	:global(.dark) .poll-option {
		background: rgba(255, 255, 255, 0.04);
	}

	:global(.dark) .poll-bar-container {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-footer {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-question-placeholder,
	:global(.dark) .poll-option-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
