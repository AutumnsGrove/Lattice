<!--
  HeroCentennial — Slide 4: "Some trees outlive the people who planted them"
  Legacy — 100-year guarantee. Large TreePine, Lantern at base,
  StonePath, MushroomCluster, Stars in sky, twilight mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import {
		TreePine,
		Lantern,
		StonePath,
		MushroomCluster,
		Star
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="twilight" ariaLabel="Some trees outlive the people who planted them — 100 year guarantee">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
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
			<!-- Stars — scattered across the full sky -->
			<div class="absolute top-[8%] right-[20%]">
				<Star class="w-2.5 h-2.5 opacity-55" />
			</div>
			<div class="absolute top-[6%] right-[40%]">
				<Star class="w-2 h-2 opacity-35" />
			</div>
			<div class="absolute top-[15%] right-[12%]">
				<Star class="w-3 h-3 opacity-45" />
			</div>
			<div class="absolute top-[12%] left-[40%] md:left-[50%]">
				<Star class="w-2 h-2 opacity-30" />
			</div>
			<div class="absolute top-[5%] left-[55%] hidden md:block">
				<Star class="w-2.5 h-2.5 opacity-40" />
			</div>

			<!-- Large central pine — the sentinel tree, shifted right -->
			<div class="absolute bottom-[8%] right-[22%] md:right-[28%]">
				<TreePine {season} animate={active} class="w-20 h-36 md:w-28 md:h-48" />
			</div>

			<!-- Lantern at base of tree -->
			<div class="absolute bottom-[6%] right-[38%] md:right-[42%]">
				<Lantern animate={active} class="w-5 h-8 md:w-6 md:h-10" variant="standing" />
			</div>

			<!-- Stone path — visible on all sizes now -->
			<div class="absolute bottom-[2%] right-[15%] md:right-[20%]">
				<StonePath class="w-24 h-5 md:w-32 md:h-7 opacity-55" />
			</div>

			<!-- Mushroom cluster -->
			<div class="absolute bottom-[5%] right-[8%]">
				<MushroomCluster class="w-10 h-7 md:w-12 md:h-9" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
