<script lang="ts">
  import { GlassCard, Button, Input } from '@autumnsgrove/groveengine/ui';
  import { Search, Users, Leaf, TreePine } from 'lucide-svelte';
  import {
    CANOPY_CATEGORY_LABELS,
    type CanopyCategory,
  } from '@autumnsgrove/groveengine';
  
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
  
  // Get data from server load
  let { data } = $props<{ data: { canopy: CanopyData } }>();
  
  // Reactive state
  let searchQuery = $state('');
  let selectedCategory = $state<CanopyCategory | null>(null);
  
  // Filter wanderers based on search and category
  let filteredWanderers = $derived(() => {
    let results = data.canopy.wanderers;
    
    // Filter by category
    if (selectedCategory) {
      results = results.filter((w: CanopyWanderer) => w.categories.includes(selectedCategory!));
    }
    
    // Filter by search query
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

<div class="canopy-page">
  <header class="canopy-header">
    <div class="header-content">
      <div class="header-icon">
        <TreePine size={48} />
      </div>
      <h1>The Canopy</h1>
      <p class="subtitle">See who's growing here</p>
      <p class="description">
        Wanderers who've chosen to be found. Browse, discover, and find your people.
      </p>
    </div>
  </header>

  <div class="canopy-content">
    <!-- Search and Filters -->
    <GlassCard variant="frosted" class="filters-card">
      <div class="search-section">
        <div class="search-input-wrapper">
          <Search size={20} class="search-icon" />
          <Input
            type="text"
            placeholder="Search by name or banner..."
            bind:value={searchQuery}
            class="search-input"
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
        <div class="category-filters">
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
              <span class="count">{categoryItem.count}</span>
            </button>
          {/each}
        </div>
      {/if}
      
      <div class="results-count">
        <Users size={16} />
        <span>{filteredWanderers().length} wanderer{filteredWanderers().length !== 1 ? 's' : ''}</span>
        {#if data.canopy.total !== filteredWanderers().length}
          <span class="filtered-from">(of {data.canopy.total})</span>
        {/if}
      </div>
    </GlassCard>

    <!-- Wanderer Grid -->
    {#if filteredWanderers().length > 0}
      <div class="wanderers-grid" aria-label="Directory of Grove members">
        {#each filteredWanderers() as wanderer (wanderer.subdomain)}
          <article class="wanderer-card-wrapper">
            <a 
              href={getGroveUrl(wanderer.subdomain)}
              class="wanderer-card"
            >
            <GlassCard variant="frosted" class="wanderer-inner">
              <div class="wanderer-header">
                <div class="avatar-placeholder">
                  {#if wanderer.avatar_url}
                    <img src={wanderer.avatar_url} alt="" class="avatar-img" />
                  {:else}
                    <Leaf size={24} />
                  {/if}
                </div>
                <div class="wanderer-info">
                  <h3 class="display-name">{wanderer.display_name}</h3>
                  <p class="subdomain">@{wanderer.subdomain}</p>
                </div>
              </div>
              
              {#if wanderer.banner}
                <p class="banner-text">"{wanderer.banner}"</p>
              {:else}
                <p class="banner-text empty">No banner yet</p>
              {/if}
              
              {#if wanderer.categories.length > 0}
                <div class="categories">
                  {#each wanderer.categories as catId (catId)}
                    <span class="category-badge">{CANOPY_CATEGORY_LABELS[catId as CanopyCategory]}</span>
                  {/each}
                </div>
              {/if}
              
              <div class="wanderer-footer">
                <span class="bloom-count">
                  {wanderer.bloom_count} bloom{wanderer.bloom_count !== 1 ? 's' : ''}
                </span>
              </div>
            </GlassCard>
          </a>
          </article>
        {/each}
      </div>
    {:else}
      <GlassCard variant="frosted" class="empty-state">
        <div class="empty-content">
          <TreePine size={48} class="empty-icon" />
          {#if data.canopy.total === 0}
            <h2>The canopy is growing</h2>
            <p>Be one of the first to rise into it. Enable Canopy in your settings to appear here.</p>
          {:else}
            <h2>No wanderers match</h2>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
            <Button variant="primary" onclick={clearFilters}>Clear filters</Button>
          {/if}
        </div>
      </GlassCard>
    {/if}
  </div>
</div>

<style>
  .canopy-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .canopy-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem 0;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .header-icon {
    color: var(--color-primary);
    opacity: 0.8;
  }

  .canopy-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-primary);
    font-weight: 600;
    margin: 0;
  }

  .description {
    font-size: 1rem;
    color: var(--color-text-muted);
    max-width: 500px;
    margin: 0;
  }

  .canopy-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  :global(.filters-card) {
    padding: 1.5rem;
  }

  .search-section {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
    min-width: 250px;
  }

  :global(.search-icon) {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    pointer-events: none;
  }

  :global(.search-input) {
    padding-left: 3rem !important;
    width: 100%;
  }

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 9999px;
    background: transparent;
    color: var(--color-text);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .category-pill:hover {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }

  .category-pill.active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: white;
  }

  .category-pill .count {
    font-size: 0.75rem;
    opacity: 0.7;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
  }

  .results-count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .filtered-from {
    opacity: 0.7;
  }

  /* Wanderers Grid */
  .wanderers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .wanderer-card-wrapper {
    display: contents;
  }

  .wanderer-card {
    display: block;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease;
  }

  .wanderer-card:hover {
    transform: translateY(-4px);
  }

  :global(.wanderer-inner) {
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .wanderer-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .avatar-placeholder {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-surface-elevated) 0%, rgba(44, 95, 45, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    flex-shrink: 0;
    overflow: hidden;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wanderer-info {
    min-width: 0;
  }

  .display-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subdomain {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0.25rem 0 0 0;
  }

  .banner-text {
    font-size: 0.9375rem;
    color: var(--color-text);
    font-style: italic;
    margin: 0 0 1rem 0;
    line-height: 1.5;
    flex: 1;
  }

  .banner-text.empty {
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .category-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
    background: rgba(44, 95, 45, 0.1);
    color: var(--color-primary);
    border-radius: 9999px;
    font-weight: 500;
  }

  :global(.dark) .category-badge {
    background: rgba(92, 184, 95, 0.15);
    color: var(--color-primary-light);
  }

  .wanderer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .bloom-count {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  /* Empty State */
  :global(.empty-state) {
    padding: 4rem 2rem;
  }

  .empty-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  :global(.empty-icon) {
    color: var(--color-primary);
    opacity: 0.5;
    margin-bottom: 0.5rem;
  }

  .empty-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .empty-content p {
    color: var(--color-text-muted);
    max-width: 400px;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .canopy-header h1 {
      font-size: 2rem;
    }

    .wanderers-grid {
      grid-template-columns: 1fr;
    }

    .search-section {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input-wrapper {
      min-width: auto;
    }
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
</style>
