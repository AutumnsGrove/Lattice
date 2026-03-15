<script lang="ts">
	/**
	 * CurioWebring — Classic webring navigation
	 *
	 * Displays webring navigation links (previous, ring name, next)
	 * in a retro webring bar. If arg is provided, filters to a specific webring.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		webrings: Array<{
			id: string;
			ringName: string;
			ringUrl: string;
			prevUrl: string;
			nextUrl: string;
			homeUrl?: string;
			badgeStyle?: string;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/webring') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioWebring] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	function getFilteredWebrings() {
		if (!data) return [];
		if (arg) {
			return data.webrings.filter((w) => w.id === arg);
		}
		return data.webrings;
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading webrings…</span>
		<div class="webring-skeleton">
			<div class="webring-skeleton-bar"></div>
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Webrings unavailable</span>
{:else if data}
	{#each getFilteredWebrings() as webring (webring.id)}
		<div class="webring" role="navigation" aria-label="Webring: {webring.ringName}">
			<a href={webring.prevUrl} class="webring-nav webring-prev" aria-label="Previous site in {webring.ringName}">← Prev</a>
			<a
				href={webring.homeUrl || webring.ringUrl}
				class="webring-name"
				aria-label="Visit {webring.ringName} hub"
			>
				{webring.ringName}
			</a>
			<a href={webring.nextUrl} class="webring-nav webring-next" aria-label="Next site in {webring.ringName}">Next →</a>
		</div>
	{/each}
{/if}

<style>
	.webring {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 0.375rem;
		background: rgba(0, 0, 0, 0.04);
		font-size: 0.875rem;
	}

	:global(.dark) .webring {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.webring-nav {
		padding: 0.25rem 0.5rem;
		text-decoration: none;
		color: rgb(var(--grove-400, 74 222 128));
		font-weight: 500;
		border: 1px solid rgb(var(--grove-400, 74 222 128) / 0.3);
		border-radius: 0.25rem;
		transition: all 0.2s ease;
	}

	:global(.dark) .webring-nav {
		color: rgb(var(--grove-300, 134 239 172));
	}

	.webring-nav:hover {
		background: rgb(var(--grove-400, 74 222 128) / 0.1);
		border-color: rgb(var(--grove-400, 74 222 128) / 0.6);
	}

	:global(.dark) .webring-nav:hover {
		background: rgb(var(--grove-300, 134 239 172) / 0.15);
		border-color: rgb(var(--grove-300, 134 239 172) / 0.6);
	}

	.webring-name {
		padding: 0.25rem 0.75rem;
		text-decoration: none;
		color: inherit;
		font-weight: 600;
		opacity: 0.9;
		transition: opacity 0.2s ease;
	}

	.webring-name:hover {
		opacity: 1;
		text-decoration: underline;
	}

	/* Skeleton */
	.webring-skeleton {
		padding: 0.625rem 1rem;
	}

	.webring-skeleton-bar {
		height: 2.5rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 0.375rem;
	}
</style>
