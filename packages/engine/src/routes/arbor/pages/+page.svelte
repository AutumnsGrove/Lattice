<script>
  import { Button, Badge, GlassCard, toast, GroveTerm } from '$lib/ui';
  import { Plus, AlertCircle, Sparkles, Calendar, Image, Map } from 'lucide-svelte';
  import { api } from '$lib/utils';

  // Map curio slugs to icons
  /** @type {Record<string, typeof Calendar>} */
  const curioIcons = {
    timeline: Calendar,
    gallery: Image,
    journey: Map,
  };

  let { data } = $props();

  /** @type {Record<string, boolean>} */
  let togglingNav = $state({});

  // Count pages currently in nav (excluding home/about which are hardcoded)
  let navPagesUsed = $derived(
    data.pages.filter(
      (/** @type {{ show_in_nav: number; slug: string }} */ p) =>
        p.show_in_nav && p.slug !== 'home' && p.slug !== 'about'
    ).length
  );
  let navLimit = $derived(data.navPageLimit || 3);
  // Curios (Gallery, Timeline, Journey) share the same limit as nav pages
  let enabledCuriosCount = $derived(data.enabledCuriosCount ?? 0);
  let slotsUsed = $derived(navPagesUsed + enabledCuriosCount);
  let atLimit = $derived(slotsUsed >= navLimit);

  /** @param {string | number} dateValue */
  function formatDate(dateValue) {
    if (!dateValue) return '-';
    // Handle unix timestamp in seconds (from SQLite unixepoch())
    // JavaScript Date expects milliseconds, so multiply by 1000
    const timestamp = typeof dateValue === 'number' ? dateValue * 1000 : dateValue;
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Toggle navigation visibility for a page
   * @param {string} slug
   * @param {boolean} currentValue
   */
  async function toggleNav(slug, currentValue) {
    const newValue = !currentValue;

    // Check limit when trying to add (not remove)
    if (newValue && atLimit) {
      toast.error(`Navigation limit reached (${navLimit} pages). Upgrade to add more.`);
      return;
    }

    togglingNav[slug] = true;

    try {
      await api.patch(`/api/pages/${slug}`, { show_in_nav: newValue });

      // Update local state
      const pageIndex = data.pages.findIndex((/** @type {{ slug: string }} */ p) => p.slug === slug);
      if (pageIndex !== -1) {
        data.pages[pageIndex].show_in_nav = newValue ? 1 : 0;
      }

      toast.success(newValue ? 'Added to navigation' : 'Removed from navigation');
    } catch (error) {
      console.error('Failed to toggle navigation:', error);
      toast.error('Failed to update navigation');
    } finally {
      togglingNav[slug] = false;
    }
  }
</script>

<div class="max-w-screen-xl">
  <header class="flex justify-between items-start mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-foreground">Site Pages</h1>
      <p class="m-0 text-foreground-muted">
        {data.pages.length} pages
        <span class="mx-2">·</span>
        <span class:text-amber-600={atLimit} class:dark:text-amber-400={atLimit}>
          {slotsUsed}/{navLimit} slots used
        </span>
      </p>
    </div>
    <a href="/arbor/pages/create" class="btn-primary inline-flex items-center gap-2">
      <Plus class="w-5 h-5" />
      <span>Create Page</span>
    </a>
  </header>

  {#if data.pagesLoadError}
    <div class="flex items-center gap-2 p-3 mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span class="text-sm">Couldn't load your pages. Try refreshing the page.</span>
    </div>
  {/if}

  {#if navLimit === 0}
    <div class="flex items-center gap-2 p-3 mb-6 rounded-lg bg-slate-50 dark:bg-bark-900/40 border border-slate-200 dark:border-bark-700 text-slate-700 dark:text-bark-300">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span class="text-sm">Custom navigation pages are available starting with <GroveTerm term="sapling">Sapling</GroveTerm>. <a href="/arbor/billing" class="underline hover:no-underline">Upgrade your plan</a> to add pages to your nav.</span>
    </div>
  {:else if atLimit}
    <div class="flex items-center gap-2 p-3 mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span class="text-sm">Navigation page limit reached ({navLimit}). <a href="/arbor/billing" class="underline hover:no-underline">Upgrade your plan</a> for more.</span>
    </div>
  {/if}

  <GlassCard variant="default" class="overflow-hidden mb-8">
    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-bark-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Page</th>
          <th class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-bark-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden">Type</th>
          <th class="p-4 text-center border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-bark-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden" title="Show in navigation menu">Nav</th>
          <th class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-bark-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden">Updated</th>
          <th class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-bark-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.pages as page (page.slug)}
          {@const isInNav = page.show_in_nav === 1}
          {@const canToggle = isInNav || !atLimit}
          <tr>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/{page.slug === 'home' ? '' : page.slug}" target="_blank" class="font-medium text-green-700 dark:text-green-400 no-underline hover:underline transition-colors">
                {page.title}
              </a>
              {#if page.description}
                <p class="mt-1 mb-0 text-xs text-foreground-muted">{page.description}</p>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-[border-color] max-md:hidden">
              <Badge variant="tag">{page.type}</Badge>
            </td>
            <td class="p-4 text-center border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-[border-color] max-md:hidden">
              <input
                type="checkbox"
                checked={isInNav}
                disabled={togglingNav[page.slug] || !canToggle}
                onchange={() => toggleNav(page.slug, isInNav)}
                class="w-4 h-4 accent-[var(--color-primary)] disabled:opacity-50"
                class:cursor-pointer={canToggle && !togglingNav[page.slug]}
                class:cursor-not-allowed={!canToggle}
                class:cursor-wait={togglingNav[page.slug]}
                title={!canToggle ? `Limit reached (${navLimit})` : isInNav ? 'Remove from navigation' : 'Add to navigation'}
                aria-label={`Toggle navigation visibility for ${page.title}`}
              />
            </td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap text-foreground-muted text-sm transition-[border-color] max-md:hidden">{formatDate(page.updated_at)}</td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/{page.slug === 'home' ? '' : page.slug}" target="_blank" class="text-green-700 dark:text-green-400 no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">View</a>
              <a href="/arbor/pages/edit/{page.slug}" class="text-green-700 dark:text-green-400 no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">Edit</a>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="text-center text-foreground-muted py-12 px-4">
              No pages yet. Click "Create Page" to get started.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </GlassCard>

  <!-- Active Curios Section -->
  {#if data.curios && data.curios.length > 0}
    <GlassCard variant="default" class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <Sparkles class="w-5 h-5 text-grove-600 dark:text-grove-400" />
        <h2 class="m-0 text-lg font-semibold text-foreground">Active <GroveTerm term="curios">Curios</GroveTerm></h2>
      </div>
      <p class="text-sm text-foreground-muted mb-4">
        <GroveTerm term="curios">Curios</GroveTerm> are special page types that add dynamic functionality to your site.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {#each data.curios as curio (curio.slug)}
          {@const CurioIcon = curioIcons[curio.slug] || Sparkles}
          <a
            href={curio.configUrl}
            class="flex items-center gap-3 p-3 rounded-lg border transition-all {curio.enabled
              ? 'border-grove-300 bg-grove-50 dark:border-grove-700 dark:bg-grove-900/30 hover:border-grove-400 dark:hover:border-grove-600'
              : 'border-cream-200 bg-cream-50 dark:border-bark-700 dark:bg-bark-800/30 hover:border-cream-300 dark:hover:border-bark-600'}"
          >
            <div class="w-10 h-10 rounded-lg flex items-center justify-center {curio.enabled
              ? 'bg-grove-100 text-grove-600 dark:bg-grove-800 dark:text-grove-400'
              : 'bg-cream-100 text-foreground-faint dark:bg-bark-700 dark:text-foreground-muted'}">
              <CurioIcon class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-foreground">{curio.name}</div>
              <div class="text-xs {curio.enabled ? 'text-grove-600 dark:text-grove-400' : 'text-foreground-muted'}">
                {curio.enabled ? 'Enabled' : 'Not configured'}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </GlassCard>
  {/if}

  <GlassCard variant="muted">
    <h3>About Pages</h3>
    <p>
      Pages are standalone content like About, Contact, or custom landing pages.
      Unlike blog posts, pages can appear in your site navigation and are designed for timeless content.
    </p>
    <p class="text-sm mt-2">
      <strong>Navigation limits:</strong> Your plan allows up to {navLimit} custom navigation pages.
      Home, Blog, and About are always included in navigation automatically.
    </p>
  </GlassCard>
</div>

<style>
  :global(.max-w-screen-xl .glass-card) {
    padding: 1.5rem;
  }

  :global(.max-w-screen-xl .glass-card h3) {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card p) {
    margin: 0.5rem 0;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card ul) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card code) {
    background: var(--color-bg-tertiary);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
    transition: background-color 0.3s ease;
  }
</style>
