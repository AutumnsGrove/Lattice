<!--
  HeroCommunity — Slide 5: "The internet should feel like home"
  Belonging — the forest. Pond + Reeds + LilyPad, TreeBirch + TreeCherry,
  Robin, Rabbit, Lantern glowing, dawn mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Sprout } from 'lucide-svelte';
	import {
		TreeBirch,
		TreeCherry,
		Pond,
		Reeds,
		LilyPad,
		Robin,
		Rabbit,
		Lantern
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="dawn" ariaLabel="The internet should feel like home — join the Grove community">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
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
			<!-- Trees — framing the scene, weighted right -->
			<div class="absolute bottom-[8%] left-[30%] md:left-[40%]">
				<TreeBirch {season} animate={active} class="w-14 h-26 md:w-20 md:h-38 opacity-60" />
			</div>
			<div class="absolute bottom-[8%] right-[6%] md:right-[10%]">
				<TreeCherry {season} animate={active} class="w-16 h-28 md:w-22 md:h-38 opacity-65" />
			</div>

			<!-- Pond area — center-right -->
			<div class="absolute bottom-[3%] right-[20%] md:right-[25%]">
				<Pond class="w-28 h-12 md:w-36 md:h-16" />
			</div>

			<!-- Reeds beside pond -->
			<div class="absolute bottom-[9%] right-[40%] md:right-[48%]">
				<Reeds class="w-7 h-12 md:w-9 md:h-16 opacity-65" />
			</div>

			<!-- Lily pad on pond -->
			<div class="absolute bottom-[5%] right-[25%] md:right-[30%]">
				<LilyPad class="w-6 h-3.5 md:w-7 md:h-4.5" />
			</div>

			<!-- Robin — upper area -->
			<div class="absolute top-[25%] right-[30%]">
				<Robin animate={active} class="w-6 h-6 md:w-8 md:h-8" />
			</div>

			<!-- Rabbit — near pond -->
			<div class="absolute bottom-[12%] right-[12%]">
				<Rabbit class="w-7 h-7 md:w-9 md:h-9" />
			</div>

			<!-- Lantern glowing — visible on all sizes now -->
			<div class="absolute bottom-[10%] right-[45%] md:right-[52%]">
				<Lantern animate={active} class="w-4 h-7 md:w-5 md:h-9" variant="standing" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
