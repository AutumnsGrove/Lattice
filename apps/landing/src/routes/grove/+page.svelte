<script lang="ts">
	/**
	 * /grove — The Living Grove
	 *
	 * A cinematic, interactive visualization of the Grove codebase
	 * growing from its first commit to today. Each package is a floating
	 * island in an archipelago, covered in trees that represent code.
	 */
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { MediaPlayer } from "@autumnsgrove/lattice/ui/media-player";
	import { seasonStore } from "@autumnsgrove/lattice/ui/stores";
	import { Trees, Sprout, MapPin } from "lucide-svelte";
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

<main class="flex min-h-screen flex-col">
	<Header user={data.user} />

	{#if data.frames.length > 0}
		<!-- Main visualization with MediaPlayer -->
		<div class="relative flex-1">
			<MediaPlayer
				duration={data.totalFrames}
				bind:currentTime={currentFrame}
				loop={true}
				label="Living Grove timeline"
				formatTime={formatFrameAsDate}
				frameInterval={150}
			>
				{#snippet content()}
					<div class="h-[calc(100vh-160px)] w-full">
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
											class="underline decoration-dotted underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
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
	{:else}
		<!-- Empty state: census data not yet generated -->
		<section
			class="flex flex-1 items-center justify-center bg-gradient-to-b from-grove-50 to-cream-100 px-6 py-24 dark:from-bark-950 dark:to-grove-950"
		>
			<div class="mx-auto max-w-lg text-center">
				<div
					class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-grove-100 dark:bg-grove-900/30"
				>
					<Trees class="h-8 w-8 text-grove-600 dark:text-grove-400" />
				</div>

				<h1 class="text-2xl font-semibold text-foreground">
					The Living Grove
				</h1>

				<p class="mt-3 text-foreground-muted">
					A cinematic visualization of the Grove codebase, growing from its first commit
					to today. Each package becomes a floating island in an archipelago, covered in
					trees that represent code.
				</p>

				<div
					class="mt-8 rounded-xl border border-grove-200 bg-white/60 p-5 text-left backdrop-blur-sm dark:border-grove-800 dark:bg-white/5"
				>
					<h2 class="mb-3 text-sm font-medium text-foreground">
						What you'll see here
					</h2>
					<ul class="space-y-2 text-sm text-foreground-muted">
						<li class="flex items-start gap-2">
							<Sprout class="mt-0.5 h-4 w-4 shrink-0 text-grove-500" />
							<span>Trees that grow taller as packages gain more code</span>
						</li>
						<li class="flex items-start gap-2">
							<Trees class="mt-0.5 h-4 w-4 shrink-0 text-grove-500" />
							<span>Different species for each language — cherry blossoms for Svelte, pines for TypeScript</span>
						</li>
						<li class="flex items-start gap-2">
							<MapPin class="mt-0.5 h-4 w-4 shrink-0 text-grove-500" />
							<span>A timeline you can scrub through, watching the forest grow over months</span>
						</li>
					</ul>
				</div>

				<p class="mt-6 text-xs text-foreground-subtle">
					The grove census generates this data from git history.
					Once it runs, the visualization will appear here.
				</p>
			</div>
		</section>
	{/if}

	<Footer />
</main>
