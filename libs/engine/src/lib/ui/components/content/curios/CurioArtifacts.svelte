<script lang="ts">
	/**
	 * CurioArtifacts — Display a tenant's artifact collection.
	 *
	 * Fetches artifacts from the API, evaluates discovery rules,
	 * and renders each artifact through ArtifactRenderer.
	 */
	import type { ArtifactDisplay } from '$lib/curios/artifacts';
	import { evaluateDiscoveryRules } from '$lib/curios/artifacts';
	import ArtifactRenderer from './artifacts/ArtifactRenderer.svelte';

	let { arg = '' }: { arg?: string } = $props();

	let artifacts = $state<ArtifactDisplay[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let tenantId = $state('');

	$effect(() => {
		const url = arg
			? `/api/curios/artifacts?type=${encodeURIComponent(arg)}`
			: '/api/curios/artifacts';
		fetch(url) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ artifacts: ArtifactDisplay[]; tenantId?: string }>;
			})
			.then((d) => {
				artifacts = d.artifacts ?? [];
				tenantId = d.tenantId ?? '';
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioArtifacts] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	/**
	 * Filter artifacts by discovery rules (client-side evaluation)
	 */
	const visibleArtifacts = $derived.by(() => {
		const now = new Date();
		const context = {
			hour: now.getHours(),
			dayOfWeek: now.getDay(),
			date: now.toISOString().slice(5, 10),
			isDarkMode: typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
		};

		return artifacts.filter((a) => {
			if (a.visibility === 'always') return true;
			if (a.visibility === 'easter-egg' || a.visibility === 'hidden') {
				return evaluateDiscoveryRules(a.discoveryRules ?? [], context);
			}
			return true;
		});
	});
</script>

<!-- Loading skeleton -->
{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading artifacts…</span>
		<div class="artifacts-skeleton">
			{#each Array(3) as _}
				<div class="artifact-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>

<!-- Error state -->
{:else if error}
	<span class="grove-curio-error">Artifacts unavailable</span>

<!-- Loaded -->
{:else if visibleArtifacts.length > 0}
	<div class="artifacts" role="region" aria-label="Artifacts collection">
		{#each visibleArtifacts as artifact (artifact.id)}
			<ArtifactRenderer {artifact} {tenantId} />
		{/each}
	</div>
{:else if artifacts.length === 0}
	<p class="artifacts-empty">No artifacts to display</p>
{/if}

<style>
	.artifacts {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		padding: 0.5rem 0;
		justify-content: center;
	}

	.artifacts-empty {
		text-align: center;
		padding: 2rem 1rem;
		font-size: 0.875rem;
		opacity: 0.6;
		margin: 0;
	}

	.artifacts-skeleton {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.artifact-placeholder {
		width: 6rem;
		height: 6rem;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 0.75rem;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.3; }
	}

	:global(.dark) .artifact-placeholder {
		background: rgba(255, 255, 255, 0.08);
	}

	@media (prefers-reduced-motion: reduce) {
		.artifact-placeholder { animation: none; }
	}
</style>
