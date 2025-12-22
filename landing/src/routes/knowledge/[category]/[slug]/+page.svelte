<script lang="ts">
  import { page } from '$app/stores';

  export let data;

  $: doc = data.doc;
  $: category = $page.params.category;

  $: categoryTitle = category === 'specs' ? 'Technical Specifications' :
                     category === 'help' ? 'Help Center' : 'Legal & Policies';
</script>

<svelte:head>
  <title>{doc?.title || 'Not Found'} - Grove Knowledge Base</title>
  <meta name="description" content={doc?.description || doc?.excerpt || ''} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 py-12">
    {#if doc}
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
        <a href="/knowledge" class="hover:text-gray-900">Knowledge Base</a>
        <span aria-hidden="true">/</span>
        <a href="/knowledge/{category}" class="hover:text-gray-900">{categoryTitle}</a>
        <span aria-hidden="true">/</span>
        <span class="text-gray-900" aria-current="page">{doc.title}</span>
      </nav>

      <!-- Article Header -->
      <header class="mb-8">
        <div class="flex items-center gap-3 mb-4">
          {#if category === 'specs'}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Technical Spec
            </span>
          {:else if category === 'help'}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Help Article
            </span>
          {:else}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              Legal Document
            </span>
          {/if}
          {#if doc.lastUpdated}
            <span class="text-sm text-gray-500">Updated {doc.lastUpdated}</span>
          {/if}
          <span class="text-sm text-gray-500">{doc.readingTime} min read</span>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-4">{doc.title}</h1>
        {#if doc.description}
          <p class="text-xl text-gray-600">{doc.description}</p>
        {/if}
      </header>

      <!-- Article Content -->
      <article class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div class="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
          {#if doc.html}
            {@html doc.html}
          {:else}
            <p class="text-gray-700 leading-relaxed">{doc.excerpt}</p>
          {/if}
        </div>
      </article>

      <!-- Article Footer -->
      <footer class="flex items-center justify-between">
        <a
          href="/knowledge/{category}"
          class="inline-flex items-center text-gray-600 hover:text-gray-900"
          aria-label="Return to {categoryTitle}"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {categoryTitle}
        </a>

        <div class="flex gap-4">
          <a
            href="mailto:autumn@grove.place"
            class="text-gray-600 hover:text-gray-900"
            aria-label="Contact support via email"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </footer>
    {:else}
      <!-- 404 -->
      <div class="text-center py-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Document Not Found</h1>
        <p class="text-xl text-gray-600 mb-8">
          The document you're looking for doesn't exist or has been moved.
        </p>
        <div class="flex gap-4 justify-center">
          <a href="/knowledge" class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            Knowledge Base Home
          </a>
          <a href="/knowledge/specs" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
            Browse Specs
          </a>
          <a href="/knowledge/help" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
            Browse Help
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
