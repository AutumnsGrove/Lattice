<script lang="ts">
	/**
	 * CurioBadges — Earned badge showcase
	 *
	 * Displays the tenant's collected badges in a compact grid.
	 * Showcased badges appear first, highlighted. Each badge shows
	 * its icon, name, and rarity on hover/focus.
	 */

	let { arg = '' }: { arg?: string } = $props();

	interface Badge {
		id: string;
		name: string;
		description: string;
		iconUrl: string;
		category: string;
		rarity: string;
		earnedAt: string;
		isShowcased: boolean;
	}

	let badges = $state<Badge[]>([]);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/badges') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ badges: Badge[] }>;
			})
			.then((d) => {
				badges = d.badges || [];
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioBadges] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	const rarityColors: Record<string, string> = {
		common: '#9ca3af',
		uncommon: '#4ade80',
		rare: '#60a5fa',
		epic: '#a78bfa',
		legendary: '#fbbf24',
	};

	function getRarityColor(rarity: string): string {
		return rarityColors[rarity.toLowerCase()] || rarityColors.common;
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading badges…</span>
		<div class="badges-skeleton">
			{#each Array(4) as _}
				<div class="badge-placeholder"></div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Badges unavailable</span>
{:else if badges.length > 0}
	<div class="badges-showcase" role="list" aria-label="Earned badges">
		{#each badges as badge (badge.id)}
			<div
				class="badge-item"
				class:showcased={badge.isShowcased}
				role="listitem"
				title="{badge.name} — {badge.description} ({badge.rarity})"
				style="--rarity-color: {getRarityColor(badge.rarity)}"
			>
				{#if badge.iconUrl}
					<img
						class="badge-icon"
						src={badge.iconUrl}
						alt={badge.name}
						loading="lazy"
						width="32"
						height="32"
					/>
				{:else}
					<div class="badge-icon-fallback" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="8" r="6" />
							<path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
						</svg>
					</div>
				{/if}
				<span class="badge-name">{badge.name}</span>
			</div>
		{/each}
	</div>
{:else}
	<div class="badges-empty">No badges earned yet</div>
{/if}

<style>
	.badges-showcase {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.badge-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem 0.25rem 0.375rem;
		border-radius: 9999px;
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.08);
		font-size: 0.75rem;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		cursor: default;
	}

	:global(.dark) .badge-item {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.badge-item:hover,
	.badge-item:focus-visible {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.badge-item.showcased {
		border-color: var(--rarity-color);
		box-shadow: 0 0 0 1px var(--rarity-color), 0 1px 4px rgba(0, 0, 0, 0.08);
	}

	.badge-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.badge-icon-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.08);
		color: var(--rarity-color, #9ca3af);
		flex-shrink: 0;
	}

	:global(.dark) .badge-icon-fallback {
		background: rgba(255, 255, 255, 0.1);
	}

	.badge-name {
		white-space: nowrap;
		font-weight: 500;
	}

	.badges-empty {
		font-size: 0.8125rem;
		font-style: italic;
		opacity: 0.6;
		padding: 0.5rem 0;
	}

	/* Skeleton */
	.badges-skeleton {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.badge-placeholder {
		width: 80px;
		height: 32px;
		border-radius: 9999px;
		background: rgba(0, 0, 0, 0.08);
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
</style>
