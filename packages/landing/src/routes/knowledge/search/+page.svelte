<script lang="ts">
  import type { Doc } from '$lib/data/knowledge-base';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import SEO from '$lib/components/SEO.svelte';
  import { ContentSearch } from '@autumnsgrove/groveengine';

  let { data } = $props();

  let searchQuery = $state('');
  // Initialize with all docs to prevent empty state flash on page load
  let filteredResults = $state<Doc[]>(data.allDocs);

  // Filter function for ContentSearch
  function filterDoc(doc: Doc, query: string): boolean {
    const q = query.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.excerpt.toLowerCase().includes(q) ||
      Boolean(doc.description?.toLowerCase().includes(q))
    );
  }

  // Handle search results
  function handleSearchChange(query: string, results: Doc[]) {
    filteredResults = results;
  }

  let categoryCounts = $derived({
    specs: filteredResults.filter(d => d.category === 'specs').length,
    help: filteredResults.filter(d => d.category === 'help').length,
    legal: filteredResults.filter(d => d.category === 'legal').length,
    marketing: filteredResults.filter(d => d.category === 'marketing').length,
    patterns: filteredResults.filter(d => d.category === 'patterns').length
  });
</script>

<SEO
  title="Search Knowledge Base — Grove"
  description="Search Grove documentation and help articles"
  url="/knowledge/search"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav aria-label="Breadcrumb" class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-foreground transition-colors">Knowledge Base</a>
      <span aria-hidden="true">/</span>
      <span class="text-foreground" aria-current="page">Search</span>
    </nav>

    <!-- Search Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground mb-4">Search Knowledge Base</h1>
      <ContentSearch
        items={data.allDocs}
        filterFn={filterDoc}
        bind:searchQuery
        placeholder="Search documentation..."
        syncWithUrl={true}
        queryParam="q"
        onSearchChange={handleSearchChange}
        wrapperClass="max-w-2xl"
        inputClass="w-full px-4 py-3 pl-12 pr-20 text-foreground bg-surface-elevated border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
      />
    </div>

    {#if searchQuery}
      <!-- Results Summary - wrapped in live region for screen reader announcements -->
      <div aria-live="polite" aria-atomic="true" class="mb-6">
        <p class="text-foreground-muted">
          Found {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "<span class="font-medium">{searchQuery}</span>"
        </p>
        {#if filteredResults.length > 0}
          <div class="flex gap-4 mt-2 text-sm text-foreground-subtle">
            {#if categoryCounts.specs > 0}
              <span>{categoryCounts.specs} specs</span>
            {/if}
            {#if categoryCounts.help > 0}
              <span>{categoryCounts.help} help articles</span>
            {/if}
            {#if categoryCounts.legal > 0}
              <span>{categoryCounts.legal} legal docs</span>
            {/if}
            {#if categoryCounts.marketing > 0}
              <span>{categoryCounts.marketing} marketing</span>
            {/if}
            {#if categoryCounts.patterns > 0}
              <span>{categoryCounts.patterns} patterns</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Search Results -->
      {#if filteredResults.length > 0}
        <div class="space-y-4">
          {#each filteredResults as doc}
            <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h2 class="text-lg font-semibold text-foreground mb-1">
                    <a href="/knowledge/{doc.category}/{doc.slug}" class="hover:text-accent transition-colors">
                      {doc.title}
                    </a>
                  </h2>
                  {#if doc.description}
                    <p class="text-foreground-muted text-sm mb-2">{doc.description}</p>
                  {/if}
                  <p class="text-foreground-subtle text-sm">{doc.excerpt}</p>
                </div>
                <span class="ml-4 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {doc.category === 'specs' ? 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-text' : doc.category === 'help' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : doc.category === 'legal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : doc.category === 'marketing' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}">
                  {doc.category === 'specs' ? 'Spec' : doc.category === 'help' ? 'Help' : doc.category === 'legal' ? 'Legal' : doc.category === 'marketing' ? 'Marketing' : 'Pattern'}
                </span>
              </div>
              <div class="flex items-center justify-between mt-4">
                <a href="/knowledge/{doc.category}/{doc.slug}" class="text-accent hover:text-accent-muted font-medium text-sm transition-colors">
                  Read more
                  <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <span class="text-sm text-foreground-subtle">{doc.readingTime} min read</span>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <!-- No Results -->
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-foreground-faint mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-medium text-foreground mb-2">No results found</h3>
          <p class="text-foreground-muted mb-4">
            We couldn't find any documentation matching your search. Try different keywords or browse our categories.
          </p>
          <div class="flex gap-4 justify-center">
            <a href="/knowledge/specs" class="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
              Browse Specs
            </a>
            <a href="/knowledge/help" class="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
              Browse Help Articles
            </a>
          </div>
        </div>
      {/if}
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-foreground-faint mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-medium text-foreground mb-2">Search our knowledge base</h3>
        <p class="text-foreground-muted">
          Enter a search term above to find documentation, help articles, and specifications.
        </p>
      </div>
    {/if}
    </div>
  </article>

  <Footer />
</main>
