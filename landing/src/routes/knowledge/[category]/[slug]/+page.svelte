<script lang="ts">
  import { page } from '$app/stores';
  import { allDocs } from '$lib/data/knowledge-base';
  
  export let data;
  
  $: category = $page.params.category;
  $: slug = $page.params.slug;
  $: doc = allDocs.find(d => d.slug === slug && d.category === category);
  
  $: categoryTitle = category === 'specs' ? 'Technical Specifications' : 
                     category === 'help' ? 'Help Center' : 'Legal & Policies';
  $: categoryColor = category === 'specs' ? 'green' : 
                    category === 'help' ? 'blue' : 'purple';
</script>

<svelte:head>
  <title>{doc?.title || 'Not Found'} - Grove Knowledge Base</title>
  <meta name="description" content={doc?.description || doc?.excerpt || ''} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 py-12">
    {#if doc}
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
        <a href="/knowledge" class="hover:text-gray-900">Knowledge Base</a>
        <span>/</span>
        <a href="/knowledge/{category}" class="hover:text-gray-900">{categoryTitle}</a>
        <span>/</span>
        <span class="text-gray-900">{doc.title}</span>
      </nav>

      <!-- Article Header -->
      <header class="mb-8">
        <div class="flex items-center gap-3 mb-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-{categoryColor}-100 text-{categoryColor}-800">
            {category === 'specs' ? 'Technical Spec' : category === 'help' ? 'Help Article' : 'Legal Document'}
          </span>
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
        <div class="prose prose-lg max-w-none">
          <p class="text-gray-700 leading-relaxed">{doc.excerpt}</p>
          
          <!-- Placeholder for full content -->
          <div class="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p class="text-gray-600 mb-4">
              <strong>Note:</strong> This is a preview of the {doc.category === 'specs' ? 'specification' : doc.category === 'help' ? 'help article' : 'legal document'}. 
              The full content is available in our GitHub repository.
            </p>
            <a 
              href="https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/{category}/{doc.slug}.md"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              View on GitHub
              <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </article>

      <!-- Article Footer -->
      <footer class="flex items-center justify-between">
        <a href="/knowledge/{category}" class="inline-flex items-center text-gray-600 hover:text-gray-900">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {categoryTitle}
        </a>
        
        <div class="flex gap-4">
          <a href="mailto:autumn@grove.place" class="text-gray-600 hover:text-gray-900">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
