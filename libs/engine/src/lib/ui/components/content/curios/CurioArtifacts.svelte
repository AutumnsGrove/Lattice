<script lang="ts">
	/**
	 * CurioArtifacts — Display a tenant's artifact collection.
	 *
	 * Fetches all artifacts from the API, evaluates discovery rules,
	 * and renders through ArtifactRenderer. Supports Shelves-style
	 * resolution for inline syntax:
	 *   ::artifacts::           → all visible artifacts
	 *   ::artifacts[My Candle]:: → single artifact by name
	 *   ::artifacts[1]::        → first artifact by sort order
	 *   ::artifacts[art_abc]::  → artifact by ID
	 */
	import type { ArtifactDisplay } from "$lib/curios/artifacts";
	import { evaluateDiscoveryRules } from "$lib/curios/artifacts";
	import ArtifactRenderer from "./artifacts/ArtifactRenderer.svelte";

	let { arg = "" }: { arg?: string } = $props();

	let artifacts = $state<ArtifactDisplay[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let tenantId = $state("");

	$effect(() => {
		fetch("/api/curios/artifacts") // csrf-ok — always fetch all, resolve client-side
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ artifacts: ArtifactDisplay[]; tenantId?: string }>;
			})
			.then((d) => {
				artifacts = d.artifacts ?? [];
				tenantId = d.tenantId ?? "";
				loading = false;
			})
			.catch((err) => {
				console.warn("[CurioArtifacts] Failed to load:", err);
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
			isDarkMode:
				typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
		};

		return artifacts.filter((a) => {
			if (a.visibility === "always") return true;
			if (a.visibility === "easter-egg" || a.visibility === "hidden") {
				return evaluateDiscoveryRules(a.discoveryRules ?? [], context);
			}
			return true;
		});
	});

	/**
	 * Resolve a single artifact from the arg parameter.
	 * Resolution order: numeric index (1-based) → name (case-insensitive) → ID
	 */
	function resolveArtifact(): ArtifactDisplay | null {
		if (!visibleArtifacts.length || !arg) return null;

		// 1. Try as numeric index (1-based)
		const num = Number(arg);
		if (Number.isInteger(num) && num >= 1 && num <= visibleArtifacts.length) {
			return visibleArtifacts[num - 1];
		}

		// 2. Try as case-insensitive name
		const byName = visibleArtifacts.find((a) => a.name.toLowerCase() === arg.toLowerCase());
		if (byName) return byName;

		// 3. Try as artifact ID
		return visibleArtifacts.find((a) => a.id === arg) ?? null;
	}

	const resolved = $derived(arg ? resolveArtifact() : null);
	const showAll = $derived(!arg);
	const notFound = $derived(arg && !loading && !error && !resolved);
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

	<!-- Single resolved artifact -->
{:else if arg && resolved}
	<div class="artifacts" role="region" aria-label="Artifact">
		<ArtifactRenderer artifact={resolved} {tenantId} />
	</div>

	<!-- Not found -->
{:else if notFound}
	<p class="artifacts-not-found">
		Artifact &ldquo;{arg}&rdquo; not found. Check the name and try again.
	</p>

	<!-- Show all visible artifacts -->
{:else if showAll && visibleArtifacts.length > 0}
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

	.artifacts-not-found {
		text-align: center;
		padding: 1.5rem 1rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
		background: rgba(239, 68, 68, 0.06);
		border: 1px solid rgba(239, 68, 68, 0.15);
		border-radius: var(--border-radius-standard, 0.5rem);
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
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 0.3;
		}
	}

	:global(.dark) .artifact-placeholder {
		background: rgba(255, 255, 255, 0.08);
	}

	@media (prefers-reduced-motion: reduce) {
		.artifact-placeholder {
			animation: none;
		}
	}
</style>
