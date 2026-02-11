<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { Glass, GlassCard, Button, Input, GroveTerm } from '@autumnsgrove/groveengine/ui';
  import { Search, Users, Leaf } from '@autumnsgrove/groveengine/ui/icons';
  import {
    CANOPY_CATEGORY_LABELS,
    type CanopyCategory,
  } from '@autumnsgrove/groveengine';
  import { seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
  import {
    Logo,
    TreePine,
    Lantern,
    Firefly,
    FallingLeavesLayer,
    FallingPetalsLayer,
    SnowfallLayer,
    greens, bark, autumn, spring, winter, springBlossoms, autumnReds,
    midnightBloom,
    type Season
  } from '@autumnsgrove/groveengine/ui/nature';
  import { generateTierColors } from '@autumnsgrove/groveengine/ui/utils';
  import { samplePathString } from '$lib/utils/pathUtils';

  // Types derived from engine - defined locally for Svelte 5 runes compatibility
  interface CanopyWanderer {
    subdomain: string;
    display_name: string;
    banner: string;
    categories: CanopyCategory[];
    bloom_count: number;
    avatar_url: string | null;
  }

  interface CategoryCount {
    name: CanopyCategory;
    count: number;
  }

  interface CanopyData {
    wanderers: CanopyWanderer[];
    total: number;
    categories: CategoryCount[];
    seed: string;
  }

  let { data } = $props<{ data: { canopy: CanopyData; user: any } }>();

  // Reactive state
  let searchQuery = $state('');
  let selectedCategory = $state<CanopyCategory | null>(null);

  // --- Season state ---
  const isSpring = $derived(seasonStore.current === 'spring');
  const isAutumn = $derived(seasonStore.current === 'autumn');
  const isWinter = $derived(seasonStore.current === 'winter');
  const isMidnight = $derived(seasonStore.current === 'midnight');

  // --- Miniature forest ---
  type TreeType = 'logo' | 'pine';
  const treeTypes: TreeType[] = ['pine'];

  // Compact viewBox for the mini forest hills
  const hillViewBox = { width: 1200, height: 300 };

  interface MiniTree {
    id: number;
    x: number;
    y: number;
    size: number;
    aspectRatio: number;
    treeType: TreeType;
    trunkColor: string;
    opacity: number;
    zIndex: number;
    brightness: 'dark' | 'mid' | 'light';
  }

  // Hill layer definitions — 3 gentle rolling hills for the miniature scene
  const hillLayerDefs = [
    {
      id: 1,
      curvePath: 'M0 160 Q200 130 400 150 Q600 170 800 140 Q1000 110 1200 145',
      fillPath: 'M0 160 Q200 130 400 150 Q600 170 800 140 Q1000 110 1200 145 L1200 300 L0 300 Z',
      brightness: 'dark' as const,
      zIndex: 1,
      opacity: 0.85,
      treeCount: 4,
      treeSize: { min: 28, max: 42 },
    },
    {
      id: 2,
      curvePath: 'M0 195 Q150 170 350 190 Q550 210 750 175 Q950 145 1200 185',
      fillPath: 'M0 195 Q150 170 350 190 Q550 210 750 175 Q950 145 1200 185 L1200 300 L0 300 Z',
      brightness: 'mid' as const,
      zIndex: 2,
      opacity: 0.9,
      treeCount: 4,
      treeSize: { min: 38, max: 58 },
    },
    {
      id: 3,
      curvePath: 'M0 235 Q200 210 400 230 Q650 250 850 215 Q1050 185 1200 225',
      fillPath: 'M0 235 Q200 210 400 230 Q650 250 850 215 Q1050 185 1200 225 L1200 300 L0 300 Z',
      brightness: 'light' as const,
      zIndex: 3,
      opacity: 0.95,
      treeCount: 3,
      treeSize: { min: 50, max: 75 },
    },
  ];

  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Seasonal foliage colors by depth
  function getDepthColors(brightness: 'dark' | 'mid' | 'light', currentSeason: Season): string[] {
    if (currentSeason === 'spring') {
      if (brightness === 'dark') return [spring.sprout, spring.newLeaf];
      if (brightness === 'mid') return [spring.newLeaf, spring.freshGreen];
      return [spring.freshGreen, spring.budding, spring.tender];
    } else if (currentSeason === 'autumn') {
      if (brightness === 'dark') return [autumn.rust, autumn.ember];
      if (brightness === 'mid') return [autumn.pumpkin, autumn.amber];
      return [autumn.gold, autumn.honey, autumn.straw];
    } else if (currentSeason === 'winter') {
      if (brightness === 'dark') return [winter.frostedPine, winter.frostedPine];
      if (brightness === 'mid') return [winter.winterGreen, winter.winterGreen];
      return [winter.coldSpruce, winter.coldSpruce];
    } else if (currentSeason === 'midnight') {
      if (brightness === 'dark') return [midnightBloom.deepPlum, midnightBloom.purple];
      if (brightness === 'mid') return [midnightBloom.purple, midnightBloom.violet];
      return [midnightBloom.violet, midnightBloom.softGold, midnightBloom.warmCream];
    } else {
      if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
      if (brightness === 'mid') return [greens.grove, greens.meadow];
      return [greens.spring, greens.mint];
    }
  }

  function getDepthPinks(brightness: 'dark' | 'mid' | 'light', currentSeason: Season): string[] {
    if (currentSeason === 'spring') {
      if (brightness === 'dark') return [springBlossoms.deepPink, springBlossoms.pink];
      if (brightness === 'mid') return [springBlossoms.pink, springBlossoms.rose];
      return [springBlossoms.rose, springBlossoms.blush, springBlossoms.palePink];
    } else if (currentSeason === 'autumn') {
      return [autumnReds.crimson, autumnReds.scarlet, autumnReds.rose];
    } else if (currentSeason === 'winter') {
      return [winter.bareBranch, winter.frostedBark, winter.coldWood];
    } else if (currentSeason === 'midnight') {
      return [midnightBloom.softGold, midnightBloom.warmCream, midnightBloom.amber];
    } else {
      if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
      if (brightness === 'mid') return [greens.grove, greens.meadow];
      return [greens.spring, greens.mint];
    }
  }

  // Hill fill colors per season
  function getHillColor(layerIndex: number): string {
    if (isWinter) {
      const colors = [winter.hillDeep, winter.hillMid, winter.hillFront];
      return colors[layerIndex] ?? colors[0];
    } else if (isAutumn) {
      const colors = ['#92400e', '#b45309', '#d97706'];
      return colors[layerIndex] ?? colors[0];
    } else if (isSpring) {
      const colors = [spring.hillDeep, spring.hillMid, spring.hillFront];
      return colors[layerIndex] ?? colors[0];
    } else if (isMidnight) {
      const colors = [midnightBloom.deepPlum, midnightBloom.purple, midnightBloom.violet];
      return colors[layerIndex] ?? colors[0];
    } else {
      const colors = ['#166534', '#15803d', '#22c55e'];
      return colors[layerIndex] ?? colors[0];
    }
  }

  // Deterministic hash for color picking
  function hashSeed(seed: number): number {
    return Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  }

  function getTreeColor(treeType: TreeType, depthColors: string[], depthPinks: string[], seed: number, currentSeason: Season): string {
    const pickFromArray = <T>(arr: T[]): T => arr[Math.floor(hashSeed(seed)) % arr.length];

    if (treeType === 'logo' && currentSeason === 'spring') return pickFromArray(depthPinks);
    if (treeType === 'pine' && currentSeason === 'autumn') return pickFromArray([greens.deepGreen, greens.grove, greens.darkForest]);
    if (treeType === 'pine' && currentSeason === 'winter') return pickFromArray([winter.frostedPine, winter.winterGreen, winter.coldSpruce]);
    return pickFromArray(depthColors);
  }

  // Generate base tree positions once on mount
  let baseTrees: MiniTree[] = $state([]);

  function generateMiniForest(): MiniTree[] {
    const allTrees: MiniTree[] = [];
    let treeId = 0;

    for (const hill of hillLayerDefs) {
      const points = samplePathString(
        hill.curvePath,
        hill.treeCount,
        hillViewBox,
        { jitter: 0.25, startT: 0.08, endT: 0.92 }
      );

      for (const point of points) {
        const treeType = pickRandom(treeTypes);
        const size = hill.treeSize.min + Math.random() * (hill.treeSize.max - hill.treeSize.min);
        const aspectRatio = 0.95 + Math.random() * 0.5;

        allTrees.push({
          id: treeId++,
          x: point.xPercent,
          y: point.yPercent,
          size,
          aspectRatio,
          treeType,
          trunkColor: pickRandom([bark.bark, bark.warmBark, bark.lightBark]),
          opacity: hill.opacity,
          zIndex: hill.zIndex,
          brightness: hill.brightness,
        });
      }
    }

    // Inject a centered Logo tree on the middle hill for prominence
    allTrees.push({
      id: treeId++,
      x: 50,
      y: 62,
      size: 64,
      aspectRatio: 1.2,
      treeType: 'logo',
      trunkColor: bark.warmBark,
      opacity: 1,
      zIndex: 4,
      brightness: 'light',
    });

    return allTrees;
  }

  $effect(() => {
    baseTrees = generateMiniForest();
  });

  // Derive seasonal colors reactively
  let forestTrees = $derived.by(() => {
    const currentSeason = seasonStore.current;
    return baseTrees.map((tree) => {
      const depthColors = getDepthColors(tree.brightness, currentSeason);
      const depthPinks = getDepthPinks(tree.brightness, currentSeason);
      return {
        ...tree,
        color: getTreeColor(tree.treeType, depthColors, depthPinks, tree.id, currentSeason),
      };
    });
  });

  // Filter wanderers based on search and category
  let filteredWanderers = $derived.by(() => {
    let results = data.canopy.wanderers;

    if (selectedCategory) {
      results = results.filter((w: CanopyWanderer) => w.categories.includes(selectedCategory!));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter((w: CanopyWanderer) =>
        w.display_name.toLowerCase().includes(query) ||
        w.banner.toLowerCase().includes(query) ||
        w.subdomain.toLowerCase().includes(query)
      );
    }

    return results;
  });

  function clearFilters() {
    searchQuery = '';
    selectedCategory = null;
  }

  function selectCategory(category: CanopyCategory | null) {
    selectedCategory = category;
  }

  function getGroveUrl(subdomain: string): string {
    return `https://${subdomain}.grove.place`;
  }
</script>

<SEO
  title="Canopy — Grove"
  description="See who's growing here. Browse Grove's wanderer directory and find your people."
  url="/canopy"
/>

<Header user={data.user} />

<main class="min-h-screen">
  <!-- Miniature Forest Canopy -->
  <section
    class="relative w-full overflow-hidden transition-colors duration-1000 {isMidnight ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-transparent' : isWinter ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-transparent dark:from-bark-900 dark:via-bark-800 dark:to-transparent' : isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-transparent dark:from-bark-900 dark:via-amber-950 dark:to-transparent' : isSpring ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-transparent dark:from-bark-900 dark:via-pink-950 dark:to-transparent' : 'bg-gradient-to-b from-sky-100 via-sky-50 to-transparent dark:from-bark-900 dark:via-bark-800 dark:to-transparent'}"
  >
    <!-- Forest scene container -->
    <div class="relative w-full canopy-forest-scene" aria-hidden="true" role="presentation">
      <!-- Falling leaves (not in winter) -->
      {#if !isWinter && forestTrees.length > 0}
        <FallingLeavesLayer
          trees={forestTrees}
          season={seasonStore.current}
          minLeavesPerTree={1}
          maxLeavesPerTree={2}
          zIndex={5}
        />
      {/if}

      <!-- Snowfall in winter -->
      {#if isWinter}
        <SnowfallLayer
          count={40}
          zIndex={100}
          enabled={true}
          opacity={{ min: 0.5, max: 0.9 }}
          spawnDelay={4}
        />
      {/if}

      <!-- Cherry blossom petals in spring -->
      {#if isSpring}
        <FallingPetalsLayer
          count={30}
          zIndex={100}
          enabled={true}
          opacity={{ min: 0.4, max: 0.8 }}
          fallDuration={{ min: 14, max: 22 }}
          driftRange={100}
          spawnDelay={8}
        />
      {/if}

      <!-- Rolling hills -->
      {#each hillLayerDefs as hill, i}
        <svg
          class="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 {hillViewBox.width} {hillViewBox.height}"
          preserveAspectRatio="none"
          style="z-index: {hill.zIndex};"
        >
          <path
            d={hill.fillPath}
            class="transition-colors duration-1000"
            fill={getHillColor(i)}
            fill-opacity={isMidnight ? 0.55 : isWinter ? 0.45 : isAutumn ? 0.3 : 0.35}
          />
        </svg>
      {/each}

      <!-- Trees -->
      {#each forestTrees as tree (tree.id)}
        {@const tierColors = generateTierColors(tree.color)}
        <div
          class="absolute transition-all duration-300 hover:scale-110 pointer-events-auto"
          style="
            left: {tree.x}%;
            top: {tree.y}%;
            width: {tree.size}px;
            height: {tree.size * tree.aspectRatio}px;
            opacity: {tree.opacity};
            z-index: {tree.zIndex + 10};
            transform: translateX(-50%) translateY(-97%);
            transform-origin: bottom center;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          "
        >
          {#if tree.treeType === 'logo'}
            <Logo
              class="w-full h-full"
              tier1={tierColors.tier1}
              tier2={tierColors.tier2}
              tier3={tierColors.tier3}
              trunk={tierColors.trunk}
              season={seasonStore.current}
              monochrome
              background={false}
              rotation={0}
            />
          {:else}
            <TreePine class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} season={seasonStore.current} animate={true} />
          {/if}
        </div>
      {/each}

      <!-- Lanterns -->
      <div
        class="absolute pointer-events-none"
        style="left: 22%; top: 60%; z-index: 14; transform: translateX(-50%) translateY(-90%);"
        aria-hidden="true"
      >
        <Lantern class="w-5 h-8 sm:w-6 sm:h-10" variant="standing" animate={true} />
      </div>
      <div
        class="absolute pointer-events-none"
        style="left: 78%; top: 72%; z-index: 14; transform: translateX(-50%) translateY(-90%);"
        aria-hidden="true"
      >
        <Lantern class="w-6 h-10 sm:w-7 sm:h-12" variant="standing" animate={true} />
      </div>

      <!-- Fireflies -->
      <div
        class="absolute pointer-events-none"
        style="left: 35%; top: 40%; z-index: 15;"
        aria-hidden="true"
      >
        <Firefly class="w-4 h-4" intensity="subtle" animate={true} />
      </div>
      <div
        class="absolute pointer-events-none"
        style="left: 68%; top: 48%; z-index: 15;"
        aria-hidden="true"
      >
        <Firefly class="w-3 h-3" intensity="subtle" animate={true} />
      </div>
    </div>

    <!-- Title overlay — floats above the forest -->
    <div class="relative z-30 text-center px-6 -mt-16 sm:-mt-20 pb-8">
      <Glass variant="tint" intensity="medium" class="inline-block px-8 py-6 rounded-2xl max-w-xl mx-auto">
        <h1 class="text-3xl md:text-4xl font-serif text-foreground mb-2">
          The <GroveTerm term="canopy" />
        </h1>
        <p class="text-base text-accent-muted font-sans font-semibold mb-1">
          See who's growing here
        </p>
        <p class="text-sm text-foreground-muted font-sans max-w-sm mx-auto">
          Wanderers who've chosen to be found. Browse, discover, and find your people.
        </p>
      </Glass>
    </div>
  </section>

  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

    <!-- Search and Filters -->
    <div class="mb-8">
      <GlassCard variant="frosted">
        <div class="flex flex-wrap gap-3 items-center mb-4">
          <div class="search-input-wrapper relative flex-1 min-w-[250px]">
            <Search size={20} class="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by name or banner..."
              bind:value={searchQuery}
              class="search-input !pl-10 w-full"
            />
          </div>
          {#if searchQuery || selectedCategory}
            <Button variant="ghost" size="sm" onclick={clearFilters}>
              Clear filters
            </Button>
          {/if}
        </div>

        <!-- Category Pills -->
        {#if data.canopy.categories.length > 0}
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              class="category-pill"
              class:active={selectedCategory === null}
              onclick={() => selectCategory(null)}
            >
              All
            </button>
            {#each data.canopy.categories as categoryItem (categoryItem.name)}
              {@const categoryName = categoryItem.name as CanopyCategory}
              <button
                class="category-pill"
                class:active={selectedCategory === categoryName}
                onclick={() => selectCategory(categoryName)}
              >
                {CANOPY_CATEGORY_LABELS[categoryName]}
                <span class="text-xs opacity-70 bg-white/20 px-1.5 py-0.5 rounded-full">{categoryItem.count}</span>
              </button>
            {/each}
          </div>
        {/if}

        <div class="flex items-center gap-2 text-sm text-foreground-muted">
          <Users size={16} />
          <span>{filteredWanderers.length} wanderer{filteredWanderers.length !== 1 ? 's' : ''}</span>
          {#if data.canopy.total !== filteredWanderers.length}
            <span class="opacity-70">(of {data.canopy.total})</span>
          {/if}
        </div>
      </GlassCard>
    </div>

    <!-- Wanderer Grid -->
    {#if filteredWanderers.length > 0}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Directory of Grove members">
        {#each filteredWanderers as wanderer (wanderer.subdomain)}
          <a
            href={getGroveUrl(wanderer.subdomain)}
            class="wanderer-card block no-underline text-inherit"
            data-passage-name={wanderer.display_name}
          >
            <GlassCard variant="frosted" class="wanderer-inner h-full !flex !flex-col">
              <div class="flex items-center gap-3 mb-3">
                <div class="avatar-placeholder w-12 h-12 rounded-full bg-grove-600/10 flex items-center justify-center text-accent-muted flex-shrink-0 overflow-hidden">
                  {#if wanderer.avatar_url}
                    <img src={wanderer.avatar_url} alt="" class="w-full h-full object-cover" />
                  {:else}
                    <Leaf size={20} />
                  {/if}
                </div>
                <div class="min-w-0">
                  <h3 class="text-base font-semibold text-foreground truncate">{wanderer.display_name}</h3>
                  <p class="text-sm text-foreground-muted mt-0.5">@{wanderer.subdomain}</p>
                </div>
              </div>

              {#if wanderer.banner}
                <p class="text-sm text-foreground italic leading-relaxed mb-3 flex-1">"{wanderer.banner}"</p>
              {:else}
                <p class="text-sm text-foreground-subtle italic mb-3 flex-1 opacity-60">No banner yet</p>
              {/if}

              {#if wanderer.categories.length > 0}
                <div class="flex flex-wrap gap-1.5 mb-3">
                  {#each wanderer.categories as catId (catId)}
                    <span class="category-badge text-xs px-2 py-0.5 rounded-full font-medium bg-grove-600/10 text-accent-muted dark:bg-grove-400/15 dark:text-accent-subtle">{CANOPY_CATEGORY_LABELS[catId as CanopyCategory]}</span>
                  {/each}
                </div>
              {/if}

              <div class="flex items-center pt-3 border-t border-border">
                <span class="text-sm text-foreground-muted">
                  {wanderer.bloom_count} bloom{wanderer.bloom_count !== 1 ? 's' : ''}
                </span>
              </div>
            </GlassCard>
          </a>
        {/each}
      </div>
    {:else}
      <GlassCard variant="frosted">
        <div class="text-center py-12">
          <div class="text-accent-muted opacity-50 mb-4">
            <Leaf size={48} />
          </div>
          {#if data.canopy.total === 0}
            <h2 class="text-xl font-serif text-foreground mb-2">The canopy is growing</h2>
            <p class="text-foreground-muted font-sans max-w-sm mx-auto">
              Be one of the first to rise into it. Enable Canopy in your settings to appear here.
            </p>
          {:else}
            <h2 class="text-xl font-serif text-foreground mb-2">No wanderers match</h2>
            <p class="text-foreground-muted font-sans max-w-sm mx-auto mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button variant="primary" onclick={clearFilters}>Clear filters</Button>
          {/if}
        </div>
      </GlassCard>
    {/if}
  </div>
</main>

<Footer />

<style>
  /* Miniature forest scene — compact canopy header */
  .canopy-forest-scene {
    height: 220px;
  }

  @media (min-width: 640px) {
    .canopy-forest-scene {
      height: 280px;
    }
  }

  @media (min-width: 1024px) {
    .canopy-forest-scene {
      height: 320px;
    }
  }

  /* Category pills — kept as scoped CSS for the interactive state transitions */
  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border: 2px solid rgb(var(--border) / 1);
    border-radius: 9999px;
    background: transparent;
    color: rgb(var(--foreground) / 1);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .category-pill:hover {
    border-color: rgb(var(--grove-600) / 1);
    background: rgb(var(--grove-600) / 0.05);
  }

  .category-pill.active {
    border-color: rgb(var(--grove-600) / 1);
    background: rgb(var(--grove-600) / 1);
    color: white;
  }

  /* Wanderer card hover lift */
  .wanderer-card {
    transition: transform 0.2s ease;
  }

  .wanderer-card:hover {
    transform: translateY(-4px);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .wanderer-card:hover {
      transform: none;
    }

    .category-pill {
      transition: none;
    }
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .search-input-wrapper {
      min-width: auto;
    }
  }
</style>
