<script lang="ts">
  import { GlassCard, GlassButton, GlassOverlay } from "$lib/ui/components/ui";
  import { Input, Button, Badge, Select } from "$lib/ui/components/ui";
  import { getImageTitle, getImageDate, debounce } from "$lib/utils";
  import { Search, Filter, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-svelte";

  let { data } = $props();

  // Filter state
  let searchQuery = $state("");
  let selectedTags = $state<string[]>([]);
  let selectedCategory = $state("");
  let selectedYear = $state("");
  let filtersExpanded = $state(true);

  // Lightbox state
  let lightboxOpen = $state(false);
  let lightboxImage = $state({ src: "", alt: "", title: "" });
  let currentIndex = $state(0);

  // For lazy loading
  let visibleImages = $state<typeof data.images>([]);
  let loadedCount = $state(0);
  const BATCH_SIZE = data.config.itemsPerPage || 30;
  const AUTO_LOAD_LIMIT = 60;

  // Derived filtered images
  const filteredImages = $derived.by(() => {
    let result = [...data.images];

    // Search filter
    if (searchQuery && data.config.enableSearch) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((img) => {
        const title = getImageTitle(img).toLowerCase();
        const slug = (img.parsed_slug || "").toLowerCase();
        const filename = (img.r2_key || "").toLowerCase();
        const description = (img.custom_description || "").toLowerCase();
        return (
          title.includes(lowerQuery) ||
          slug.includes(lowerQuery) ||
          filename.includes(lowerQuery) ||
          description.includes(lowerQuery)
        );
      });
    }

    // Year filter
    if (selectedYear) {
      result = result.filter((img) => {
        const imgDate = getImageDate(img);
        return imgDate && imgDate.startsWith(selectedYear);
      });
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((img) => img.parsed_category === selectedCategory);
    }

    // Tags filter (all selected tags must match)
    if (selectedTags.length > 0) {
      result = result.filter((img) => {
        if (!img.tags || img.tags.length === 0) return false;
        const imgTagSlugs = img.tags.map((t) => t.slug);
        return selectedTags.every((slug) => imgTagSlugs.includes(slug));
      });
    }

    return result;
  });

  // Check if any filters are active
  const hasFilters = $derived(
    searchQuery !== "" ||
      selectedTags.length > 0 ||
      selectedCategory !== "" ||
      selectedYear !== ""
  );

  // Prepare select options
  const yearOptions = $derived([
    { value: "", label: "All Years" },
    ...data.filters.years.map((year) => ({ value: year, label: year })),
  ]);

  const categoryOptions = $derived([
    { value: "", label: "All Categories" },
    ...data.filters.categories.map((cat) => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  ]);

  // Initialize with first batch
  $effect(() => {
    loadMoreImages();
    setupInfiniteScroll();
  });

  function loadMoreImages() {
    const nextBatch = filteredImages.slice(loadedCount, loadedCount + BATCH_SIZE);
    visibleImages = [...visibleImages, ...nextBatch];
    loadedCount += nextBatch.length;
  }

  function setupInfiniteScroll() {
    const sentinel = document.getElementById("load-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          loadedCount < AUTO_LOAD_LIMIT &&
          loadedCount < filteredImages.length
        ) {
          loadMoreImages();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
  }

  function resetPagination() {
    visibleImages = [];
    loadedCount = 0;
    loadMoreImages();
  }

  function toggleTag(tagSlug: string) {
    if (selectedTags.includes(tagSlug)) {
      selectedTags = selectedTags.filter((t) => t !== tagSlug);
    } else {
      selectedTags = [...selectedTags, tagSlug];
    }
    resetPagination();
  }

  function resetFilters() {
    searchQuery = "";
    selectedTags = [];
    selectedCategory = "";
    selectedYear = "";
    resetPagination();
  }

  const handleSearchInput = (e: Event) => {
    searchQuery = (e.target as HTMLInputElement).value;
    resetPagination();
  };

  // Watch for filter changes
  $effect(() => {
    if (selectedYear || selectedCategory) {
      resetPagination();
    }
  });

  function openLightbox(image: (typeof data.images)[0], index: number) {
    if (!data.config.enableLightbox) return;
    lightboxImage = {
      src: image.url,
      alt: image.alt_text || image.r2_key,
      title: getImageTitle(image),
    };
    currentIndex = index;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      currentIndex--;
      const image = visibleImages[currentIndex];
      lightboxImage = {
        src: image.url,
        alt: image.alt_text || image.r2_key,
        title: getImageTitle(image),
      };
    }
  }

  function goToNext() {
    if (currentIndex < visibleImages.length - 1) {
      currentIndex++;
      const image = visibleImages[currentIndex];
      lightboxImage = {
        src: image.url,
        alt: image.alt_text || image.r2_key,
        title: getImageTitle(image),
      };
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!lightboxOpen) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }
  }

  // Generate varied sizes for mood board effect
  function getItemClass(index: number): string {
    if (data.config.gridStyle === "uniform") return "";

    const patterns = [
      "",
      "",
      "",
      "wide",
      "wide",
      "tall",
      "tall",
      "large",
    ];
    const hash = (index * 7 + 3) % patterns.length;
    return patterns[hash];
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>{data.config.title}</title>
  {#if data.config.description}
    <meta name="description" content={data.config.description} />
  {/if}
</svelte:head>

<div class="gallery-page">
  <header class="gallery-header">
    <h1>{data.config.title}</h1>
    {#if data.config.description}
      <p class="gallery-description">{data.config.description}</p>
    {/if}
    <p class="image-count">{filteredImages.length} photos</p>
  </header>

  <!-- Filter Panel -->
  {#if data.config.enableFilters}
    <div class="filter-panel">
      <GlassCard variant="default" class="filter-card">
        <button
          class="filter-toggle"
          onclick={() => (filtersExpanded = !filtersExpanded)}
          aria-expanded={filtersExpanded}
        >
          <span class="filter-toggle-content">
            <Filter class="w-4 h-4" />
            <span>Filters</span>
          </span>
          <span class="chevron-wrapper" class:rotated={filtersExpanded}>
            <ChevronDown class="w-5 h-5 chevron" />
          </span>
        </button>

        {#if filtersExpanded}
          <div class="filter-controls">
            <!-- Search input -->
            {#if data.config.enableSearch}
              <div class="filter-group">
                <div class="search-wrapper">
                  <Search class="w-4 h-4 search-icon" />
                  <Input
                    type="text"
                    placeholder="Search photos..."
                    oninput={handleSearchInput}
                    class="search-input"
                  />
                </div>
              </div>
            {/if}

            <!-- Year and Category selects -->
            <div class="filter-row">
              <div class="filter-group">
                <Select options={yearOptions} bind:value={selectedYear} />
              </div>

              <div class="filter-group">
                <Select options={categoryOptions} bind:value={selectedCategory} />
              </div>
            </div>

            <!-- Tag badges -->
            {#if data.filters.tags.length > 0 && data.config.showTags}
              <div class="filter-group">
                <div class="tag-filters">
                  {#each data.filters.tags as tag}
                    <button
                      class="tag-badge"
                      class:active={selectedTags.includes(tag.slug)}
                      style="--tag-color: {tag.color}"
                      onclick={() => toggleTag(tag.slug)}
                      aria-pressed={selectedTags.includes(tag.slug)}
                    >
                      {tag.name}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Clear filters button -->
            {#if hasFilters}
              <div class="filter-actions">
                <Button variant="ghost" size="sm" onclick={resetFilters}>
                  <X class="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            {/if}
          </div>
        {/if}
      </GlassCard>
    </div>
  {/if}

  <!-- Gallery Content -->
  {#if filteredImages.length === 0}
    <GlassCard variant="muted" class="empty-state">
      {#if hasFilters}
        <p>No photos match your filters</p>
        <Button variant="secondary" size="md" onclick={resetFilters}>Clear Filters</Button>
      {:else}
        <p>No images in the gallery yet.</p>
      {/if}
    </GlassCard>
  {:else}
    <div class="mood-board" class:uniform={data.config.gridStyle === "uniform"}>
      {#each visibleImages as image, index}
        <button
          class="mood-item {getItemClass(index)}"
          onclick={() => openLightbox(image, index)}
          aria-label="View {getImageTitle(image)}"
        >
          <img
            src={image.url}
            alt={image.alt_text || getImageTitle(image)}
            loading="lazy"
            decoding="async"
          />

          <!-- Overlay with metadata -->
          <div class="image-overlay">
            <div class="overlay-content">
              <h3 class="image-title">{getImageTitle(image)}</h3>
              {#if image.tags && image.tags.length > 0 && data.config.showTags}
                <div class="image-tags">
                  {#each image.tags.slice(0, 3) as tag}
                    <span class="overlay-tag" style="--tag-color: {tag.color}">{tag.name}</span>
                  {/each}
                  {#if image.tags.length > 3}
                    <span class="overlay-tag more">+{image.tags.length - 3}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>

    <!-- Infinite scroll sentinel -->
    {#if loadedCount < AUTO_LOAD_LIMIT && loadedCount < filteredImages.length}
      <div id="load-sentinel" class="load-sentinel">
        <div class="loading-spinner"></div>
        <span>Loading more...</span>
      </div>
    {/if}

    <!-- Manual load more button -->
    {#if loadedCount >= AUTO_LOAD_LIMIT && loadedCount < filteredImages.length}
      <div class="load-more-section">
        <Button variant="secondary" size="lg" onclick={loadMoreImages}>
          Load More ({filteredImages.length - loadedCount} remaining)
        </Button>
      </div>
    {/if}

    <!-- End message -->
    {#if loadedCount >= filteredImages.length && filteredImages.length > 0}
      <div class="gallery-end">
        <p>You've reached the end</p>
      </div>
    {/if}
  {/if}
</div>

<!-- Lightbox -->
{#if lightboxOpen && data.config.enableLightbox}
  <GlassOverlay onclick={closeLightbox} class="gallery-lightbox">
    <GlassButton
      variant="ghost"
      onclick={closeLightbox}
      aria-label="Close"
      class="lightbox-close"
    >
      <X class="w-6 h-6" />
    </GlassButton>

    <!-- Navigation buttons -->
    {#if currentIndex > 0}
      <GlassButton
        variant="ghost"
        onclick={(e: MouseEvent) => { e.stopPropagation(); goToPrevious(); }}
        aria-label="Previous image"
        class="lightbox-nav prev"
      >
        <ChevronLeft class="w-7 h-7" />
      </GlassButton>
    {/if}

    {#if currentIndex < visibleImages.length - 1}
      <GlassButton
        variant="ghost"
        onclick={(e: MouseEvent) => { e.stopPropagation(); goToNext(); }}
        aria-label="Next image"
        class="lightbox-nav next"
      >
        <ChevronRight class="w-7 h-7" />
      </GlassButton>
    {/if}

    <div class="lightbox-content" onclick={(e: MouseEvent) => e.stopPropagation()}>
      {#key lightboxImage.src}
        <img
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          class="lightbox-image"
        />
      {/key}
    </div>

    <div class="lightbox-counter">
      {currentIndex + 1} / {visibleImages.length}
    </div>
  </GlassOverlay>
{/if}

<style>
  .gallery-page {
    width: 100%;
    max-width: 1800px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .gallery-header {
    text-align: center;
    padding: 2rem 1rem 1rem;
  }

  .gallery-header h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem 0;
    color: var(--color-foreground);
  }

  .gallery-description {
    color: var(--color-muted-foreground);
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .image-count {
    color: var(--color-muted-foreground);
    margin: 0;
    font-size: 0.9rem;
  }

  /* Filter Panel */
  .filter-panel {
    max-width: 1200px;
    margin: 0 auto 2rem;
  }

  :global(.filter-card) {
    padding: 0 !important;
  }

  .filter-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: transparent;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-foreground);
    transition: background 0.2s ease;
  }

  .filter-toggle:hover {
    background: var(--color-muted);
  }

  .filter-toggle-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chevron-wrapper {
    display: inline-flex;
    align-items: center;
    transition: transform 0.3s ease;
  }

  .chevron-wrapper.rotated {
    transform: rotate(180deg);
  }

  .chevron {
    transition: inherit;
  }

  .filter-controls {
    padding: 1rem 1.25rem 1.25rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .search-wrapper {
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }

  :global(.search-input) {
    padding-left: 2.25rem !important;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-badge {
    padding: 0.5rem 1rem;
    background: color-mix(in srgb, var(--tag-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color) 30%, transparent);
    border-radius: 9999px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-foreground);
  }

  .tag-badge:hover {
    background: color-mix(in srgb, var(--tag-color) 25%, transparent);
    border-color: color-mix(in srgb, var(--tag-color) 50%, transparent);
    transform: translateY(-1px);
  }

  .tag-badge.active {
    background: var(--tag-color);
    color: white;
    border-color: var(--tag-color);
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
  }

  :global(.empty-state) {
    text-align: center;
    padding: 4rem 2rem;
    max-width: 400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  /* Mood Board Grid */
  .mood-board {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 200px;
    gap: 8px;
    padding: 0 0 2rem;
  }

  .mood-board.uniform {
    grid-auto-rows: 250px;
  }

  .mood-board.uniform .mood-item.wide,
  .mood-board.uniform .mood-item.tall,
  .mood-board.uniform .mood-item.large {
    grid-column: span 1;
    grid-row: span 1;
  }

  .mood-item {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background: var(--color-muted);
    border: none;
    padding: 0;
    border-radius: 0.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .mood-item:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    z-index: 1;
  }

  :global(.dark) .mood-item:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  }

  .mood-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .mood-item:hover img {
    transform: scale(1.05);
  }

  /* Image Overlay */
  .image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
    padding: 1.5rem 1rem 1rem;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  .mood-item:hover .image-overlay {
    opacity: 1;
  }

  .overlay-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .image-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
    line-height: 1.3;
  }

  .image-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .overlay-tag {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    font-size: 0.75rem;
    color: white;
    backdrop-filter: blur(4px);
  }

  .overlay-tag.more {
    background: rgba(255, 255, 255, 0.15);
  }

  /* Special sizes for mood board variety */
  .mood-item.wide {
    grid-column: span 2;
  }

  .mood-item.tall {
    grid-row: span 2;
  }

  .mood-item.large {
    grid-column: span 2;
    grid-row: span 2;
  }

  /* Load more section */
  .load-more-section {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  .gallery-end {
    text-align: center;
    padding: 2rem;
    color: var(--color-muted-foreground);
    font-style: italic;
  }

  /* Infinite scroll sentinel */
  .load-sentinel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    color: var(--color-muted-foreground);
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Lightbox Styles */
  :global(.gallery-lightbox) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  :global(.lightbox-close) {
    position: absolute !important;
    top: 1rem;
    right: 1rem;
    z-index: 10001;
  }

  :global(.lightbox-nav) {
    position: absolute !important;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10001;
  }

  :global(.lightbox-nav.prev) {
    left: 1rem;
  }

  :global(.lightbox-nav.next) {
    right: 1rem;
  }

  .lightbox-content {
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox-image {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  .lightbox-counter {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    backdrop-filter: blur(4px);
  }

  /* Tablet view - 3 columns */
  @media (max-width: 1024px) {
    .mood-board {
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 180px;
      gap: 6px;
    }

    .gallery-header h1 {
      font-size: 2rem;
    }

    .filter-row {
      grid-template-columns: 1fr;
    }
  }

  /* Mobile view - 2 columns */
  @media (max-width: 640px) {
    .gallery-page {
      padding: 0 0.5rem;
    }

    .gallery-header {
      padding: 1.5rem 1rem;
    }

    .gallery-header h1 {
      font-size: 1.75rem;
    }

    .mood-board {
      grid-template-columns: repeat(2, 1fr);
      grid-auto-rows: 150px;
      gap: 4px;
    }

    .mood-item {
      border-radius: 0.25rem;
    }

    .mood-item.large {
      grid-column: span 2;
      grid-row: span 1;
    }

    .filter-panel {
      margin-bottom: 1.5rem;
    }

    .filter-controls {
      padding: 1rem;
    }

    .image-title {
      font-size: 0.85rem;
    }

    .image-overlay {
      padding: 1rem 0.75rem 0.75rem;
    }

    :global(.lightbox-close) {
      top: 0.5rem;
      right: 0.5rem;
    }

    :global(.lightbox-nav.prev) {
      left: 0.5rem;
    }

    :global(.lightbox-nav.next) {
      right: 0.5rem;
    }

    .lightbox-counter {
      bottom: 1rem;
      font-size: 0.85rem;
    }
  }
</style>
