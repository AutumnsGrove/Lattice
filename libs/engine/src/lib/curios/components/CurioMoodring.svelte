<script lang="ts">
	/**
	 * CurioMoodring — A mystical mood artifact
	 *
	 * Renders one of 7 shapes with aurora gradient animation,
	 * smooth color interpolation, and optional dot constellation mood log.
	 */

	import { lightenHex, darkenHex, getSeasonalColor, lerpHexColors } from "$lib/curios/moodring";
	import { seasonStore } from "$lib/ui/stores";
	import type { MoodDisplayStyle } from "$lib/curios/moodring";

	let { arg = "" }: { arg?: string } = $props();

	interface MoodConfig {
		mode: string;
		currentColor: string;
		currentMoodName: string;
		displayStyle: string;
		nextColor?: string;
		driftT?: number;
		showMoodLog?: boolean;
	}

	interface MoodLogEntry {
		mood: string;
		color: string;
		note: string | null;
		loggedAt: string;
	}

	let config = $state<MoodConfig | null>(null);
	let logEntries = $state<MoodLogEntry[]>([]);
	let loading = $state(true);
	let error = $state(false);

	// The effective color after client-side overrides (seasonal, random drift)
	let effectiveColor = $derived.by(() => {
		if (!config) return "#7cb85c";

		// Seasonal mode: use client-side seasonStore for instant reactivity (includes midnight)
		if (config.mode === "seasonal") {
			return getSeasonalColor(seasonStore.current).color;
		}

		// Random mode: interpolate toward nextColor using drift progress
		if (config.mode === "random" && config.nextColor && config.driftT !== undefined) {
			return lerpHexColors(config.currentColor, config.nextColor, config.driftT);
		}

		return config.currentColor;
	});

	let moodName = $derived.by(() => {
		if (!config) return "";
		if (config.mode === "seasonal") {
			return getSeasonalColor(seasonStore.current).name;
		}
		return config.currentMoodName;
	});

	let colorLight = $derived(lightenHex(effectiveColor, 0.15));
	let colorDark = $derived(darkenHex(effectiveColor, 0.15));
	let displayStyle = $derived((config?.displayStyle || "ring") as MoodDisplayStyle);

	$effect(() => {
		fetch("/api/curios/moodring") // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ config: MoodConfig }>;
			})
			.then((d) => {
				config = d.config;
				loading = false;

				// Fetch mood log if enabled
				if (d.config.showMoodLog) {
					fetch("/api/curios/moodring/log") // csrf-ok
						.then((r) => (r.ok ? (r.json() as Promise<{ entries: MoodLogEntry[] }>) : null))
						.then((d) => {
							if (d?.entries) logEntries = d.entries;
						})
						.catch(() => {});
				}
			})
			.catch((err) => {
				console.warn("[CurioMoodring] Failed to load:", err);
				error = true;
				loading = false;
			});
	});

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			});
		} catch {
			return iso;
		}
	}
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
{:else if config}
	<div
		class="moodring"
		style="--mood-color: {effectiveColor}; --mood-color-light: {colorLight}; --mood-color-dark: {colorDark};"
	>
		<div class="moodring-display" role="img" aria-label="Current mood: {moodName}">
			<div class="mood-shape mood-shape--{displayStyle}">
				<div class="mood-aurora"></div>
			</div>
		</div>
		<span class="moodring-label">{moodName}</span>

		{#if logEntries.length > 0}
			<div class="moodring-constellation" aria-label="Mood history">
				{#each logEntries as entry, i}
					<div
						class="constellation-dot"
						style="background-color: {entry.color}; opacity: {Math.max(0.3, 1 - i * 0.03)};"
						title="{entry.mood}{entry.note ? ` — ${entry.note}` : ''} · {formatDate(
							entry.loggedAt,
						)}"
					></div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ==========================================================================
	   Aurora Animation — CSS @property for conic-gradient rotation
	   ========================================================================== */

	@property --aurora-angle {
		syntax: "<angle>";
		initial-value: 0deg;
		inherits: false;
	}

	@keyframes aurora-rotate {
		to {
			--aurora-angle: 360deg;
		}
	}

	/* ==========================================================================
	   Container
	   ========================================================================== */

	.moodring {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	.moodring-display {
		position: relative;
	}

	.moodring-label {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.03em;
		color: var(--mood-color);
		text-align: center;
		transition: color 2s ease;
	}

	/* ==========================================================================
	   Shape — Shared base
	   ========================================================================== */

	.mood-shape {
		position: relative;
		width: 3.5rem;
		height: 3.5rem;
		transition:
			box-shadow 2s ease,
			background 2s ease,
			border-color 2s ease;
	}

	.mood-aurora {
		position: absolute;
		inset: -3px;
		border-radius: inherit;
		background: conic-gradient(
			from var(--aurora-angle, 0deg),
			var(--mood-color-light),
			var(--mood-color),
			var(--mood-color-dark),
			var(--mood-color),
			var(--mood-color-light)
		);
		opacity: 0.4;
		z-index: -1;
		animation: aurora-rotate 8s linear infinite;
		filter: blur(6px);
	}

	/* ==========================================================================
	   Shape — Ring (hollow circle with glowing border)
	   ========================================================================== */

	.mood-shape--ring {
		border-radius: 50%;
		border: 3px solid var(--mood-color);
		background: color-mix(in srgb, var(--mood-color) 8%, transparent);
		box-shadow:
			0 0 12px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 24px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}

	.mood-shape--ring .mood-aurora {
		border-radius: 50%;
	}

	/* ==========================================================================
	   Shape — Gem (rotated diamond with faceted gradient)
	   ========================================================================== */

	.mood-shape--gem {
		width: 2.75rem;
		height: 2.75rem;
		transform: rotate(45deg);
		border-radius: 4px;
		background: linear-gradient(
			135deg,
			var(--mood-color-light) 0%,
			var(--mood-color) 50%,
			var(--mood-color-dark) 100%
		);
		box-shadow:
			0 0 14px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 28px color-mix(in srgb, var(--mood-color) 20%, transparent);
		margin: 0.375rem;
	}

	.mood-shape--gem .mood-aurora {
		border-radius: 4px;
	}

	/* ==========================================================================
	   Shape — Orb (sphere with radial highlight)
	   ========================================================================== */

	.mood-shape--orb {
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 35%,
			rgba(255, 255, 255, 0.35),
			var(--mood-color) 60%
		);
		box-shadow:
			0 0 20px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 40px color-mix(in srgb, var(--mood-color) 25%, transparent);
	}

	.mood-shape--orb .mood-aurora {
		border-radius: 50%;
	}

	/* ==========================================================================
	   Shape — Crystal (hexagonal prism)
	   ========================================================================== */

	.mood-shape--crystal {
		clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
		background: linear-gradient(
			160deg,
			var(--mood-color-light) 0%,
			color-mix(in srgb, var(--mood-color-light) 60%, white) 20%,
			var(--mood-color) 50%,
			var(--mood-color-dark) 80%,
			color-mix(in srgb, var(--mood-color-dark) 60%, black) 100%
		);
		box-shadow: 0 0 18px color-mix(in srgb, var(--mood-color) 40%, transparent);
	}

	.mood-shape--crystal .mood-aurora {
		clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
		inset: -4px;
	}

	/* ==========================================================================
	   Shape — Flame (asymmetric teardrop)
	   ========================================================================== */

	.mood-shape--flame {
		border-radius: 50% 50% 50% 0%;
		transform: rotate(-45deg);
		background: radial-gradient(
			circle at 50% 60%,
			var(--mood-color-light),
			var(--mood-color) 50%,
			var(--mood-color-dark) 100%
		);
		box-shadow:
			0 0 16px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 32px color-mix(in srgb, var(--mood-color) 25%, transparent);
	}

	.mood-shape--flame .mood-aurora {
		border-radius: 50% 50% 50% 0%;
	}

	/* ==========================================================================
	   Shape — Leaf (organic shape with slight rotation)
	   ========================================================================== */

	.mood-shape--leaf {
		border-radius: 50% 0% 50% 0%;
		transform: rotate(-15deg);
		background: linear-gradient(
			135deg,
			var(--mood-color-light) 0%,
			var(--mood-color) 50%,
			var(--mood-color-dark) 100%
		);
		box-shadow:
			0 0 14px color-mix(in srgb, var(--mood-color) 45%, transparent),
			0 0 28px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}

	.mood-shape--leaf .mood-aurora {
		border-radius: 50% 0% 50% 0%;
	}

	/* ==========================================================================
	   Shape — Moon (crescent via inset box-shadow)
	   ========================================================================== */

	.mood-shape--moon {
		border-radius: 50%;
		background: var(--mood-color);
		box-shadow:
			inset -10px 4px 0 0 var(--mood-color-dark),
			0 0 16px color-mix(in srgb, var(--mood-color) 45%, transparent),
			0 0 32px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}

	.mood-shape--moon .mood-aurora {
		border-radius: 50%;
	}

	/* ==========================================================================
	   Dark mode — stronger glow
	   ========================================================================== */

	:global(.dark) .mood-shape--ring,
	:global(.dark) .mood-shape--orb,
	:global(.dark) .mood-shape--crystal,
	:global(.dark) .mood-shape--flame,
	:global(.dark) .mood-shape--leaf,
	:global(.dark) .mood-shape--moon {
		box-shadow:
			0 0 20px color-mix(in srgb, var(--mood-color) 60%, transparent),
			0 0 40px color-mix(in srgb, var(--mood-color) 30%, transparent);
	}

	:global(.dark) .mood-shape--gem {
		box-shadow:
			0 0 18px color-mix(in srgb, var(--mood-color) 60%, transparent),
			0 0 36px color-mix(in srgb, var(--mood-color) 30%, transparent);
	}

	:global(.dark) .mood-shape--moon {
		box-shadow:
			inset -10px 4px 0 0 var(--mood-color-dark),
			0 0 22px color-mix(in srgb, var(--mood-color) 55%, transparent),
			0 0 44px color-mix(in srgb, var(--mood-color) 25%, transparent);
	}

	:global(.dark) .mood-aurora {
		opacity: 0.55;
	}

	/* ==========================================================================
	   Reduced motion — disable all animation
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.mood-aurora {
			animation: none;
		}

		.mood-shape,
		.moodring-label {
			transition: none;
		}
	}

	/* ==========================================================================
	   Dot Constellation — mood log display
	   ========================================================================== */

	.moodring-constellation {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.25rem;
		max-width: 12rem;
		margin-top: 0.25rem;
	}

	.constellation-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		cursor: help;
		transition: transform 0.2s ease;
	}

	.constellation-dot:hover {
		transform: scale(1.8);
	}

	/* ==========================================================================
	   Skeleton
	   ========================================================================== */

	.moodring-skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	.moodring-circle-placeholder {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.08);
	}

	.moodring-label-placeholder {
		height: 0.8rem;
		width: 5rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.25rem;
	}

	:global(.dark) .moodring-circle-placeholder,
	:global(.dark) .moodring-label-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
