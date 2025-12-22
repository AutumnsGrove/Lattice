<script lang="ts">
  import { page } from '$app/stores';
  import { allDocs } from '$lib/data/knowledge-base';
  
  export let data;
  
  $: query = $page.url.searchParams.get('q') || '';
  $: results = query ? allDocs.filter(doc => 
    doc.title.toLowerCase().includes(query.toLowerCase()) ||
    doc.excerpt.toLowerCase().includes(query.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(query.toLowerCase()))
  ) : [];
  
  $: categoryCounts = {
    specs: results.filter(d => d.category === 'specs').length,
    help: results.filter(d => d.category === 'help').length,
    legal: results.filter(d => d.category === 'legal').length
  };
</script>

<svelte:head>
  <title>Search Results - Grove Knowledge Base</title>
  <meta name="description" content="Search Grove's knowledge base for documentation and help articles" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
      <a href="/knowledge" class="hover:text-gray-900">Knowledge Base</a>
      <span>/</span>
      <span class="text-gray-900">Search</span>
    </nav>

    <!-- Search Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Search Knowledge Base</h1>
      <form method="GET" action="/knowledge/search" class="max-w-2xl">
        <div class="relative">
          <input
            type="text"
            name="q"
            value={query}
            placeholder="Search documentation..."
            class="w-full px-4 py-3 pl-12 pr-20 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="absolute inset-y-0 left-0 flex items-center pl-4">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            class="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Search
          </button>
        </div>
      </form>
    </div>

    {#if query}
      <!-- Results Summary -->
      <div class="mb-6">
        <p class="text-gray-600">
          Found {results.length} result{results.length !== 1 ? 's' : ''} for "<span class="font-medium">{query}</span>"
        </p>
        {#if results.length > 0}
          <div class="flex gap-4 mt-2 text-sm text-gray-500">
            {#if categoryCounts.specs > 0}
              <span>{categoryCounts.specs} specs</span>
            {/if}
            {#if categoryCounts.help > 0}
              <span>{categoryCounts.help} help articles</span>
            {/if}
            {#if categoryCounts.legal > 0}
              <span>{categoryCounts.legal} legal docs</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Search Results -->
      {#if results.length > 0}
        <div class="space-y-4">
          {#each results as doc}
            <article class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h2 class="text-lg font-semibold text-gray-900 mb-1">
                    <a href="/knowledge/{doc.category}/{doc.slug}" class="hover:text-blue-600">
                      {doc.title}
                    </a>
                  </h2>
                  {#if doc.description}
                    <p class="text-gray-600 text-sm mb-2">{doc.description}</p>
                  {/if}
                  <p class="text-gray-500 text-sm">{doc.excerpt}</p>
                </div>
                <span class="ml-4 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {doc.category === 'specs' ? 'bg-green-100 text-green-800' : doc.category === 'help' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                  {doc.category === 'specs' ? 'Spec' : doc.category === 'help' ? 'Help' : 'Legal'}
                </span>
              </div>
              <div class="flex items-center justify-between mt-4">
                <a href="/knowledge/{doc.category}/{doc.slug}" class="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Read more
                  <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <span class="text-sm text-gray-500">{doc.readingTime} min read</span>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <!-- No Results -->
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p class="text-gray-600 mb-4">
            We couldn't find any documentation matching your search. Try different keywords or browse our categories.
          </p>
          <div class="flex gap-4 justify-center">
            <a href="/knowledge/specs" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
              Browse Specs
            </a>
            <a href="/knowledge/help" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
              Browse Help Articles
            </a>
          </div>
        </div>
      {/if}
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Search our knowledge base</h3>
        <p class="text-gray-600">
          Enter a search term above to find documentation, help articles, and specifications.
        </p>
      </div>
    {/if}
  </div>
</div>
