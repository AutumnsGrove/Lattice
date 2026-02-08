<!--
  HeroCommunity — "The internet should feel like home."
  Belonging — the forest. A warm grove of trees with
  lanterns, evoking a welcoming place to gather.
  Progressively denser grove on larger screens.
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

<HeroSlide {season} {active} bgVariant="dawn" ariaLabel="The internet should feel like home — join the Grove community">
	{#snippet text()}
		<h2 class="text-2xl sm:text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			The internet should feel like home.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			A quiet forest of writers, thinkers, and people who just want their own space.
		</p>
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Become a Seedling
			<Sprout class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full">
			<!-- Community grove — trees as neighbors, lanterns as gathering lights -->

			<!-- === ALWAYS VISIBLE (mobile+) === -->

			<!-- Center-left pine — medium grove green -->
			<div class="absolute bottom-[8%] right-[35%] md:right-[40%]">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="w-14 h-28 md:w-20 md:h-40 lg:w-24 lg:h-48" />
			</div>

			<!-- Center-right pine — taller, meadow green -->
			<div class="absolute bottom-[7%] right-[12%] md:right-[18%]">
				<TreePine {season} animate={active} color={greens.meadow} trunkColor={bark.warmBark} class="w-16 h-32 md:w-22 md:h-44 lg:w-26 lg:h-52" />
			</div>

			<!-- Gathering lantern — the heart of the community -->
			<div class="absolute bottom-[6%] right-[24%] md:right-[30%]">
				<Lantern animate={active} class="w-5 h-9 md:w-6 md:h-11 lg:w-7 lg:h-12" variant="standing" />
			</div>

			<!-- === TABLET+ (md) === -->

			<!-- Left pine — background depth -->
			<div class="absolute bottom-[11%] left-[22%] md:left-[34%] hidden md:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="md:w-14 md:h-28 lg:w-16 lg:h-32 opacity-55" />
			</div>

			<!-- Far right pine — edge of the grove -->
			<div class="absolute bottom-[10%] right-[3%] hidden md:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="md:w-10 md:h-20 lg:w-12 lg:h-24 opacity-45" />
			</div>

			<!-- Second lantern — near the right trees -->
			<div class="absolute bottom-[8%] right-[8%] hidden md:block">
				<Lantern animate={active} class="md:w-4 md:h-7 lg:w-5 lg:h-9 opacity-70" variant="standing" />
			</div>

			<!-- Back pine — distant mood -->
			<div class="absolute bottom-[13%] right-[28%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-9 md:h-18 lg:w-11 lg:h-22 opacity-35" />
			</div>

			<!-- === DESKTOP (lg) — dense welcoming grove === -->

			<!-- Far-left background pine -->
			<div class="absolute bottom-[14%] left-[28%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-10 lg:h-20 opacity-25" />
			</div>

			<!-- Fill pine — between left and center -->
			<div class="absolute bottom-[9%] right-[48%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="lg:w-16 lg:h-34 opacity-60" />
			</div>

			<!-- Extra right pine — extends the grove edge -->
			<div class="absolute bottom-[12%] right-[55%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="lg:w-12 lg:h-24 opacity-40" />
			</div>

			<!-- Third lantern — far left, distant warmth -->
			<div class="absolute bottom-[7%] right-[42%] hidden lg:block">
				<Lantern animate={active} class="lg:w-4 lg:h-7 opacity-50" variant="standing" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
