<!--
  HeroOwnership — Slide 2: "Your words. Your space. Forever."
  Personal space — the domain. TreeAspen growing tall, GardenGate,
  Butterfly, Fern + Bush, monospace domain display.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import {
		TreeAspen,
		GardenGate,
		Butterfly,
		Fern,
		Bush
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="mist" ariaLabel="Your words, your space, forever">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
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
			<!-- Tall aspen — shifted right of center -->
			<div class="absolute bottom-[8%] right-[25%] md:right-[30%]">
				<TreeAspen {season} animate={active} class="w-16 h-32 md:w-22 md:h-44" />
			</div>

			<!-- Garden gate — center-right -->
			<div class="absolute bottom-[6%] right-[50%] md:right-[55%]">
				<GardenGate class="w-14 h-16 md:w-18 md:h-22 opacity-75" />
			</div>

			<!-- Butterfly — upper right -->
			<div class="absolute top-[22%] right-[18%]">
				<Butterfly animate={active} class="w-7 h-7 md:w-9 md:h-9" />
			</div>

			<!-- Foliage — spread across bottom -->
			<div class="absolute bottom-[4%] right-[10%]">
				<Fern class="w-10 h-8 md:w-12 md:h-10 opacity-65" />
			</div>
			<div class="absolute bottom-[6%] left-[35%] md:left-[45%]">
				<Bush {season} class="w-16 h-12 opacity-50" />
			</div>
			<div class="absolute bottom-[3%] right-[40%] hidden md:block">
				<Fern class="w-8 h-6 opacity-40" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
