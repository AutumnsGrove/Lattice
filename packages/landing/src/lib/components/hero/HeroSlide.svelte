<!--
  HeroSlide — Shared wrapper for hero carousel content slides.
  Layered approach: full-bleed scene → gradient veil → glass text overlay.
  Handles background gradient, Lexend typography, entrance animations
  (motion-safe gated), and semantic HTML for accessibility.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Season } from '@autumnsgrove/groveengine/ui/nature';
	import { getGradientClasses, type BgVariant } from './hero-types';
	import { Lexend } from '@autumnsgrove/groveengine/ui/typography';

	interface Props {
		season: Season;
		active: boolean;
		bgVariant?: BgVariant;
		ariaLabel: string;
		text: Snippet;
		scene: Snippet;
	}

	let {
		season,
		active,
		bgVariant = 'forest',
		ariaLabel,
		text,
		scene
	}: Props = $props();

	const gradientClass = $derived(getGradientClasses(bgVariant));
</script>

<div
	role="group"
	aria-roledescription="slide"
	aria-label={ariaLabel}
	class="relative w-full h-full overflow-hidden bg-gradient-to-br {gradientClass}"
>
	<!-- Layer 1: Full-bleed nature scene -->
	<div class="absolute inset-0" aria-hidden="true">
		{@render scene()}
	</div>

	<!-- Layer 2: Gradient veil for text readability -->
	<div class="absolute inset-0 pointer-events-none
		bg-gradient-to-t from-white/80 via-white/40 to-transparent
		dark:from-emerald-950/85 dark:via-emerald-950/40 dark:to-transparent
		md:bg-gradient-to-r md:from-white/75 md:via-white/30 md:to-transparent
		md:dark:from-emerald-950/80 md:dark:via-emerald-950/30 md:dark:to-transparent">
	</div>

	<!-- Layer 3: Text overlay -->
	<div class="relative z-10 w-full h-full flex flex-col justify-end md:justify-center
		px-6 pt-5 pb-14 md:px-8 lg:px-10 md:max-w-[55%]">
		<Lexend as="div" class="flex flex-col gap-2.5 md:gap-3">
			{@render text()}
		</Lexend>
	</div>
</div>
