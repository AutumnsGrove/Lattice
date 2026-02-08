<!--
  HeroOwnership — "Your words. Your space. Forever."
  Personal space — the domain. A gentle grove clearing with pines
  and a welcoming lantern. Trees use explicit palette colors for depth.
  Responsive density: mobile gets 2-3 trees, tablet 4-5, desktop 6+.
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

<HeroSlide {season} {active} bgVariant="forest" ariaLabel="Your words, your space, forever">
	{#snippet text()}
		<h2 class="text-2xl sm:text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Your words. Your space. Forever.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			Get your own corner of the internet at
			<span class="font-mono text-accent-muted font-medium">you.grove.place</span>
		</p>
		<a
			href="/pricing"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Claim Yours
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full">
			<!-- === ALWAYS VISIBLE (mobile+) === -->

			<!-- Main pine — hero tree, right of center -->
			<div class="absolute bottom-[8%] right-[28%] md:right-[35%]">
				<TreePine {season} animate={active} color={greens.grove} trunkColor={bark.warmBark} class="w-14 h-28 md:w-22 md:h-44 lg:w-26 lg:h-52" />
			</div>

			<!-- Secondary pine — smaller, right -->
			<div class="absolute bottom-[10%] right-[8%] md:right-[14%]">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="w-10 h-20 md:w-16 md:h-32 lg:w-18 lg:h-36 opacity-65" />
			</div>

			<!-- Standing lantern — warm glow in the clearing -->
			<div class="absolute bottom-[7%] right-[18%] md:right-[24%]">
				<Lantern animate={active} class="w-4 h-7 md:w-5 md:h-9 lg:w-6 lg:h-11" variant="standing" />
			</div>

			<!-- === TABLET+ (md) === -->

			<!-- Back pine — small, atmospheric depth -->
			<div class="absolute bottom-[12%] right-[48%] md:right-[52%] hidden md:block">
				<TreePine {season} animate={active} color={greens.meadow} trunkColor={bark.warmBark} class="md:w-18 md:h-36 lg:w-22 lg:h-44" />
			</div>

			<!-- Far back pine — distant, muted -->
			<div class="absolute bottom-[13%] right-[5%] hidden md:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="md:w-10 md:h-20 lg:w-12 lg:h-24 opacity-40" />
			</div>

			<!-- === DESKTOP (lg) === -->

			<!-- Extra depth pine — far left of scene -->
			<div class="absolute bottom-[14%] right-[62%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.darkForest} trunkColor={bark.darkBark} class="lg:w-10 lg:h-20 opacity-30" />
			</div>

			<!-- Mid-ground accent pine -->
			<div class="absolute bottom-[10%] right-[42%] hidden lg:block">
				<TreePine {season} animate={active} color={greens.deepGreen} trunkColor={bark.bark} class="lg:w-14 lg:h-28 opacity-55" />
			</div>

			<!-- Second lantern — further back -->
			<div class="absolute bottom-[9%] right-[55%] hidden lg:block">
				<Lantern animate={active} class="lg:w-4 lg:h-7 opacity-60" variant="post" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
