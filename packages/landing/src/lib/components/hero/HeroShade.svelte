<!--
  HeroShade — Slide 3: "Your words are not a dataset"
  AI protection — the shield. Dense canopy with 2× TreePine + TreeCherry,
  Cardinal perched, falling leaves, bushes, warm/amber mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Shield } from 'lucide-svelte';
	import {
		TreePine,
		TreeCherry,
		Cardinal,
		Bush,
		LeafFalling
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="warm" ariaLabel="Your words are not a dataset — Shade AI protection">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
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
			<!-- Dense canopy — trees spread across canvas, weighted right for shelter feel -->
			<div class="absolute bottom-[8%] left-[25%] md:left-[38%]">
				<TreePine {season} animate={active} class="w-16 h-28 md:w-22 md:h-40" />
			</div>
			<div class="absolute bottom-[8%] right-[8%] md:right-[10%]">
				<TreePine {season} animate={active} class="w-14 h-24 md:w-18 md:h-34 opacity-75" />
			</div>
			<div class="absolute bottom-[8%] right-[25%] md:right-[28%]">
				<TreeCherry {season} animate={active} class="w-18 h-30 md:w-24 md:h-42" />
			</div>

			<!-- Cardinal perched — upper right -->
			<div class="absolute top-[20%] right-[18%]">
				<Cardinal animate={active} class="w-7 h-7 md:w-9 md:h-9" facing="left" />
			</div>

			<!-- Falling leaves — scattered across canopy -->
			<div class="absolute top-[12%] right-[35%]">
				<LeafFalling {season} animate={active} class="w-4 h-4" variant="maple" delay={0} />
			</div>
			<div class="absolute top-[8%] right-[20%]">
				<LeafFalling {season} animate={active} class="w-3.5 h-3.5" variant="cherry" delay={1.5} />
			</div>

			<!-- Ground bushes — wide spread -->
			<div class="absolute bottom-[4%] left-[30%] md:left-[42%]">
				<Bush {season} class="w-14 h-10 md:w-18 md:h-12 opacity-65" />
			</div>
			<div class="absolute bottom-[3%] right-[15%]">
				<Bush {season} class="w-12 h-8 opacity-45" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
