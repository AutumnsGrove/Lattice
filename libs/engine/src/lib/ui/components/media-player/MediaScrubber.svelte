<script lang="ts">
	/**
	 * MediaScrubber — Timeline scrubber with drag, click, and keyboard support.
	 *
	 * Glassmorphic track with seasonal accent color on the filled portion.
	 * Supports mouse drag, click-to-seek, and arrow key fine-tuning.
	 */
	import { seasonStore } from "$lib/ui/stores/season.svelte";
	import { themeStore } from "$lib/ui/stores/theme.svelte";

	interface Props {
		/** Current progress as a 0-1 fraction */
		progress: number;
		/** Callback when user seeks to a new position (0-1) */
		onseek: (progress: number) => void;
	}

	let { progress, onseek }: Props = $props();

	let trackEl: HTMLDivElement | undefined = $state();
	let dragging = $state(false);

	const seasonAccent = $derived.by(() => {
		const season = seasonStore.current;
		const dark = themeStore.resolvedTheme === "dark";
		switch (season) {
			case "spring":
				return dark ? "#a3e635" : "#84cc16";
			case "summer":
				return dark ? "#4ade80" : "#16a34a";
			case "autumn":
				return dark ? "#f59e0b" : "#d97706";
			case "winter":
				return dark ? "#94a3b8" : "#64748b";
			case "midnight":
				return dark ? "#8b5cf6" : "#7c3aed";
			default:
				return dark ? "#4ade80" : "#16a34a";
		}
	});

	function seekFromEvent(e: MouseEvent | PointerEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		onseek(x / rect.width);
	}

	function handlePointerDown(e: PointerEvent) {
		dragging = true;
		trackEl?.setPointerCapture(e.pointerId);
		seekFromEvent(e);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		seekFromEvent(e);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		trackEl?.releasePointerCapture(e.pointerId);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex h-8 cursor-pointer items-center px-1"
	bind:this={trackEl}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	role="slider"
	aria-label="Playback position"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={Math.round(progress * 100)}
	tabindex={0}
>
	<!-- Track background -->
	<div
		class="h-1.5 w-full rounded-full transition-colors duration-200 {themeStore.resolvedTheme ===
		'dark'
			? 'bg-white/20'
			: 'bg-black/10'}"
	>
		<!-- Filled portion -->
		<div
			class="h-full rounded-full transition-[width] duration-75"
			style:width="{progress * 100}%"
			style:background-color={seasonAccent}
		></div>
	</div>

	<!-- Thumb -->
	<div
		class="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform duration-100"
		class:scale-125={dragging}
		style:left="{progress * 100}%"
		style:top="50%"
		style:background-color={seasonAccent}
	></div>
</div>
