<script lang="ts">
  import { specs } from '$lib/data/knowledge-base';
  
  export let data;
  const { specs: specsList } = data;
</script>

<svelte:head>
  <title>Technical Specifications - Grove Knowledge Base</title>
  <meta name="description" content="Technical specifications and implementation details for Grove platform" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-green-50 to-white">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
      <a href="/knowledge" class="hover:text-green-600">Knowledge Base</a>
      <span>/</span>
      <span class="text-gray-900">Technical Specifications</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Technical Specifications</h1>
      <p class="text-xl text-gray-600 max-w-3xl">
        Detailed technical documentation about Grove's architecture, features, and implementation details.
        These specifications provide transparency into how Grove works and our design decisions.
      </p>
    </div>

    <!-- Specs List -->
    <div class="grid gap-6">
      {#each specsList as spec}
        <article class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-gray-900 mb-2">
                <a href="/knowledge/specs/{spec.slug}" class="hover:text-green-600">
                  {spec.title}
                </a>
              </h2>
              {#if spec.description}
                <p class="text-gray-600 mb-3">{spec.description}</p>
              {/if}
              <p class="text-gray-500 text-sm">{spec.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-gray-500 mb-1">{spec.readingTime} min read</div>
              {#if spec.lastUpdated}
                <div class="text-xs text-gray-400">Updated {spec.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a 
              href="/knowledge/specs/{spec.slug}" 
              class="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
            >
              Read specification
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Technical Spec
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- CTA -->
    <div class="mt-12 bg-green-50 rounded-lg p-8 text-center">
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Have questions about our specs?</h3>
      <p class="text-gray-600 mb-4">
        If you need clarification on any technical specification or want to suggest improvements, we'd love to hear from you.
      </p>
      <a href="mailto:autumn@grove.place" class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
        Contact Us
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
    </div>
  </div>
</div>
