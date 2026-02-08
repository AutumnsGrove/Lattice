<!--
  HeroRefuge — "Your words deserve room to bloom."
  The growth catalyst. Trees arranged small-to-large (right to left)
  telling a visual growth story. Lanterns light the path.
  More trees and lanterns revealed on larger screens.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Sprout } from 'lucide-svelte';
	import {
		TreePine,
		Lantern
	} from '@autumnsgrove/groveengine/ui/nature';
	import { greens, bark } from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="forest" ariaLabel="Your words deserve room to bloom">
	{#snippet text()}
		<h2 class="text-2xl sm:text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Your words deserve room to bloom.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			No ads. No algorithms. Just your voice, growing in soil you own.
		</p>
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Plant Your Blog
			<Sprout class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full">
			<!-- Growth story: small → large, right → left -->

			<!-- === ALWAYS VISIBLE (mobile+) === -->

			<!-- Sapling — smallest, far right -->
			<div class="absolute bottom-[11%] right-[8%] md:right-[10%]">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.bark} class="w-6 h-12 md:w-8 md:h-16 lg:w-10 lg:h-20 opacity-50" />
			</div>

			<!-- Young tree — growing -->
			<div class="absolute bottom-[9%] right-[22%] md:right-[24%]">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="w-10 h-20 md:w-14 md:h-28 lg:w-16 lg:h-32 opacity-70" />
			</div>

			<!-- Established tree — medium -->
			<div class="absolute bottom-[7%] right-[38%] md:right-[40%]">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="w-14 h-28 md:w-20 md:h-40 lg:w-24 lg:h-48" />
			</div>

			<!-- Lantern — marking the path of growth -->
			<div class="absolute bottom-[8%] right-[30%] md:right-[32%]">
				<Lantern animate={active} class="w-4 h-7 md:w-5 md:h-9 lg:w-5 lg:h-9" variant="standing" />
			</div>

			<!-- === TABLET+ (md) — the mature tree appears === -->

			<!-- Mature tree — tallest, completing the growth arc -->
			<div class="absolute bottom-[6%] right-[52%] hidden md:block">
				<TreePine {season} animate={active} color={greens.meadow} trunkColor={bark.warmBark} class="md:w-22 md:h-44 lg:w-28 lg:h-54" />
			</div>

			<!-- Second lantern — near the young tree -->
			<div class="absolute bottom-[9%] right-[16%] hidden md:block">
				<Lantern animate={active} class="md:w-4 md:h-7 lg:w-4 lg:h-7 opacity-65" variant="standing" />
			</div>

			<!-- Background tiny sapling — suggests the cycle continues -->
			<div class="absolute bottom-[13%] right-[3%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-5 md:h-10 lg:w-6 lg:h-12 opacity-30" />
			</div>

			<!-- === DESKTOP (lg) — full growth story with depth === -->

			<!-- Ancient tree — the grandest, far left -->
			<div class="absolute bottom-[5%] right-[65%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.spring} trunkColor={bark.warmBark} class="lg:w-30 lg:h-58 opacity-90" />
			</div>

			<!-- Background depth pine — behind the arc -->
			<div class="absolute bottom-[14%] right-[45%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-10 lg:h-20 opacity-25" />
			</div>

			<!-- Third lantern — near the ancient tree -->
			<div class="absolute bottom-[5%] right-[58%] hidden lg:block">
				<Lantern animate={active} class="lg:w-5 lg:h-9 opacity-60" variant="post" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
