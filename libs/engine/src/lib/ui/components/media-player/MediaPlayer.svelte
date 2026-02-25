<script lang="ts">
	/**
	 * MediaPlayer — Universal slot-based media player.
	 *
	 * Wraps any sequential content with glassmorphic playback controls.
	 * Supports frame-based playback (visualizations, slideshows) and
	 * can be adapted for video/audio in the future.
	 *
	 * @example
	 * ```svelte
	 * <MediaPlayer duration={365} bind:currentTime={frame} loop>
	 *   {#snippet content()}
	 *     <MyVisualization frame={frame} />
	 *   {/snippet}
	 * </MediaPlayer>
	 * ```
	 */
	import type { Snippet } from "svelte";
	import { SPEED_OPTIONS, type PlaybackSpeed } from "./types";
	import MediaControls from "./MediaControls.svelte";

	interface Props {
		/** Total frames or seconds of content */
		duration: number;
		/** Current position (bindable). Defaults to 0 */
		currentTime?: number;
		/** Playback speed multiplier. Defaults to 1 */
		speed?: PlaybackSpeed;
		/** Whether playback is active (bindable). Defaults to false */
		playing?: boolean;
		/** Loop when reaching the end. Defaults to false */
		loop?: boolean;
		/** Accessible label for the player region */
		label?: string;
		/** Show time/frame display in controls. Defaults to true */
		showTimestamps?: boolean;
		/** Custom formatter for time display */
		formatTime?: (time: number) => string;
		/** Interval in ms between frames during playback. Defaults to 100 (10fps) */
		frameInterval?: number;
		/** The content to display inside the player */
		content: Snippet;
	}

	let {
		duration,
		currentTime = $bindable(0),
		speed = $bindable(1),
		playing = $bindable(false),
		loop = $bindable(false),
		label = "Media player",
		showTimestamps = true,
		formatTime = defaultFormatTime,
		frameInterval = 100,
		content,
	}: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const progress = $derived(duration > 0 ? currentTime / (duration - 1) : 0);

	function defaultFormatTime(time: number): string {
		return String(Math.round(time));
	}

	function play() {
		if (playing) return;
		playing = true;
	}

	function pause() {
		playing = false;
	}

	function stepBack() {
		pause();
		currentTime = Math.max(0, currentTime - 1);
	}

	function stepForward() {
		pause();
		if (currentTime < duration - 1) {
			currentTime = currentTime + 1;
		} else if (loop) {
			currentTime = 0;
		}
	}

	function seek(p: number) {
		currentTime = Math.round(p * (duration - 1));
	}

	function changeSpeed(s: PlaybackSpeed) {
		speed = s;
	}

	function toggleLoop() {
		loop = !loop;
	}

	function toggleFullscreen() {
		if (!containerEl) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			containerEl.requestFullscreen();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Only handle when focus is within the player
		if (!containerEl?.contains(document.activeElement) && document.activeElement !== containerEl) {
			return;
		}

		switch (e.code) {
			case "Space":
				e.preventDefault();
				playing ? pause() : play();
				break;
			case "ArrowLeft":
				e.preventDefault();
				stepBack();
				break;
			case "ArrowRight":
				e.preventDefault();
				stepForward();
				break;
			case "KeyF":
				e.preventDefault();
				toggleFullscreen();
				break;
			case "KeyL":
				e.preventDefault();
				toggleLoop();
				break;
		}
	}

	// Playback tick effect
	$effect(() => {
		if (playing) {
			const adjustedInterval = frameInterval / speed;
			intervalId = setInterval(() => {
				if (currentTime < duration - 1) {
					currentTime = currentTime + 1;
				} else if (loop) {
					currentTime = 0;
				} else {
					playing = false;
				}
			}, adjustedInterval);
		} else if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	bind:this={containerEl}
	class="media-player relative flex flex-col"
	role="region"
	aria-label={label}
	tabindex={-1}
>
	<!-- Content area -->
	<div class="relative flex-1">
		{@render content()}
	</div>

	<!-- Controls -->
	<div class="relative z-10 p-3">
		<MediaControls
			{playing}
			{currentTime}
			{duration}
			{speed}
			{loop}
			{progress}
			{showTimestamps}
			{formatTime}
			onplay={play}
			onpause={pause}
			onstepback={stepBack}
			onstepforward={stepForward}
			onseek={seek}
			onspeedchange={changeSpeed}
			onlooptoggle={toggleLoop}
			onfullscreen={toggleFullscreen}
		/>
	</div>
</div>
