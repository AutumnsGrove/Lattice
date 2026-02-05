<!--
  HeroRefuge — Slide 1: "A grove for people who lost their groves"
  The emotional hook. Grove Logo center, TreePine + TreeCherry flanking,
  Fireflies ambient, GrassTuft + Mushroom on the ground.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Sprout } from 'lucide-svelte';
	import {
		Logo,
		TreePine,
		TreeCherry,
		Firefly,
		GrassTuft,
		Mushroom
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="forest" ariaLabel="A grove for people who lost their groves">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			A grove for people who lost their groves.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			No ads. No algorithms. Just your words, growing in soil you own.
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
			<!-- Background trees — spread across full canvas, weighted right -->
			<div class="absolute bottom-[8%] left-[15%] md:left-[35%]">
				<TreePine {season} animate={active} class="w-14 h-24 md:w-20 md:h-36 opacity-50" />
			</div>
			<div class="absolute bottom-[8%] right-[8%] md:right-[12%]">
				<TreeCherry {season} animate={active} class="w-16 h-24 md:w-20 md:h-36 opacity-55" />
			</div>
			<div class="absolute bottom-[8%] right-[28%] hidden md:block">
				<TreePine {season} animate={active} class="w-14 h-28 opacity-40" />
			</div>

			<!-- Center logo — focal point, shifted right on desktop -->
			<div class="absolute bottom-[25%] right-[20%] md:right-[30%]">
				<Logo size={72} {season} />
			</div>

			<!-- Ground elements — spread wide -->
			<div class="absolute bottom-[4%] left-[40%] md:left-[45%]">
				<GrassTuft class="w-10 h-5 md:w-12 md:h-6 opacity-60" />
			</div>
			<div class="absolute bottom-[3%] right-[18%]">
				<Mushroom class="w-6 h-6 md:w-7 md:h-7" />
			</div>
			<div class="absolute bottom-[4%] right-[35%]">
				<GrassTuft class="w-8 h-4 opacity-45" />
			</div>

			<!-- Fireflies — scattered across the full canvas -->
			<div class="absolute top-[18%] right-[25%]">
				<Firefly animate={active} class="w-2.5 h-2.5" intensity="subtle" />
			</div>
			<div class="absolute top-[35%] right-[15%]">
				<Firefly animate={active} class="w-2 h-2" intensity="subtle" />
			</div>
			<div class="absolute top-[12%] left-[45%] md:left-[55%]">
				<Firefly animate={active} class="w-3 h-3" intensity="normal" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
