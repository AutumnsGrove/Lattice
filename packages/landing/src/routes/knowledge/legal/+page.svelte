<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { kbCategoryColors } from '$lib/utils/kb-colors';

  let { data } = $props();
  const legalDocs = $derived(data.legalDocs);

  const colors = kbCategoryColors.legal;
</script>

<SEO
  title="Legal & Policies - Grove Knowledge Base"
  description="Legal documents, terms of service, privacy policy, and other policies for Grove platform"
  url="/knowledge/legal"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="{colors.textHover} {colors.textHoverDark} transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Legal & Policies</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Legal & Policies</h1>
      <p class="text-xl text-foreground-muted max-w-3xl">
        Our terms of service, privacy policy, and other legal documents.
        We believe in transparency and keeping these documents readable and straightforward.
      </p>
    </div>

    <!-- Legal Docs List -->
    <div class="grid gap-6">
      {#each legalDocs as doc}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/legal/{doc.slug}" class="{colors.textHover} {colors.textHoverDark} transition-colors">
                  {doc.title}
                </a>
              </h2>
              {#if doc.description}
                <p class="text-foreground-muted mb-3">{doc.description}</p>
              {/if}
              <p class="text-foreground-subtle text-sm">{doc.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-foreground-subtle mb-1">{doc.readingTime} min read</div>
              {#if doc.lastUpdated}
                <div class="text-xs text-foreground-faint">Updated {doc.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a
              href="/knowledge/legal/{doc.slug}"
              class="inline-flex items-center {colors.text} {colors.textDark} {colors.textHover} {colors.textHoverDark} font-medium transition-colors"
            >
              Read document
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {colors.badgeBg} {colors.badgeBgDark} {colors.badgeText} {colors.badgeTextDark}">
              Legal Document
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- Contact CTA - Autumn -->
    <div class="mt-12 {colors.ctaBg} {colors.ctaBgDark} rounded-lg p-8 text-center border {colors.ctaBorder} {colors.ctaBorderDark}">
      <h3 class="text-xl font-semibold text-foreground mb-2">Questions about our policies?</h3>
      <p class="text-foreground-muted mb-4">
        If you have questions about our terms or policies, or need clarification on anything, please reach out.
      </p>
      <a href="mailto:hello@grove.place" class="inline-flex items-center px-4 py-2 {colors.buttonBg} text-white rounded-lg {colors.buttonHover} transition-colors">
        Contact Us
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
    </div>
    </div>
  </article>

  <Footer />
</main>
