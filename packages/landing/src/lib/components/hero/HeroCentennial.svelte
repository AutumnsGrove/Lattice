<!--
  HeroCentennial — "Some trees outlive the people who planted them."
  Legacy — 100-year guarantee. A grand sentinel pine with
  lanterns glowing at its base. Twilight mood with depth.
  More companion trees and lanterns revealed on larger screens.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import {
		TreePine,
		Lantern
	} from '@autumnsgrove/groveengine/ui/nature';
	import { greens, bark } from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="twilight" ariaLabel="Some trees outlive the people who planted them — 100 year guarantee">
	{#snippet text()}
		<h2 class="text-2xl sm:text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Some trees outlive the people who planted them.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			After 12 months, your blog earns Centennial status — archived for 100 years, no matter what.
		</p>
		<a
			href="/knowledge/help/what-is-centennial"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Plant Your Legacy
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full">
			<!-- === ALWAYS VISIBLE (mobile+) === -->

			<!-- The sentinel — grand central pine -->
			<div class="absolute bottom-[6%] right-[22%] md:right-[30%]">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="w-18 h-36 md:w-28 md:h-52 lg:w-32 lg:h-60" />
			</div>

			<!-- Companion pine — smaller, left of sentinel -->
			<div class="absolute bottom-[9%] right-[42%] md:right-[48%]">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="w-10 h-20 md:w-14 md:h-30 lg:w-16 lg:h-34 opacity-60" />
			</div>

			<!-- Lantern at base — warm glow -->
			<div class="absolute bottom-[5%] right-[35%] md:right-[42%]">
				<Lantern animate={active} class="w-4 h-7 md:w-5 md:h-9 lg:w-6 lg:h-11" variant="standing" />
			</div>

			<!-- === TABLET+ (md) === -->

			<!-- Distant pine — far right background -->
			<div class="absolute bottom-[12%] right-[6%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-10 md:h-20 lg:w-12 lg:h-24 opacity-35" />
			</div>

			<!-- Mid-right pine — between sentinel and far right -->
			<div class="absolute bottom-[10%] right-[12%] hidden md:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="md:w-12 md:h-24 lg:w-14 lg:h-28 opacity-50" />
			</div>

			<!-- Second lantern — post variant, right side -->
			<div class="absolute bottom-[5%] right-[18%] hidden md:block">
				<Lantern animate={active} class="md:w-4 md:h-7 lg:w-5 lg:h-9" variant="post" />
			</div>

			<!-- === DESKTOP (lg) === -->

			<!-- Far-left background pine -->
			<div class="absolute bottom-[14%] right-[58%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-10 lg:h-20 opacity-25" />
			</div>

			<!-- Fill pine — between companion and sentinel -->
			<div class="absolute bottom-[8%] right-[38%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="lg:w-12 lg:h-24 opacity-45" />
			</div>

			<!-- Third lantern — hanging, near leftmost tree -->
			<div class="absolute bottom-[8%] right-[52%] hidden lg:block">
				<Lantern animate={active} class="lg:w-4 lg:h-7 opacity-55" variant="standing" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
