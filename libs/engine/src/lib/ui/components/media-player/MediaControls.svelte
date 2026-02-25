<script lang="ts">
	/**
	 * MediaControls — Glassmorphic control bar for the MediaPlayer.
	 *
	 * Renders play/pause, step forward/back, scrubber, speed toggle,
	 * loop toggle, fullscreen toggle, and optional time display.
	 */
	import type { PlaybackSpeed } from "./types";
	import MediaScrubber from "./MediaScrubber.svelte";
	import MediaSpeedToggle from "./MediaSpeedToggle.svelte";

	interface Props {
		playing: boolean;
		currentTime: number;
		duration: number;
		speed: PlaybackSpeed;
		loop: boolean;
		progress: number;
		showTimestamps: boolean;
		formatTime: (time: number) => string;
		onplay: () => void;
		onpause: () => void;
		onstepback: () => void;
		onstepforward: () => void;
		onseek: (progress: number) => void;
		onspeedchange: (speed: PlaybackSpeed) => void;
		onlooptoggle: () => void;
		onfullscreen: () => void;
	}

	let {
		playing,
		currentTime,
		duration,
		speed,
		loop,
		progress,
		showTimestamps,
		formatTime,
		onplay,
		onpause,
		onstepback,
		onstepforward,
		onseek,
		onspeedchange,
		onlooptoggle,
		onfullscreen,
	}: Props = $props();
</script>

<div
	class="flex flex-col gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md transition-colors duration-1000"
>
	<!-- Scrubber row -->
	<MediaScrubber {progress} {onseek} />

	<!-- Controls row -->
	<div class="flex items-center justify-between">
		<!-- Left: transport controls -->
		<div class="flex items-center gap-1">
			<!-- Step back -->
			<button
				class="rounded-md p-1.5 transition-colors duration-200 hover:bg-white/10"
				onclick={onstepback}
				aria-label="Step back one frame"
				title="Step back (←)"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
				</svg>
			</button>

			<!-- Play/Pause -->
			<button
				class="rounded-lg p-2 transition-colors duration-200 hover:bg-white/10"
				onclick={playing ? onpause : onplay}
				aria-label={playing ? "Pause" : "Play"}
				title={playing ? "Pause (Space)" : "Play (Space)"}
			>
				{#if playing}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>

			<!-- Step forward -->
			<button
				class="rounded-md p-1.5 transition-colors duration-200 hover:bg-white/10"
				onclick={onstepforward}
				aria-label="Step forward one frame"
				title="Step forward (→)"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
				</svg>
			</button>

			<!-- Time display -->
			{#if showTimestamps}
				<span class="ml-2 font-mono text-xs opacity-70">
					{formatTime(currentTime)} / {formatTime(duration - 1)}
				</span>
			{/if}
		</div>

		<!-- Right: speed, loop, fullscreen -->
		<div class="flex items-center gap-1">
			<MediaSpeedToggle {speed} onchange={onspeedchange} />

			<!-- Loop toggle -->
			<button
				class="rounded-md p-1.5 transition-colors duration-200 hover:bg-white/10 {loop
					? 'bg-white/15'
					: ''}"
				onclick={onlooptoggle}
				aria-label={loop ? "Loop enabled. Click to disable." : "Loop disabled. Click to enable."}
				title="Loop (L)"
			>
				<svg
					class="h-4 w-4 {loop ? '' : 'opacity-40'}"
					fill="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
				</svg>
			</button>

			<!-- Fullscreen toggle -->
			<button
				class="rounded-md p-1.5 transition-colors duration-200 hover:bg-white/10"
				onclick={onfullscreen}
				aria-label="Toggle fullscreen"
				title="Fullscreen (F)"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
