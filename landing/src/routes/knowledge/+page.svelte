<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

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

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Knowledge Base</h1>
      <p class="text-xl text-foreground-muted max-w-3xl mx-auto">
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
          class="w-full px-4 py-3 pl-12 pr-20 text-foreground bg-surface-elevated border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 flex items-center pl-4">
          <svg class="w-5 h-5 text-foreground-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          class="absolute inset-y-0 right-0 flex items-center pr-4 text-accent hover:text-accent-muted font-medium"
        >
          Search
        </button>
      </form>
    </div>

    <!-- Categories -->
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Technical Specifications -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Technical Specifications</h2>
            <p class="text-sm text-foreground-subtle">{specs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Detailed technical documentation about Grove's architecture, features, and implementation details.
        </p>
        <div class="space-y-2 mb-4">
          {#each specs.slice(0, 3) as spec}
            <div class="text-sm">
              <a href="/knowledge/specs/{spec.slug}" class="text-accent hover:text-accent-muted font-medium transition-colors">
                {spec.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/specs" class="inline-flex items-center text-accent hover:text-accent-muted font-medium transition-colors">
          View all specifications
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Help Articles -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Help Center</h2>
            <p class="text-sm text-foreground-subtle">{helpArticles.length} articles</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Step-by-step guides and answers to common questions about using Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each helpArticles.slice(0, 3) as article}
            <div class="text-sm">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                {article.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/help" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          Browse all articles
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Legal Documents -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Legal & Policies</h2>
            <p class="text-sm text-foreground-subtle">{legalDocs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Terms of service, privacy policy, and other legal documents that govern your use of Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each legalDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/legal/{doc.slug}" class="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/legal" class="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
          View all policies
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="mt-12 text-center">
      <h3 class="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <a href="/knowledge/specs/CONTENT-MODERATION" class="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
          Content Moderation
        </a>
        <a href="/knowledge/help/what-is-grove" class="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
          What is Grove?
        </a>
        <a href="/knowledge/help/writing-your-first-post" class="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
          Writing Your First Post
        </a>
        <a href="/vision" class="px-4 py-2 bg-surface-elevated text-foreground-muted border border-default rounded-lg hover:bg-surface transition-colors">
          Our Vision
        </a>
      </div>
    </div>
  </div>
  </article>

  <Footer />
</main>