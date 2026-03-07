<!--
  SeasonSwitcher — Interactive demo showing Grove's seasonal theming.
  Visitors click season buttons to see the nature scene transform.
  Pure client-side, no API dependencies.
-->
<script lang="ts">
	import type { Season } from '@autumnsgrove/lattice/ui/nature';
	import {
		TreePine,
		TreeCherry,
		Bush,
		GrassTuft,
		Mushroom,
		Firefly,
		Cardinal,
		Butterfly,
		Snowflake,
		Leaf,
		Fern,
		Rock
	} from '@autumnsgrove/lattice/ui/nature';

	let season = $state<Season>('autumn');

	// Seasonal theme colors — intentional design choice for seasonal differentiation
	// Not status colors, purely visual/thematic
	const seasons: { id: Season; label: string; color: string }[] = [
		{
			id: 'spring',
			label: 'Spring',
			color:
				'bg-success/10 text-success dark:bg-success/20 hover:bg-success/20 dark:hover:bg-success/30'
		},
		{
			id: 'summer',
			label: 'Summer',
			color:
				'bg-warning/10 text-warning dark:bg-warning/20 hover:bg-warning/20 dark:hover:bg-warning/30'
		},
		{
			id: 'autumn',
			label: 'Autumn',
			color:
				'bg-accent/10 text-accent dark:bg-accent/20 hover:bg-accent/20 dark:hover:bg-accent/30'
		},
		{
			id: 'winter',
			label: 'Winter',
			color:
				'bg-info/10 text-info dark:bg-info/20 hover:bg-info/20 dark:hover:bg-info/30'
		}
	];

	// Full Tailwind class strings (not concatenated) so the JIT scanner finds them
	const bgClasses: Record<Season, string> = {
		spring: 'from-success/10 to-accent/5 dark:from-success/20 dark:to-accent/20',
		summer: 'from-warning/10 to-accent/5 dark:from-warning/20 dark:to-accent/20',
		autumn: 'from-accent/10 to-warning/5 dark:from-accent/20 dark:to-warning/20',
		winter: 'from-info/10 to-surface-subtle dark:from-info/20 dark:to-surface-subtle',
		midnight: 'from-accent/20 to-accent/10 dark:from-accent/30 dark:to-accent/20'
	};
</script>

<div
	class="relative w-full overflow-hidden rounded-2xl border border-border shadow-sm
		transition-all duration-700 ease-out bg-gradient-to-br {bgClasses[season]}"
>
	<!-- Scene container -->
	<div class="relative w-full h-[280px] sm:h-[320px] md:h-[360px]">

		<!-- Far layer: Trees -->
		<div class="absolute bottom-[10%] left-[10%] md:left-[15%] transition-transform duration-500">
			<TreePine {season} animate class="w-16 h-28 md:w-20 md:h-36 opacity-80" />
		</div>
		<div class="absolute bottom-[10%] left-[35%] md:left-[40%]">
			<TreeCherry {season} animate class="w-14 h-24 md:w-18 md:h-32 opacity-75" />
		</div>
		<div class="absolute bottom-[10%] right-[10%] md:right-[15%]">
			<TreePine {season} animate class="w-18 h-32 md:w-24 md:h-44 opacity-85" />
		</div>
		<div class="absolute bottom-[10%] right-[30%] hidden md:block">
			<TreeCherry {season} animate class="w-14 h-28 opacity-65" />
		</div>

		<!-- Mid layer: Bushes & foliage -->
		<div class="absolute bottom-[6%] left-[22%]">
			<Bush {season} class="w-14 h-10 md:w-16 md:h-12 opacity-75" />
		</div>
		<div class="absolute bottom-[6%] right-[22%]">
			<Fern class="w-10 h-8 md:w-12 md:h-10 opacity-65" />
		</div>
		<div class="absolute bottom-[6%] left-[50%] -translate-x-1/2">
			<Bush {season} class="w-12 h-8 opacity-60" />
		</div>

		<!-- Ground layer -->
		<div class="absolute bottom-[3%] left-[18%]">
			<GrassTuft class="w-10 h-5 opacity-70" />
		</div>
		<div class="absolute bottom-[2%] right-[35%]">
			<Mushroom class="w-6 h-6 md:w-7 md:h-7 opacity-80" />
		</div>
		<div class="absolute bottom-[3%] left-[45%]">
			<GrassTuft class="w-8 h-4 opacity-55" />
		</div>
		<div class="absolute bottom-[2%] right-[18%]">
			<Rock class="w-8 h-5 opacity-55" />
		</div>

		<!-- Seasonal creatures -->
		{#if season === 'spring'}
			<div class="absolute top-[20%] right-[25%] motion-safe:animate-bounce" style="animation-duration: 3s;">
				<Butterfly animate class="w-6 h-6 md:w-8 md:h-8" />
			</div>
			<div class="absolute top-[35%] left-[30%] motion-safe:animate-bounce" style="animation-duration: 4s; animation-delay: 0.5s;">
				<Butterfly animate class="w-5 h-5" />
			</div>
		{:else if season === 'summer'}
			<div class="absolute top-[15%] right-[20%]">
				<Cardinal animate class="w-7 h-7 md:w-8 md:h-8" />
			</div>
			<div class="absolute top-[30%] right-[40%]">
				<Firefly animate class="w-2.5 h-2.5" intensity="subtle" />
			</div>
		{:else if season === 'autumn'}
			<div class="absolute top-[15%] left-[25%]">
				<div class="motion-safe:animate-spin" style="animation-duration: 8s;"><Leaf class="w-5 h-5 opacity-70" /></div>
			</div>
			<div class="absolute top-[25%] right-[30%]">
				<div class="motion-safe:animate-spin" style="animation-duration: 6s; animation-delay: 1s;"><Leaf class="w-4 h-4 opacity-50" /></div>
			</div>
			<div class="absolute top-[18%] right-[18%]">
				<Cardinal animate class="w-7 h-7" />
			</div>
		{:else if season === 'winter'}
			<div class="absolute top-[12%] left-[20%]">
				<Snowflake class="w-4 h-4 opacity-60 motion-safe:animate-pulse" />
			</div>
			<div class="absolute top-[25%] right-[25%]">
				<div class="motion-safe:animate-pulse" style="animation-delay: 0.5s;"><Snowflake class="w-3 h-3 opacity-40" /></div>
			</div>
			<div class="absolute top-[18%] left-[50%]">
				<div class="motion-safe:animate-pulse" style="animation-delay: 1s;"><Snowflake class="w-5 h-5 opacity-50" /></div>
			</div>
		{/if}

		<!-- Ambient fireflies (all seasons except winter) -->
		{#if season !== 'winter'}
			<div class="absolute top-[22%] left-[55%]">
				<Firefly animate class="w-2 h-2" intensity="subtle" />
			</div>
			<div class="absolute top-[40%] right-[15%]">
				<Firefly animate class="w-2.5 h-2.5" intensity="subtle" />
			</div>
		{/if}
	</div>

	<!-- Ground gradient for depth -->
	<div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20 pointer-events-none" aria-hidden="true"></div>

	<!-- Season selector buttons -->
	<div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
		{#each seasons as s}
			<button
				onclick={() => season = s.id}
				class="px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200
					{season === s.id
						? s.color + ' ring-2 ring-offset-1 ring-current shadow-sm scale-105'
						: 'bg-white/60 text-foreground-muted hover:bg-white/80 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20 backdrop-blur-sm'}"
				aria-pressed={season === s.id}
			>
				{s.label}
			</button>
		{/each}
	</div>
</div>
