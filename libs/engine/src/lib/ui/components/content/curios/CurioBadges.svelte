<script lang="ts">
	/**
	 * CurioBadges v2 — Glass Ornament Badge Showcase
	 *
	 * Each badge is a frosted glass pane — content floating behind translucent
	 * glass with blurred edges and warm tint. Like holding sea glass up to the light.
	 *
	 * Features:
	 * - 3 wall layouts: pinboard, shadow box, journal page
	 * - 3 showcase styles: glowing shelf, pinned to header, larger + centered
	 * - 5 rarity levels with clarity + glow + depth
	 * - Category-based shapes (rectangle, shield, leaf, star)
	 * - Pride badges: glass IS the flag (stained glass segments)
	 * - Hover detail cards with description + earned date
	 * - Respects prefers-reduced-motion
	 */

	import type {
		BadgeDisplay,
		BadgesDisplayConfig,
		BadgeRarity,
	} from "$lib/curios/badges";
	import {
		getRarityColor,
		getRarityGlowColor,
		getBadgeSizePx,
		getPrideFlagColors,
		formatEarnedDate,
		DEFAULT_CONFIG,
		BADGE_RARITY_OPTIONS,
	} from "$lib/curios/badges";

	let { arg = "" }: { arg?: string } = $props();

	let badges = $state<BadgeDisplay[]>([]);
	let config = $state<BadgesDisplayConfig>(DEFAULT_CONFIG);
	let loading = $state(true);
	let error = $state(false);
	let expandedBadge = $state<string | null>(null);

	$effect(() => {
		Promise.all([
			fetch("/api/curios/badges") // csrf-ok
				.then((r) => {
					if (!r.ok) throw new Error(`HTTP ${r.status}`);
					return r.json() as Promise<{ badges: BadgeDisplay[] }>;
				}),
			fetch("/api/curios/badges/config") // csrf-ok
				.then((r) => {
					if (!r.ok) return { config: DEFAULT_CONFIG };
					return r.json() as Promise<{ config: BadgesDisplayConfig }>;
				})
				.catch(() => ({ config: DEFAULT_CONFIG })),
		])
			.then(([badgeData, configData]) => {
				badges = badgeData.badges || [];
				config = configData.config || DEFAULT_CONFIG;
				loading = false;
			})
			.catch((err) => {
				console.warn("[CurioBadges] Failed to load:", err);
				error = true;
				loading = false;
			});
	});

	const showcasedBadges = $derived(badges.filter((b) => b.isShowcased));
	const collectionBadges = $derived(badges.filter((b) => !b.isShowcased));
	const badgeSizePx = $derived(getBadgeSizePx(config.badgeSize));

	function toggleDetail(id: string) {
		expandedBadge = expandedBadge === id ? null : id;
	}

	function handleKeydown(e: KeyboardEvent, id: string) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggleDetail(id);
		}
		if (e.key === "Escape") {
			expandedBadge = null;
		}
	}

	function prideFlagGradient(colors: string[]): string {
		const step = 100 / colors.length;
		return colors
			.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`)
			.join(", ");
	}

	function pinboardRotation(id: string): number {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = (hash << 5) - hash + id.charCodeAt(i);
			hash |= 0;
		}
		return (Math.abs(hash) % 9) - 4;
	}

	function getRarityLabel(rarity: BadgeRarity): string {
		const opt = BADGE_RARITY_OPTIONS.find((r) => r.value === rarity);
		return opt?.label ?? "Common";
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading badges…</span>
		<div class="badges-skeleton">
			{#each Array(4) as _}
				<div class="badge-placeholder" style="--size: {badgeSizePx}px"></div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Badges unavailable</span>
{:else if badges.length > 0}
	<div
		class="badges-curio"
		class:layout-pinboard={config.wallLayout === "pinboard"}
		class:layout-shadow-box={config.wallLayout === "shadow-box"}
		class:layout-journal={config.wallLayout === "journal-page"}
		style="--badge-size: {badgeSizePx}px"
	>
		<!-- Showcase section -->
		{#if showcasedBadges.length > 0}
			<div
				class="showcase-section"
				class:showcase-shelf={config.showcaseStyle === "glowing-shelf"}
				class:showcase-pinned={config.showcaseStyle === "pinned-to-header"}
				class:showcase-centered={config.showcaseStyle === "larger-centered"}
				role="list"
				aria-label="Showcased badges"
			>
				{#each showcasedBadges as badge (badge.id)}
					{@const prideColors = getPrideFlagColors(badge.id)}
					{@const rotation =
						config.wallLayout === "pinboard" ? pinboardRotation(badge.id) : 0}
					<div
						class="badge-glass"
						class:shape-rectangle={badge.shape === "rectangle"}
						class:shape-shield={badge.shape === "shield"}
						class:shape-leaf={badge.shape === "leaf"}
						class:shape-star={badge.shape === "star"}
						class:rarity-common={badge.rarity === "common"}
						class:rarity-uncommon={badge.rarity === "uncommon"}
						class:rarity-rare={badge.rarity === "rare"}
						class:rarity-epic={badge.rarity === "epic"}
						class:rarity-legendary={badge.rarity === "legendary"}
						class:is-pride={!!prideColors}
						class:is-showcased={true}
						class:is-expanded={expandedBadge === badge.id}
						role="listitem"
						tabindex="0"
						onclick={() => toggleDetail(badge.id)}
						onkeydown={(e) => handleKeydown(e, badge.id)}
						style="
							--rarity-color: {getRarityColor(badge.rarity)};
							--rarity-glow: {getRarityGlowColor(badge.rarity)};
							--rotation: {rotation}deg;
							{prideColors ? `--pride-gradient: linear-gradient(180deg, ${prideFlagGradient(prideColors)});` : ''}
						"
						aria-label="{badge.name} — {badge.description} ({getRarityLabel(badge.rarity)})"
					>
						<div class="glass-pane">
							{#if badge.iconUrl}
								<img
									class="badge-icon"
									src={badge.iconUrl}
									alt=""
									loading="lazy"
									width={badgeSizePx * 0.45}
									height={badgeSizePx * 0.45}
								/>
							{:else}
								<div class="badge-icon-fallback" aria-hidden="true">
									<svg
										width={badgeSizePx * 0.35}
										height={badgeSizePx * 0.35}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="8" r="6" />
										<path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
									</svg>
								</div>
							{/if}
							<span class="badge-label">{badge.name}</span>
						</div>

						{#if expandedBadge === badge.id}
							<div class="detail-card" role="tooltip">
								<p class="detail-name">{badge.name}</p>
								<p class="detail-desc">{badge.description}</p>
								<div class="detail-meta">
									<span
										class="detail-rarity"
										style="color: {getRarityColor(badge.rarity)}"
									>
										{getRarityLabel(badge.rarity)}
									</span>
									<span class="detail-date"
										>Earned {formatEarnedDate(badge.earnedAt)}</span
									>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Collection / wall section -->
		{#if collectionBadges.length > 0}
			<div class="wall-section" role="list" aria-label="Badge collection">
				{#each collectionBadges as badge (badge.id)}
					{@const prideColors = getPrideFlagColors(badge.id)}
					{@const rotation =
						config.wallLayout === "pinboard" ? pinboardRotation(badge.id) : 0}
					<div
						class="badge-glass"
						class:shape-rectangle={badge.shape === "rectangle"}
						class:shape-shield={badge.shape === "shield"}
						class:shape-leaf={badge.shape === "leaf"}
						class:shape-star={badge.shape === "star"}
						class:rarity-common={badge.rarity === "common"}
						class:rarity-uncommon={badge.rarity === "uncommon"}
						class:rarity-rare={badge.rarity === "rare"}
						class:rarity-epic={badge.rarity === "epic"}
						class:rarity-legendary={badge.rarity === "legendary"}
						class:is-pride={!!prideColors}
						class:is-expanded={expandedBadge === badge.id}
						role="listitem"
						tabindex="0"
						onclick={() => toggleDetail(badge.id)}
						onkeydown={(e) => handleKeydown(e, badge.id)}
						style="
							--rarity-color: {getRarityColor(badge.rarity)};
							--rarity-glow: {getRarityGlowColor(badge.rarity)};
							--rotation: {rotation}deg;
							{prideColors ? `--pride-gradient: linear-gradient(180deg, ${prideFlagGradient(prideColors)});` : ''}
						"
						aria-label="{badge.name} — {badge.description} ({getRarityLabel(badge.rarity)})"
					>
						<div class="glass-pane">
							{#if badge.iconUrl}
								<img
									class="badge-icon"
									src={badge.iconUrl}
									alt=""
									loading="lazy"
									width={badgeSizePx * 0.45}
									height={badgeSizePx * 0.45}
								/>
							{:else}
								<div class="badge-icon-fallback" aria-hidden="true">
									<svg
										width={badgeSizePx * 0.35}
										height={badgeSizePx * 0.35}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="8" r="6" />
										<path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
									</svg>
								</div>
							{/if}
							<span class="badge-label">{badge.name}</span>
						</div>

						{#if expandedBadge === badge.id}
							<div class="detail-card" role="tooltip">
								<p class="detail-name">{badge.name}</p>
								<p class="detail-desc">{badge.description}</p>
								<div class="detail-meta">
									<span
										class="detail-rarity"
										style="color: {getRarityColor(badge.rarity)}"
									>
										{getRarityLabel(badge.rarity)}
									</span>
									<span class="detail-date"
										>Earned {formatEarnedDate(badge.earnedAt)}</span
									>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ========================================================================
	   CURIO CONTAINER
	   ======================================================================== */

	.badges-curio {
		padding: 0.75rem 0;
	}

	/* ========================================================================
	   SHOWCASE SECTION
	   ======================================================================== */

	.showcase-section {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
	}

	/* Glowing shelf — glass shelf with soft glow beneath */
	.showcase-shelf {
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(255, 255, 255, 0.04) 60%,
			rgba(255, 255, 255, 0.08) 100%
		);
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.75rem 0.75rem 0 0;
		padding: 1.25rem 1rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .showcase-shelf {
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(255, 255, 255, 0.02) 60%,
			rgba(255, 255, 255, 0.05) 100%
		);
		border-bottom-color: rgba(255, 255, 255, 0.08);
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.15),
			0 1px 0 rgba(255, 255, 255, 0.03) inset;
	}

	/* Pinned to header — compact row */
	.showcase-pinned {
		gap: 0.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .showcase-pinned {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	/* Larger + centered — badges upscaled with shimmer */
	.showcase-centered {
		justify-content: center;
		padding-bottom: 1rem;
	}

	.showcase-centered .badge-glass {
		width: calc(var(--badge-size) * 1.2);
		min-height: calc(var(--badge-size) * 1.2);
	}

	/* ========================================================================
	   WALL SECTION
	   ======================================================================== */

	.wall-section {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	/* Shadow box — neat grid */
	.layout-shadow-box .wall-section {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--badge-size), 1fr));
		gap: 0.75rem;
		justify-items: center;
	}

	/* Pinboard — organic scatter with rotation */
	.layout-pinboard .wall-section {
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(139, 115, 85, 0.04);
		border-radius: 0.75rem;
	}

	:global(.dark) .layout-pinboard .wall-section {
		background: rgba(139, 115, 85, 0.06);
	}

	.layout-pinboard .badge-glass {
		transform: rotate(var(--rotation));
	}

	/* Journal page — cream bg, loose spacing */
	.layout-journal .wall-section {
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 253, 245, 0.6);
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .layout-journal .wall-section {
		background: rgba(30, 25, 20, 0.4);
		border-color: rgba(255, 255, 255, 0.04);
	}

	/* ========================================================================
	   GLASS BADGE
	   ======================================================================== */

	.badge-glass {
		position: relative;
		width: var(--badge-size);
		min-height: var(--badge-size);
		cursor: pointer;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		outline: none;
	}

	.badge-glass:focus-visible {
		outline: 2px solid var(--rarity-color, #8b7355);
		outline-offset: 3px;
		border-radius: 0.5rem;
	}

	/* Hover — warm glow + slight lift */
	.badge-glass:hover,
	.badge-glass:focus-visible {
		transform: translateY(-3px) rotate(var(--rotation, 0deg));
		box-shadow: 0 6px 20px var(--rarity-glow, rgba(0, 0, 0, 0.08));
	}

	/* Showcased — subtle emphasis */
	.badge-glass.is-showcased {
		filter: brightness(1.02);
	}

	/* ========================================================================
	   GLASS PANE — the frosted glass surface
	   ======================================================================== */

	.glass-pane {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		height: 100%;
		min-height: var(--badge-size);
		padding: 0.5rem;
		border-radius: 0.75rem;
		text-align: center;
		overflow: hidden;
	}

	/* ── Rarity: Glass clarity + glow + depth ─────────────────────────── */

	/* Common — cloudy frosted, no glow */
	.rarity-common .glass-pane {
		background: rgba(255, 255, 255, 0.35);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .rarity-common .glass-pane {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.08);
	}

	/* Uncommon — clearer, soft warm edge glow */
	.rarity-uncommon .glass-pane {
		background: rgba(255, 255, 255, 0.45);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(90, 158, 111, 0.2);
		box-shadow:
			0 1px 4px rgba(0, 0, 0, 0.04),
			0 0 8px rgba(90, 158, 111, 0.1);
	}

	:global(.dark) .rarity-uncommon .glass-pane {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(90, 158, 111, 0.2);
		box-shadow:
			0 1px 4px rgba(0, 0, 0, 0.1),
			0 0 12px rgba(90, 158, 111, 0.15);
	}

	/* Rare — crystal clear, visible aura */
	.rarity-rare .glass-pane {
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(4px);
		border: 1px solid rgba(107, 163, 190, 0.25);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.06),
			0 0 16px rgba(107, 163, 190, 0.15);
	}

	:global(.dark) .rarity-rare .glass-pane {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(107, 163, 190, 0.25);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.12),
			0 0 20px rgba(107, 163, 190, 0.2);
	}

	/* Epic — deep gemstone, gentle pulse */
	.rarity-epic .glass-pane {
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(3px);
		border: 1px solid rgba(155, 125, 184, 0.3);
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.06),
			0 0 20px rgba(155, 125, 184, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
	}

	:global(.dark) .rarity-epic .glass-pane {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(155, 125, 184, 0.3);
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.15),
			0 0 24px rgba(155, 125, 184, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	/* Legendary — prismatic, inner light */
	.rarity-legendary .glass-pane {
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(2px);
		border: 1px solid rgba(212, 160, 86, 0.35);
		box-shadow:
			0 3px 16px rgba(0, 0, 0, 0.08),
			0 0 24px rgba(212, 160, 86, 0.25),
			inset 0 0 12px rgba(212, 160, 86, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	:global(.dark) .rarity-legendary .glass-pane {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(212, 160, 86, 0.35);
		box-shadow:
			0 3px 16px rgba(0, 0, 0, 0.2),
			0 0 32px rgba(212, 160, 86, 0.3),
			inset 0 0 16px rgba(212, 160, 86, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	/* ── Pride badges: glass IS the flag ──────────────────────────────── */

	.is-pride .glass-pane {
		background: var(--pride-gradient, rgba(255, 255, 255, 0.35));
		opacity: 0.85;
	}

	:global(.dark) .is-pride .glass-pane {
		opacity: 0.75;
	}

	/* ── Category shapes ──────────────────────────────────────────────── */

	.shape-rectangle .glass-pane {
		border-radius: 0.5rem;
	}

	.shape-shield .glass-pane {
		border-radius: 0.5rem 0.5rem 0.5rem 0.5rem;
		clip-path: polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%);
		padding-bottom: 1rem;
	}

	.shape-leaf .glass-pane {
		border-radius: 2rem 0.5rem 2rem 0.5rem;
	}

	.shape-star .glass-pane {
		border-radius: 0.75rem;
	}

	/* ── Animations (respects prefers-reduced-motion) ─────────────────── */

	@media (prefers-reduced-motion: no-preference) {
		.rarity-epic .glass-pane {
			animation: epic-pulse 4s ease-in-out infinite;
		}

		.rarity-legendary .glass-pane {
			animation: legendary-glow 3s ease-in-out infinite;
		}

		.badge-glass {
			animation: settle-in 0.4s ease-out both;
		}

		.badge-glass:nth-child(2) {
			animation-delay: 0.05s;
		}
		.badge-glass:nth-child(3) {
			animation-delay: 0.1s;
		}
		.badge-glass:nth-child(4) {
			animation-delay: 0.15s;
		}
		.badge-glass:nth-child(5) {
			animation-delay: 0.2s;
		}
		.badge-glass:nth-child(n + 6) {
			animation-delay: 0.25s;
		}
	}

	@keyframes epic-pulse {
		0%,
		100% {
			box-shadow:
				0 2px 12px rgba(0, 0, 0, 0.06),
				0 0 20px rgba(155, 125, 184, 0.2),
				inset 0 1px 0 rgba(255, 255, 255, 0.3);
		}
		50% {
			box-shadow:
				0 2px 12px rgba(0, 0, 0, 0.06),
				0 0 28px rgba(155, 125, 184, 0.3),
				inset 0 1px 0 rgba(255, 255, 255, 0.35);
		}
	}

	@keyframes legendary-glow {
		0%,
		100% {
			box-shadow:
				0 3px 16px rgba(0, 0, 0, 0.08),
				0 0 24px rgba(212, 160, 86, 0.25),
				inset 0 0 12px rgba(212, 160, 86, 0.08);
		}
		50% {
			box-shadow:
				0 3px 16px rgba(0, 0, 0, 0.08),
				0 0 36px rgba(212, 160, 86, 0.35),
				inset 0 0 16px rgba(212, 160, 86, 0.12);
		}
	}

	@keyframes settle-in {
		from {
			opacity: 0;
			transform: translateY(6px) rotate(var(--rotation, 0deg));
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate(var(--rotation, 0deg));
		}
	}

	/* ========================================================================
	   BADGE CONTENT
	   ======================================================================== */

	.badge-icon {
		border-radius: 0.375rem;
		object-fit: cover;
		flex-shrink: 0;
	}

	.badge-icon-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--rarity-color, #8b7355);
		opacity: 0.7;
	}

	:global(.dark) .badge-icon-fallback {
		opacity: 0.8;
	}

	.badge-label {
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1.2;
		color: rgba(0, 0, 0, 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
		padding: 0 0.125rem;
	}

	:global(.dark) .badge-label {
		color: rgba(255, 255, 255, 0.8);
	}

	/* ========================================================================
	   DETAIL CARD (click-to-expand)
	   ======================================================================== */

	.detail-card {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		min-width: 180px;
		max-width: 240px;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 0.75rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		text-align: left;
	}

	:global(.dark) .detail-card {
		background: rgba(30, 30, 30, 0.92);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.detail-name {
		font-size: 0.8125rem;
		font-weight: 700;
		margin: 0 0 0.25rem 0;
		color: var(--color-text, #1a1a1a);
	}

	.detail-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted, #666);
		margin: 0 0 0.5rem 0;
		line-height: 1.4;
	}

	.detail-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.detail-rarity {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.detail-date {
		font-size: 0.6875rem;
		color: var(--color-text-muted, #888);
	}

	/* ========================================================================
	   SKELETON
	   ======================================================================== */

	.badges-skeleton {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 0;
	}

	.badge-placeholder {
		width: var(--size, 88px);
		height: var(--size, 88px);
		border-radius: 0.75rem;
		background: rgba(0, 0, 0, 0.05);
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	:global(.dark) .badge-placeholder {
		background: rgba(255, 255, 255, 0.05);
	}

	@keyframes skeleton-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* ========================================================================
	   SCREEN READER
	   ======================================================================== */

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

	/* ========================================================================
	   RESPONSIVE
	   ======================================================================== */

	@media (max-width: 480px) {
		.badges-curio {
			--badge-size: 64px;
		}

		.showcase-section {
			gap: 0.5rem;
		}
	}
</style>
