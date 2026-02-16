<script lang="ts">
	/**
	 * CurioArtifacts — Display collectible artifacts
	 *
	 * Fetches artifacts from the API and displays them as cards.
	 * If an arg is provided, filters to artifacts of that type.
	 * Currently shows placeholder "Coming soon" messages for future implementations.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		artifacts: Array<{
			id: string;
			artifactType: string;
			placement: string;
			config: Record<string, unknown>;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		const url = arg
			? `/api/curios/artifacts?type=${encodeURIComponent(arg)}`
			: '/api/curios/artifacts';
		fetch(url) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioArtifacts] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	const formatType = (type: string): string => {
		return type
			.replace(/([A-Z])/g, ' $1')
			.trim()
			.replace(/^./, (s) => s.toUpperCase());
	};
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading artifacts…</span>
		<div class="artifacts-skeleton">
			{#each Array(2) as _}
				<div class="artifact-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Artifacts unavailable</span>
{:else if data}
	<div class="artifacts" role="region" aria-label="Artifacts collection">
		{#if data.artifacts.length === 0}
			<p class="artifacts-empty">No artifacts to display</p>
		{:else}
			{#each data.artifacts as artifact (artifact.id)}
				<div class="artifact-card">
					<div class="artifact-type">{formatType(artifact.artifactType)}</div>
					<div class="artifact-content">
						<p class="artifact-message">Coming soon</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.artifacts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 1rem;
		padding: 0.5rem 0;
	}

	.artifact-card {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 0.5rem;
		transition: all 0.2s ease;
	}

	.artifact-card:hover {
		background: rgba(0, 0, 0, 0.06);
		border-color: rgba(0, 0, 0, 0.12);
	}

	.artifact-type {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
		margin-bottom: 0.5rem;
	}

	.artifact-content {
		flex: 1;
	}

	.artifact-message {
		margin: 0;
		font-size: 0.875rem;
		font-style: italic;
		opacity: 0.6;
	}

	.artifacts-empty {
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem 1rem;
		font-size: 0.875rem;
		opacity: 0.6;
		margin: 0;
	}

	.artifacts-skeleton {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 1rem;
	}

	.artifact-placeholder {
		height: 6rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.5rem;
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

	:global(.dark) .artifact-card {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(.dark) .artifact-card:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.16);
	}

	:global(.dark) .artifact-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
