<script lang="ts">
	/**
	 * CurioStatusbadges — Display a row of animated status badges
	 *
	 * Fetches status badges from the API and displays them as a horizontal row
	 * of pill-shaped badges with icons and text. Animated badges include a
	 * subtle pulse effect that respects prefers-reduced-motion.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		badges: Array<{
			id: string;
			badgeType: string;
			animated: boolean;
			customText: string;
			displayText: string;
			displayIcon: string;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/statusbadge') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioStatusbadges] Failed to load:', err);
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading status badges…</span>
		<div class="statusbadges-skeleton">
			{#each Array(3) as _}
				<div class="statusbadge-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Status badges unavailable</span>
{:else if data}
	<div class="statusbadges" role="region" aria-label="Status badges">
		{#each data.badges as badge (badge.id)}
			<div
				class="statusbadge"
				class:statusbadge-animated={badge.animated}
				title={badge.displayText}
			>
				<span class="statusbadge-icon">{badge.displayIcon}</span>
				<span class="statusbadge-text">{badge.displayText}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.statusbadges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
		padding: 0.5rem 0;
	}

	.statusbadge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.statusbadge:hover {
		background: rgba(0, 0, 0, 0.08);
		border-color: rgba(0, 0, 0, 0.12);
	}

	.statusbadge-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95em;
		line-height: 1;
	}

	.statusbadge-text {
		display: inline;
		white-space: nowrap;
	}

	.statusbadge-animated {
		animation: pulse-badge 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse-badge {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.statusbadge-animated {
			animation: none;
			opacity: 0.9;
		}
	}

	.statusbadges-skeleton {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.statusbadge-placeholder {
		display: inline-block;
		width: 5.5rem;
		height: 1.75rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 999px;
	}

	:global(.dark) .statusbadge {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(.dark) .statusbadge:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.16);
	}

	:global(.dark) .statusbadge-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
