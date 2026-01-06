<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	// Use centralized icon registry instead of direct lucide-svelte imports
	import { MapPin, ArrowRight } from "$lib/ui/components/icons";

	/**
	 * RoadmapPreview - A glass card showing current development phase
	 *
	 * Displays the current phase of Grove's development with a progress bar
	 * and links to the full roadmap. Used on landing page and plant signup.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <RoadmapPreview
	 *   phase="Thaw"
	 *   subtitle="The ice begins to crack"
	 *   description="Grove opens its doors. The first trees take root."
	 *   progress={33}
	 *   href="/roadmap"
	 * />
	 * ```
	 */

	interface Props {
		/** Current phase name */
		phase?: string;
		/** Phase subtitle/tagline */
		subtitle?: string;
		/** Brief description of what's happening */
		description?: string;
		/** Progress percentage (0-100) */
		progress?: number;
		/** Link to full roadmap */
		href?: string;
		/** Whether to open link in new tab */
		external?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		phase = "Thaw",
		subtitle = "The ice begins to crack",
		description = "Grove opens its doors. The first trees take root.",
		progress = 33,
		href = "/roadmap",
		external = false,
		class: className
	}: Props = $props();

	const linkTarget = $derived(external ? "_blank" : undefined);
	const linkRel = $derived(external ? "noopener noreferrer" : undefined);
</script>

<a
	{href}
	target={linkTarget}
	rel={linkRel}
	class={cn(
		"block rounded-2xl p-6 transition-transform hover:scale-[1.02] group",
		"bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md",
		"border border-white/40 dark:border-emerald-800/25",
		className
	)}
>
	<div class="flex items-start justify-between mb-4">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<MapPin class="w-4 h-4 text-primary" />
				<span class="text-xs text-foreground-subtle uppercase tracking-wide">Currently</span>
			</div>
			<h3 class="text-xl font-serif text-foreground">{phase}</h3>
			<p class="text-sm text-foreground-muted italic">{subtitle}</p>
		</div>
		<ArrowRight class="w-5 h-5 text-foreground-subtle group-hover:text-primary group-hover:translate-x-1 transition-all" />
	</div>

	<!-- Progress bar -->
	<div class="mb-3">
		<div class="h-2 bg-surface rounded-full overflow-hidden">
			<div
				class="h-full bg-primary rounded-full transition-all duration-500"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	<p class="text-sm text-foreground-subtle">
		{description}
	</p>
</a>
