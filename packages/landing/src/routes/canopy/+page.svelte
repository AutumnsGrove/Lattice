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
    TreePine,
    greens, bark, spring, winter,
    midnightBloom,
  } from '@autumnsgrove/groveengine/ui/nature';

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

  // --- Three pine trees ---
  const trunkColor = bark.warmBark;

  const treeColor = $derived.by(() => {
    const s = seasonStore.current;
    if (s === 'spring') return spring.freshGreen;
    if (s === 'winter') return winter.frostedPine;
    if (s === 'midnight') return midnightBloom.violet;
    return greens.grove;
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
  <!-- Canopy Header -->
  <section
    class="relative w-full overflow-hidden transition-colors duration-1000 {isMidnight ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-transparent' : isWinter ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-transparent dark:from-bark-900 dark:via-bark-800 dark:to-transparent' : isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-transparent dark:from-bark-900 dark:via-amber-950 dark:to-transparent' : isSpring ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-transparent dark:from-bark-900 dark:via-pink-950 dark:to-transparent' : 'bg-gradient-to-b from-sky-100 via-sky-50 to-transparent dark:from-bark-900 dark:via-bark-800 dark:to-transparent'}"
  >
    <!-- Three pine trees on a glass platform -->
    <div class="relative w-full canopy-forest-scene flex items-end justify-center pb-4" aria-hidden="true" role="presentation">
      <Glass variant="tint" intensity="light" class="inline-flex items-end justify-center gap-6 sm:gap-10 px-8 sm:px-12 pt-4 pb-3 rounded-2xl">
        <div style="width: 48px; height: 68px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));">
          <TreePine class="w-full h-full" color={treeColor} trunkColor={trunkColor} season={seasonStore.current} animate={true} />
        </div>
        <div style="width: 62px; height: 88px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));">
          <TreePine class="w-full h-full" color={treeColor} trunkColor={trunkColor} season={seasonStore.current} animate={true} />
        </div>
        <div style="width: 48px; height: 68px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));">
          <TreePine class="w-full h-full" color={treeColor} trunkColor={trunkColor} season={seasonStore.current} animate={true} />
        </div>
      </Glass>
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
  /* Three-tree canopy header */
  .canopy-forest-scene {
    height: 140px;
  }

  @media (min-width: 640px) {
    .canopy-forest-scene {
      height: 160px;
    }
  }

  @media (min-width: 1024px) {
    .canopy-forest-scene {
      height: 180px;
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
