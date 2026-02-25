<script lang="ts">
	/**
	 * /grove — The Living Grove
	 *
	 * A cinematic, interactive visualization of the Grove codebase
	 * growing from its first commit to today. Each package is a floating
	 * island in an archipelago, covered in trees that represent code.
	 */
	import { MediaPlayer } from "@autumnsgrove/lattice/ui/media-player";
	import { seasonStore } from "@autumnsgrove/lattice/ui/stores";
	import GroveArchipelago from "./components/GroveArchipelago.svelte";

	let { data } = $props();

	let currentFrame = $state(0);

	const season = $derived(seasonStore.current);

	/** Safely clamp a frame index within bounds */
	function clampFrame(idx: number): number {
		if (data.frames.length === 0) return 0;
		return Math.max(0, Math.min(Math.round(idx), data.frames.length - 1));
	}

	/** Format frame index as a readable date */
	function formatFrameAsDate(frameIndex: number): string {
		const frame = data.frames[clampFrame(frameIndex)];
		if (!frame) return "";
		const d = new Date(frame.date);
		return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	}

	// Season toggle cycling
	function cycleSeason() {
		seasonStore.cycle();
	}

	// Season icon
	const seasonIcon = $derived.by(() => {
		switch (season) {
			case "spring":
				return "🌸";
			case "summer":
				return "☀️";
			case "autumn":
				return "🍂";
			case "winter":
				return "❄️";
			case "midnight":
				return "🌙";
			default:
				return "🌲";
		}
	});

	const safeFrameData = $derived(data.frames[clampFrame(currentFrame)]);
</script>

<svelte:head>
	<title>The Living Grove — Watch the codebase grow</title>
	<meta
		name="description"
		content="A cinematic visualization of the Grove codebase growing from its first commit to today."
	/>
</svelte:head>

<div class="relative h-screen w-screen overflow-hidden">
	{#if data.frames.length > 0}
		<!-- Main visualization with MediaPlayer -->
		<MediaPlayer
			duration={data.totalFrames}
			bind:currentTime={currentFrame}
			loop={true}
			label="Living Grove timeline"
			formatTime={formatFrameAsDate}
			frameInterval={150}
		>
			{#snippet content()}
				<div class="h-[calc(100vh-80px)] w-full">
					<!-- Header overlay -->
					<div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
						<div class="pointer-events-auto mx-auto max-w-lg">
							<div
								class="rounded-xl border border-white/20 bg-white/15 px-6 py-3 text-center backdrop-blur-md"
							>
								<h1 class="text-lg font-semibold text-bark-900 dark:text-cream-50">
									The Living Grove
								</h1>
								<div
									class="mt-1 flex items-center justify-center gap-4 text-xs text-bark-700 dark:text-cream-300"
								>
									{#if safeFrameData}
										<span class="tabular-nums">
											{safeFrameData.totalLines.toLocaleString()} lines
										</span>
										<span class="opacity-50">·</span>
										<span class="tabular-nums">
											{safeFrameData.totalFiles.toLocaleString()} files
										</span>
									{/if}
									<span class="opacity-50">·</span>
									<a
										href="/journey"
										class="underline decoration-dotted underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
									>
										See this as data →
									</a>
								</div>
							</div>
						</div>
					</div>

					<!-- The archipelago visualization -->
					<GroveArchipelago frames={data.frames} frameIndex={clampFrame(currentFrame)} />
				</div>
			{/snippet}
		</MediaPlayer>
	{:else}
		<!-- Empty state: no census data yet -->
		<div
			class="flex h-full items-center justify-center bg-gradient-to-b from-sky-100 to-emerald-100"
		>
			<div
				class="rounded-xl border border-white/20 bg-white/15 px-8 py-6 text-center backdrop-blur-md"
			>
				<h1 class="text-xl font-semibold text-bark-900">The Living Grove</h1>
				<p class="mt-2 text-sm text-bark-700">
					No census data yet. Run the grove census to see the forest grow.
				</p>
				<pre class="mt-3 rounded-lg bg-black/5 px-4 py-2 text-left text-xs text-bark-600">
bash scripts/grove/grove-census.sh --backfill</pre>
			</div>
		</div>
	{/if}

	<!-- Season toggle (bottom-right) -->
	<button
		class="absolute bottom-20 right-4 z-20 rounded-full border border-white/20 bg-white/15 p-3 backdrop-blur-md transition-all duration-200 hover:bg-white/25"
		onclick={cycleSeason}
		aria-label="Change season (currently {season})"
		title="Change season"
	>
		<span class="text-lg">{seasonIcon}</span>
	</button>
</div>
