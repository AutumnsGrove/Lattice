<script lang="ts">
	/**
	 * MediaSpeedToggle — Cycles playback speed through 0.5x, 1x, 2x.
	 *
	 * Displays current speed with the active one highlighted.
	 */
	import { SPEED_OPTIONS, type PlaybackSpeed } from "./types";

	interface Props {
		/** Current playback speed */
		speed: PlaybackSpeed;
		/** Callback when speed changes */
		onchange: (speed: PlaybackSpeed) => void;
	}

	let { speed, onchange }: Props = $props();

	function cycle() {
		const idx = SPEED_OPTIONS.indexOf(speed);
		const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
		onchange(next);
	}
</script>

<button
	class="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors duration-200 hover:bg-white/10"
	onclick={cycle}
	aria-label="Playback speed: {speed}x. Click to change."
	title="Playback speed"
>
	{#each SPEED_OPTIONS as opt}
		<span
			class="rounded px-1 py-0.5 transition-all duration-150 {opt === speed
				? 'bg-white/20 font-semibold'
				: 'opacity-40'}"
		>
			{opt}x
		</span>
	{/each}
</button>
