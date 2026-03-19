<script lang="ts">
	/**
	 * Terrarium Globe — A tiny sealed ecosystem in a glass sphere.
	 * Miniature plants gently sway. Purely decorative.
	 */
	import type { TerrariumGlobeConfig } from '$lib/curios/artifacts';

	let { config: _config = {} }: { config: TerrariumGlobeConfig } = $props();
</script>

<div class="terrarium-globe" role="img" aria-label="Terrarium globe with tiny plants">
	<div class="globe-glass">
		<!-- Ground layer -->
		<div class="ground"></div>
		<!-- Plants -->
		<svg viewBox="0 0 60 40" class="plants-svg" aria-hidden="true">
			<!-- Small fern -->
			<g class="plant plant-1">
				<path d="M12 38 Q12 28 8 22" fill="none" stroke="var(--grove-accent)" stroke-width="1.2" opacity="0.7" />
				<path d="M12 38 Q12 30 16 24" fill="none" stroke="var(--grove-accent-dark)" stroke-width="1" opacity="0.6" />
				<ellipse cx="8" cy="21" rx="3" ry="4" fill="var(--grove-accent)" opacity="0.5" />
				<ellipse cx="16" cy="23" rx="2.5" ry="3.5" fill="var(--grove-accent-dark)" opacity="0.4" />
			</g>
			<!-- Tall grass -->
			<g class="plant plant-2">
				<line x1="30" y1="38" x2="28" y2="18" stroke="var(--grove-accent)" stroke-width="1" opacity="0.6" />
				<line x1="32" y1="38" x2="34" y2="20" stroke="var(--grove-accent-dark)" stroke-width="1" opacity="0.5" />
				<line x1="31" y1="38" x2="31" y2="16" stroke="var(--grove-accent)" stroke-width="0.8" opacity="0.4" />
			</g>
			<!-- Small mushroom -->
			<g class="plant plant-3">
				<line x1="46" y1="38" x2="46" y2="32" stroke="rgb(var(--cream-200, 243 237 224))" stroke-width="1.5" opacity="0.5" />
				<ellipse cx="46" cy="31" rx="4" ry="2.5" fill="rgb(var(--bark-400, 161 137 104))" opacity="0.4" />
			</g>
			<!-- Tiny flowers -->
			<circle cx="22" cy="34" r="1.5" fill="#fda4af" opacity="0.5" />
			<circle cx="40" cy="36" r="1" fill="#fde68a" opacity="0.4" />
		</svg>
		<!-- Glass shine -->
		<div class="globe-shine"></div>
		<!-- Condensation droplets -->
		<div class="droplet d1"></div>
		<div class="droplet d2"></div>
	</div>
</div>

<style>
	.terrarium-globe {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.globe-glass {
		position: relative;
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		background: radial-gradient(
			circle at 40% 30%,
			rgba(200, 230, 200, 0.06),
			rgba(150, 200, 150, 0.03)
		);
		border: 1.5px solid rgba(180, 210, 180, 0.3);
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	:global(.dark) .globe-glass {
		background: radial-gradient(
			circle at 40% 30%,
			rgba(100, 160, 100, 0.06),
			rgba(50, 100, 50, 0.03)
		);
		border-color: rgba(120, 160, 120, 0.2);
	}

	.ground {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 35%;
		background: linear-gradient(
			180deg,
			rgb(var(--bark-400, 161 137 104) / 0.15),
			rgb(var(--bark-400, 161 137 104) / 0.25)
		);
		border-radius: 0 0 50% 50%;
	}

	.plants-svg {
		position: absolute;
		bottom: 5%;
		left: 5%;
		width: 90%;
		height: 65%;
	}

	.plant {
		animation: plant-sway 6s ease-in-out infinite;
		transform-origin: bottom center;
	}

	.plant-2 { animation-delay: 1s; }
	.plant-3 { animation-delay: 2s; }

	@keyframes plant-sway {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(1.5deg); }
		75% { transform: rotate(-1.5deg); }
	}

	.globe-shine {
		position: absolute;
		top: 10%;
		left: 18%;
		width: 28%;
		height: 16%;
		background: radial-gradient(ellipse, rgba(255, 255, 255, 0.3), transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.droplet {
		position: absolute;
		width: 3px;
		height: 4px;
		background: rgba(200, 230, 220, 0.3);
		border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
	}

	.d1 { top: 20%; right: 18%; }
	.d2 { top: 40%; right: 12%; width: 2px; height: 3px; }

	@media (prefers-reduced-motion: reduce) {
		.plant { animation: none; }
	}
</style>
