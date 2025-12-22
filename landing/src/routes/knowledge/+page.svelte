<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  export let data;
  const { specs, helpArticles, legalDocs } = data;
  
  let searchQuery = '';
  
  function handleSearch() {
    if (searchQuery.trim()) {
      goto(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }
</script>

<svelte:head>
  <title>Knowledge Base - Grove</title>
  <meta name="description" content="Learn about Grove's features, specifications, and how to use our platform" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-green-50 to-white">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        Everything you need to know about Grove - from technical specifications to user guides
      </p>
    </div>

    <!-- Search Bar -->
    <div class="max-w-2xl mx-auto mb-12">
      <form on:submit|preventDefault={handleSearch} class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search documentation..."
          class="w-full px-4 py-3 pl-12 pr-20 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 flex items-center pl-4">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          class="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600 hover:text-green-700 font-medium"
        >
          Search
        </button>
      </form>
    </div>

    <!-- Categories -->
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Technical Specifications -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Technical Specifications</h2>
            <p class="text-sm text-gray-500">{specs.length} documents</p>
          </div>
        </div>
        <p class="text-gray-600 mb-4">
          Detailed technical documentation about Grove's architecture, features, and implementation details.
        </p>
        <div class="space-y-2 mb-4">
          {#each specs.slice(0, 3) as spec}
            <div class="text-sm">
              <a href="/knowledge/specs/{spec.slug}" class="text-green-600 hover:text-green-700 font-medium">
                {spec.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/specs" class="inline-flex items-center text-green-600 hover:text-green-700 font-medium">
          View all specifications
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Help Articles -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Help Center</h2>
            <p class="text-sm text-gray-500">{helpArticles.length} articles</p>
          </div>
        </div>
        <p class="text-gray-600 mb-4">
          Step-by-step guides and answers to common questions about using Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each helpArticles.slice(0, 3) as article}
            <div class="text-sm">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 hover:text-blue-700 font-medium">
                {article.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/help" class="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          Browse all articles
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Legal Documents -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Legal & Policies</h2>
            <p class="text-sm text-gray-500">{legalDocs.length} documents</p>
          </div>
        </div>
        <p class="text-gray-600 mb-4">
          Terms of service, privacy policy, and other legal documents that govern your use of Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each legalDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/legal/{doc.slug}" class="text-purple-600 hover:text-purple-700 font-medium">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/legal" class="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium">
          View all policies
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="mt-12 text-center">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <a href="/knowledge/specs/CONTENT-MODERATION" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
          Content Moderation
        </a>
        <a href="/knowledge/help/what-is-grove" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
          What is Grove?
        </a>
        <a href="/knowledge/help/writing-your-first-post" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
          Writing Your First Post
        </a>
        <a href="/vision" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          Our Vision
        </a>
      </div>
    </div>
  </div>
</div>