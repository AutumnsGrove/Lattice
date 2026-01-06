<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    headers?: Array<{ id: string; text: string; level: number }>;
  }

  let { headers = [] }: Props = $props();

  let activeId = $state('');
  let isOpen = $state(false);

  onMount(() => {
    if (!browser || headers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
          }
        });
      },
      {
        rootMargin: '-20% 0% -35% 0%',
        threshold: 0
      }
    );

    // Observe all headers
    headers.forEach((header) => {
      const element = document.getElementById(header.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  });

  function scrollToHeader(id: string) {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Account for sticky header + breathing room
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      history.pushState(null, '', `#${id}`);
      isOpen = false;
    }
  }
</script>

{#if headers.length > 0}
  <!-- Desktop TOC -->
  <nav class="toc hidden lg:block" aria-label="Table of contents">
    <h3 class="toc-title">On this page</h3>
    <ul class="toc-list">
      {#each headers as header (header.id)}
        <li class="toc-item" class:active={activeId === header.id}>
          <button
            type="button"
            onclick={() => scrollToHeader(header.id)}
            class="toc-link"
            style="padding-left: {(header.level - 1) * 0.75}rem"
          >
            {header.text}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Mobile TOC Button -->
  <div class="lg:hidden fixed bottom-6 right-6 z-50">
    <button
      type="button"
      onclick={() => isOpen = !isOpen}
      class="toc-mobile-button"
      aria-expanded={isOpen}
      aria-label="Table of contents"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>

    {#if isOpen}
      <div class="toc-mobile-dropdown">
        <div class="toc-mobile-header">
          <span class="font-medium">On this page</span>
          <button type="button" onclick={() => isOpen = false} class="toc-mobile-close" aria-label="Close table of contents">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul class="toc-mobile-list">
          {#each headers as header (header.id)}
            <li>
              <button
                type="button"
                onclick={() => scrollToHeader(header.id)}
                class="toc-mobile-link"
                class:active={activeId === header.id}
                style="padding-left: {(header.level - 1) * 0.75 + 1}rem"
              >
                {header.text}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Desktop TOC */
  .toc {
    position: sticky;
    top: 6rem;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
    padding: 1rem;
    font-size: 0.875rem;
  }

  .toc-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-foreground-muted, #666);
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.1));
  }

  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .toc-item {
    margin: 0;
    padding: 0;
  }

  .toc-link {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.375rem 0;
    background: none;
    border: none;
    color: var(--color-foreground-muted, #666);
    cursor: pointer;
    transition: color 0.2s ease;
    font-size: inherit;
    font-family: inherit;
    line-height: 1.4;
  }

  .toc-link:hover {
    color: var(--color-accent, #16a34a);
  }

  .toc-item.active .toc-link {
    color: var(--color-accent, #16a34a);
    font-weight: 600;
  }

  /* Scrollbar */
  .toc::-webkit-scrollbar {
    width: 4px;
  }

  .toc::-webkit-scrollbar-track {
    background: transparent;
  }

  .toc::-webkit-scrollbar-thumb {
    background: var(--color-foreground-subtle, #ccc);
    border-radius: 2px;
  }

  /* Mobile TOC */
  .toc-mobile-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-accent, #16a34a);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .toc-mobile-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  }

  .toc-mobile-dropdown {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 280px;
    max-height: 60vh;
    overflow-y: auto;
    background: var(--color-background, white);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    border: 1px solid var(--color-border, rgba(0,0,0,0.1));
  }

  :global(.dark) .toc-mobile-dropdown {
    background: var(--color-background-secondary, #1a1a1a);
    border-color: rgba(255,255,255,0.1);
  }

  .toc-mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.1));
    font-size: 0.875rem;
    color: var(--color-foreground, #333);
  }

  :global(.dark) .toc-mobile-header {
    color: var(--color-foreground, #eee);
  }

  .toc-mobile-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-foreground-muted, #666);
    padding: 0.25rem;
    display: flex;
  }

  .toc-mobile-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
  }

  .toc-mobile-link {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-foreground-muted, #666);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .toc-mobile-link:hover {
    background: var(--color-background-secondary, #f5f5f5);
  }

  :global(.dark) .toc-mobile-link:hover {
    background: rgba(255,255,255,0.05);
  }

  .toc-mobile-link.active {
    color: var(--color-accent, #16a34a);
    font-weight: 600;
  }
</style>
