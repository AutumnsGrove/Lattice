<script lang="ts">
	/**
	 * CurioMoodring — Display current mood with color
	 *
	 * Fetches the current mood color and name, displaying it as a
	 * colored ring with the mood label next to it.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		config: {
			currentColor: string;
			currentMoodName: string;
			displayStyle: string;
		};
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/moodring') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioMoodring] Failed to load:', err);
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading mood…</span>
		<div class="moodring-skeleton">
			<div class="moodring-circle-placeholder">&nbsp;</div>
			<div class="moodring-label-placeholder">&nbsp;</div>
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Mood ring unavailable</span>
{:else if data?.config}
	<div class="moodring" role="img" aria-label="Current mood: {data.config.currentMoodName}">
		<div
			class="moodring-circle"
			style="border-color: {data.config.currentColor}; background-color: {data.config.currentColor}22;"
		></div>
		<span class="moodring-label">{data.config.currentMoodName}</span>
	</div>
{/if}

<style>
	.moodring {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}

	.moodring-circle {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 3px solid currentColor;
		flex-shrink: 0;
	}

	.moodring-label {
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.02em;
	}

	.moodring-skeleton {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
	}

	.moodring-circle-placeholder {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
	}

	.moodring-label-placeholder {
		height: 1rem;
		width: 6rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.25rem;
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

	:global(.dark) .moodring-circle-placeholder,
	:global(.dark) .moodring-label-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
