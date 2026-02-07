<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { CategoryNav } from '@autumnsgrove/groveengine';
  import { toolIcons, stateIcons, type ToolIconKey } from '$lib/utils/icons';
  import type { HelpSection } from '$lib/types/docs';

  let { data } = $props();
  const articles = $derived(data.helpArticles);
  const sections = $derived(data.helpSections);

  // Type-safe icon getter (same pattern as specs/workshop)
  function getIcon(icon: string | undefined) {
    if (!icon) return stateIcons.circle;
    return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
  }

  // Group articles by section (the magic line!)
  const articlesBySection = $derived(
    Object.fromEntries(
      sections.map(section => [
        section.id,
        articles.filter(article => article.section === section.id)
      ])
    ) as Record<HelpSection, typeof articles>
  );

  // Generate section ID for anchor links
  function getSectionId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // CategoryNav sections (only include sections with articles)
  const navSections = $derived(
    sections
      .map(s => ({
        id: s.id,
        name: s.name,
        icon: getIcon(s.icon),
        itemCount: articlesBySection[s.id]?.length ?? 0
      }))
      .filter(s => s.itemCount > 0)
  );
</script>

<SEO
  title="Help Center - Grove Knowledge Base"
  description="Help articles and guides for using Grove platform"
  url="/knowledge/help"
/>

<main class="min-h-screen flex flex-col">
  <Header user={data.user} />

  <!-- Hero -->
  <section class="relative py-12 px-6 text-center bg-gradient-to-b from-emerald-50/80 via-transparent to-transparent dark:from-emerald-950/20 dark:via-transparent dark:to-transparent">
    <div class="max-w-3xl mx-auto">
      <nav aria-label="Breadcrumb" class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground" aria-current="page">Help Center</span>
      </nav>
      <h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
        Help Center
      </h1>
      <p class="text-lg text-foreground-muted max-w-xl mx-auto">
        Step-by-step guides and answers to common questions about using Grove.
        Whether you're just getting started or need help with a specific feature, you'll find it here.
      </p>
    </div>
  </section>

  <!-- Floating Category Navigation -->
  <CategoryNav
    sections={navSections}
    color="emerald"
    mobileTitle="Sections"
  />

  <!-- Sections -->
  <section class="flex-1 py-12 px-6">
    <div class="max-w-5xl mx-auto space-y-16">
      {#each sections as section}
        {@const sectionArticles = articlesBySection[section.id] ?? []}
        {@const SectionIcon = getIcon(section.icon)}

        {#if sectionArticles.length > 0}
          <div id={getSectionId(section.name)}>
            <!-- Section Header -->
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <SectionIcon class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-2xl font-serif text-foreground">{section.name}</h2>
                <p class="text-foreground-muted">{section.description}</p>
              </div>
            </div>

            <!-- Articles Grid -->
            <div class="grid gap-4">
              {#each sectionArticles as article}
                <article class="p-5 rounded-xl bg-white/80 dark:bg-bark-800/80 backdrop-blur-sm shadow-sm border border-emerald-200/50 dark:border-bark-700 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/50 focus-within:shadow-md focus-within:border-emerald-300 dark:focus-within:border-emerald-700/50 transition-all motion-reduce:transition-none">
                  <h3 class="text-lg font-semibold text-foreground mb-2">
                    <a href="/knowledge/help/{article.slug}" class="hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:text-emerald-600 dark:focus-visible:text-emerald-400 transition-colors motion-reduce:transition-none">
                      {article.title}
                    </a>
                  </h3>
                  <p class="text-foreground-muted mb-3 line-clamp-2">{article.excerpt}</p>
                  <div class="flex items-center justify-between text-sm">
                    <a href="/knowledge/help/{article.slug}" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors">
                      Read more
                      <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    <span class="text-foreground-subtle">{article.readingTime} min read</span>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      <!-- Contact Support CTA -->
      <div class="text-center p-8 rounded-xl bg-emerald-100/50 dark:bg-emerald-950/25 backdrop-blur-md border border-dashed border-emerald-300 dark:border-emerald-800/30">
        <h3 class="text-xl font-semibold text-foreground mb-2">Need more help?</h3>
        <p class="text-foreground-muted mb-4">
          Can't find what you're looking for? Contact our support team and we'll get back to you within 48 hours.
        </p>
        <a href="mailto:hello@grove.place" class="inline-flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
          Contact Support
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Links -->
  <section class="py-8 px-6 bg-white/50 dark:bg-bark-900/50 backdrop-blur-sm border-t border-divider">
    <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-cream-100 dark:bg-bark-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/specs" class="px-4 py-2 rounded-lg bg-cream-100 dark:bg-bark-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Technical Specs →
      </a>
    </div>
  </section>

  <Footer />
</main>
