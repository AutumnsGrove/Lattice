<script lang="ts">
	/**
	 * Wind Chime — Soft swaying animation. Purely visual.
	 * Material affects visual style: glass, bamboo, metal.
	 */
	import type { WindChimeConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: WindChimeConfig } = $props();

	const material = $derived(config.material || 'glass');

	const chimeColors = $derived.by(() => {
		switch (material) {
			case 'bamboo': return { rod: '#c8a060', string: '#a08040', cap: '#8b6914' };
			case 'metal': return { rod: '#b0b8c0', string: '#889098', cap: '#707880' };
			default: return { rod: 'rgba(180,200,220,0.6)', string: 'rgba(140,170,200,0.5)', cap: 'rgba(160,185,210,0.7)' };
		}
	});

	const rods = [
		{ height: 2.8, delay: 0, x: 12 },
		{ height: 3.4, delay: 0.3, x: 22 },
		{ height: 3.0, delay: 0.6, x: 32 },
		{ height: 3.6, delay: 0.15, x: 42 },
		{ height: 2.6, delay: 0.45, x: 52 },
	];
</script>

<div class="wind-chime" role="img" aria-label="{material} wind chime">
	<svg viewBox="0 0 64 60" class="chime-svg" aria-hidden="true">
		<!-- Top cap/hanger -->
		<ellipse cx="32" cy="6" rx="16" ry="4" fill={chimeColors.cap} opacity="0.6" />
		<!-- Strings + rods -->
		{#each rods as rod}
			<g class="chime-rod" style="animation-delay: {rod.delay}s">
				<!-- String -->
				<line
					x1={rod.x}
					y1="8"
					x2={rod.x}
					y2="18"
					stroke={chimeColors.string}
					stroke-width="0.5"
				/>
				<!-- Rod -->
				<rect
					x={rod.x - 2}
					y="18"
					width="4"
					height={rod.height * 10}
					rx={material === 'bamboo' ? 2 : material === 'metal' ? 1 : 1.5}
					fill={chimeColors.rod}
					opacity={material === 'glass' ? 0.5 : 0.7}
				/>
			</g>
		{/each}
		<!-- Center sail/wind catcher -->
		<path d="M28 10 L32 52 L36 10" fill="none" stroke={chimeColors.string} stroke-width="0.3" opacity="0.3" />
		<circle cx="32" cy="52" r="3" fill={chimeColors.cap} opacity="0.3" />
	</svg>
	<span class="chime-label">{material}</span>
</div>

<style>
	.wind-chime {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.chime-svg {
		width: 4.5rem;
		height: auto;
	}

	.chime-rod {
		transform-origin: top center;
		animation: chime-sway 4s ease-in-out infinite;
	}

	@keyframes chime-sway {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(2deg); }
		75% { transform: rotate(-2deg); }
	}

	.chime-label {
		font-size: 0.6rem;
		opacity: 0.4;
		color: var(--color-text-muted, #888);
	}

	@media (prefers-reduced-motion: reduce) {
		.chime-rod { animation: none; }
	}
</style>
