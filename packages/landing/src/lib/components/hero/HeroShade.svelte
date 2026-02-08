<!--
  HeroShade — "Your words are not a dataset."
  AI protection — the shield. A dense canopy of pines, protective
  and sheltering. Trees layered dark-to-light for atmospheric depth.
  Dense on tablet+, protective wall on desktop.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Shield } from 'lucide-svelte';
	import {
		TreePine
	} from '@autumnsgrove/groveengine/ui/nature';
	import { greens, bark } from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="forest" ariaLabel="Your words are not a dataset — Shade AI protection">
	{#snippet text()}
		<h2 class="text-2xl sm:text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Your words are not a dataset.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			Shade blocks AI scrapers automatically. Your creativity stays human.
		</p>
		<a
			href="/knowledge/help/what-is-shade"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Learn About Shade
			<Shield class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full">
			<!-- === ALWAYS VISIBLE (mobile+) — core canopy === -->

			<!-- Left pine — medium -->
			<div class="absolute bottom-[8%] left-[22%] md:left-[38%]">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="w-14 h-28 md:w-20 md:h-40 lg:w-24 lg:h-48" />
			</div>

			<!-- Center pine — tallest -->
			<div class="absolute bottom-[7%] right-[25%] md:right-[30%]">
				<TreePine {season} animate={active} color={greens.meadow} trunkColor={bark.warmBark} class="w-16 h-32 md:w-22 md:h-44 lg:w-26 lg:h-52" />
			</div>

			<!-- Right pine — slightly smaller -->
			<div class="absolute bottom-[9%] right-[5%] md:right-[10%]">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="w-11 h-22 md:w-16 md:h-32 lg:w-18 lg:h-36 opacity-70" />
			</div>

			<!-- === TABLET+ (md) — fill out the canopy === -->

			<!-- Back-left pine — depth -->
			<div class="absolute bottom-[12%] left-[30%] md:left-[34%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-12 md:h-24 lg:w-14 lg:h-28 opacity-45" />
			</div>

			<!-- Back-right pine — fills gap -->
			<div class="absolute bottom-[11%] right-[18%] hidden md:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="md:w-14 md:h-28 lg:w-16 lg:h-32 opacity-55" />
			</div>

			<!-- Far right accent -->
			<div class="absolute bottom-[13%] right-[3%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-9 md:h-18 lg:w-11 lg:h-22 opacity-35" />
			</div>

			<!-- === DESKTOP (lg) — dense protective wall === -->

			<!-- Extra back pine — leftmost -->
			<div class="absolute bottom-[14%] left-[28%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-10 lg:h-20 opacity-30" />
			</div>

			<!-- Fill pine — between left and center -->
			<div class="absolute bottom-[9%] right-[42%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="lg:w-16 lg:h-34 opacity-65" />
			</div>

			<!-- Far background pine — barely visible, adds depth -->
			<div class="absolute bottom-[15%] right-[50%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-8 lg:h-16 opacity-25" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
