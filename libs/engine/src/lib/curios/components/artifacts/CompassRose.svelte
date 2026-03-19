<script lang="ts">
	/**
	 * Compass Rose — An ornate compass whose needle always points... somewhere.
	 * Points to a URL, a page on the site, or a concept.
	 */
	import type { CompassRoseConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: CompassRoseConfig } = $props();

	const pointsTo = $derived(config.pointsTo || 'the garden');
	const pointsToUrl = $derived(config.pointsToUrl || '');

	// Needle wobbles slightly, then settles pointing "north" (up-ish with slight offset)
	let settled = $state(false);

	$effect(() => {
		const timer = setTimeout(() => { settled = true; }, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="compass-rose" role="img" aria-label="Compass pointing to {pointsTo}">
	<div class="compass-body">
		<svg viewBox="0 0 60 60" class="compass-svg" aria-hidden="true">
			<!-- Outer ring -->
			<circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3" />
			<circle cx="30" cy="30" r="25" fill="rgba(200,180,120,0.05)" stroke="currentColor" stroke-width="0.5" opacity="0.2" />
			<!-- Cardinal marks -->
			<text x="30" y="9" text-anchor="middle" font-size="5" font-weight="700" fill="currentColor" opacity="0.5">N</text>
			<text x="53" y="32" text-anchor="middle" font-size="4" fill="currentColor" opacity="0.3">E</text>
			<text x="30" y="56" text-anchor="middle" font-size="4" fill="currentColor" opacity="0.3">S</text>
			<text x="7" y="32" text-anchor="middle" font-size="4" fill="currentColor" opacity="0.3">W</text>
			<!-- Tick marks -->
			{#each Array(12) as _, i}
				<line
					x1={30 + 22 * Math.cos((i * Math.PI) / 6 - Math.PI / 2)}
					y1={30 + 22 * Math.sin((i * Math.PI) / 6 - Math.PI / 2)}
					x2={30 + 24 * Math.cos((i * Math.PI) / 6 - Math.PI / 2)}
					y2={30 + 24 * Math.sin((i * Math.PI) / 6 - Math.PI / 2)}
					stroke="currentColor"
					stroke-width="0.8"
					opacity="0.2"
				/>
			{/each}
		</svg>
		<!-- Needle -->
		<div class="needle-container" class:settled>
			<svg viewBox="0 0 10 40" class="needle-svg" aria-hidden="true">
				<!-- North pointer (red) -->
				<polygon points="5,0 8,18 2,18" fill="#e53e3e" opacity="0.8" />
				<!-- South pointer (dark) -->
				<polygon points="5,40 8,22 2,22" fill="currentColor" opacity="0.3" />
				<!-- Center dot -->
				<circle cx="5" cy="20" r="2.5" fill="currentColor" opacity="0.4" />
			</svg>
		</div>
	</div>
	{#if pointsToUrl}
		<a href={pointsToUrl} class="compass-label" rel="noopener noreferrer">{pointsTo}</a>
	{:else}
		<span class="compass-label">{pointsTo}</span>
	{/if}
</div>

<style>
	.compass-rose {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-text, #333);
	}

	:global(.dark) .compass-rose {
		color: rgb(var(--cream-200, 243 237 224));
	}

	.compass-body {
		position: relative;
		width: 5rem;
		height: 5rem;
	}

	.compass-svg {
		width: 100%;
		height: 100%;
	}

	.needle-container {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.8rem;
		height: 3rem;
		transform: translate(-50%, -50%) rotate(15deg);
		animation: needle-wobble 1.2s ease-out forwards;
	}

	.needle-container.settled {
		transform: translate(-50%, -50%) rotate(-12deg);
	}

	.needle-svg {
		width: 100%;
		height: 100%;
	}

	@keyframes needle-wobble {
		0% { transform: translate(-50%, -50%) rotate(45deg); }
		25% { transform: translate(-50%, -50%) rotate(-30deg); }
		50% { transform: translate(-50%, -50%) rotate(20deg); }
		75% { transform: translate(-50%, -50%) rotate(-15deg); }
		100% { transform: translate(-50%, -50%) rotate(-12deg); }
	}

	.compass-label {
		font-size: 0.7rem;
		font-style: italic;
		opacity: 0.6;
		color: var(--color-text-muted, #888);
		text-decoration: none;
	}

	a.compass-label:hover {
		color: var(--grove-accent-dark);
		opacity: 1;
	}

	:global(.dark) a.compass-label:hover {
		color: var(--grove-accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.needle-container { animation: none; transform: translate(-50%, -50%) rotate(-12deg); }
	}
</style>
