<script lang="ts">
	/**
	 * Music Box — Click to open. Visual gears turn while "playing."
	 * No actual audio — purely visual with a 5-second animation cycle.
	 */
	import type { MusicBoxConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: MusicBoxConfig } = $props();

	const melody = $derived(config.melody || 'classic');

	let playing = $state(false);
	let open = $state(false);

	function toggle() {
		if (playing) return;
		open = true;
		playing = true;
		setTimeout(() => {
			playing = false;
			// Close after a beat
			setTimeout(() => { open = false; }, 800);
		}, 5000);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
	}

	const melodyLabel = $derived.by(() => {
		switch (melody) {
			case 'lullaby': return 'Lullaby';
			case 'forest': return 'Forest Theme';
			case 'waltz': return 'Waltz';
			case 'celeste': return 'Celeste';
			default: return 'Classic';
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="music-box"
	class:open
	class:playing
	onclick={toggle}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Music Box ({melodyLabel}) — click to play"
>
	<!-- Lid -->
	<div class="box-lid">
		<div class="lid-ornament"></div>
	</div>
	<!-- Body -->
	<div class="box-body">
		<!-- Gear visible when open -->
		{#if open}
			<div class="gear-container">
				<svg viewBox="0 0 30 30" class="gear" aria-hidden="true">
					<circle cx="15" cy="15" r="10" fill="none" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="1.5" opacity="0.5" />
					<circle cx="15" cy="15" r="3" fill="rgb(var(--bark-400, 161 137 104))" opacity="0.4" />
					{#each Array(8) as _, i}
						<line
							x1={15 + 8 * Math.cos((i * Math.PI) / 4)}
							y1={15 + 8 * Math.sin((i * Math.PI) / 4)}
							x2={15 + 12 * Math.cos((i * Math.PI) / 4)}
							y2={15 + 12 * Math.sin((i * Math.PI) / 4)}
							stroke="rgb(var(--bark-400, 161 137 104))"
							stroke-width="2"
							stroke-linecap="round"
							opacity="0.4"
						/>
					{/each}
				</svg>
			</div>
		{/if}
		<!-- Musical notes floating out when playing -->
		{#if playing}
			<div class="notes">
				{#each ['♪', '♫', '♩', '♬'] as note, i}
					<span class="note" style="animation-delay: {i * 0.6}s; left: {20 + i * 18}%">{note}</span>
				{/each}
			</div>
		{/if}
	</div>
	<span class="box-melody">{melodyLabel}</span>
</div>

<style>
	.music-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.music-box:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.box-lid {
		width: 4.5rem;
		height: 1.25rem;
		background: linear-gradient(180deg, #c8a830, #a08020);
		border-radius: 4px 4px 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.4s ease;
		transform-origin: bottom left;
		position: relative;
		z-index: 1;
	}

	.open .box-lid {
		transform: rotateX(-60deg) translateY(-0.5rem);
	}

	.lid-ornament {
		width: 1.5rem;
		height: 3px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
	}

	.box-body {
		width: 4.5rem;
		height: 2.5rem;
		background: linear-gradient(180deg, #b09020, #8a7018);
		border-radius: 0 0 4px 4px;
		position: relative;
		overflow: hidden;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	}

	:global(.dark) .box-lid {
		background: linear-gradient(180deg, rgba(200, 168, 48, 0.5), rgba(160, 128, 32, 0.4));
	}

	:global(.dark) .box-body {
		background: linear-gradient(180deg, rgba(176, 144, 32, 0.4), rgba(138, 112, 24, 0.35));
	}

	.gear-container {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gear {
		width: 2rem;
		height: 2rem;
	}

	.playing .gear {
		animation: gear-spin 2s linear infinite;
	}

	@keyframes gear-spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.notes {
		position: absolute;
		top: -1rem;
		left: 0;
		right: 0;
		height: 3rem;
		pointer-events: none;
	}

	.note {
		position: absolute;
		font-size: 1rem;
		color: rgb(var(--grove-600, 22 163 74));
		opacity: 0;
		animation: note-float 2.4s ease-out infinite;
	}

	:global(.dark) .note {
		color: rgb(var(--grove-400, 74 222 128));
	}

	@keyframes note-float {
		0% { transform: translateY(0); opacity: 0; }
		20% { opacity: 0.8; }
		100% { transform: translateY(-2rem) translateX(0.5rem); opacity: 0; }
	}

	.box-melody {
		font-size: 0.6rem;
		opacity: 0.45;
		color: var(--color-text-muted, #888);
		margin-top: 0.25rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.box-lid { transition: none; }
		.playing .gear, .note { animation: none; }
		.note { opacity: 0.5; }
	}
</style>
