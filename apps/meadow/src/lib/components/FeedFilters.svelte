<!--
  FeedFilters — Tab bar for feed algorithms.

  All / Popular / Hot / Top / Following
  "Following" only visible when logged in.
  URL params preserved when switching tabs.
-->
<script lang="ts">
  import type { FeedFilter } from "$lib/server/types";

  interface Props {
    current: FeedFilter;
    loggedIn: boolean;
    onchange: (filter: FeedFilter) => void;
  }

  const { current, loggedIn, onchange }: Props = $props();

  const tabs: { id: FeedFilter; label: string; authRequired?: boolean }[] = [
    { id: "all", label: "All" },
    { id: "notes", label: "Notes" },
    { id: "blooms", label: "Blooms" },
    { id: "popular", label: "Popular" },
    { id: "hot", label: "Hot" },
    { id: "top", label: "Top" },
    { id: "following", label: "Following", authRequired: true },
  ];

  const visibleTabs = $derived(
    tabs.filter((t) => !t.authRequired || loggedIn),
  );
</script>

<nav
  class="flex gap-1 rounded-lg bg-white/40 p-1 backdrop-blur-sm dark:bg-cream-100/20"
  aria-label="Feed filter"
>
  {#each visibleTabs as tab}
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {current === tab.id
        ? 'bg-white/80 text-grove-700 shadow-sm dark:bg-cream-100/40 dark:text-cream-900'
        : 'text-foreground-muted hover:text-foreground hover:bg-white/40 dark:hover:bg-cream-100/15'}"
      aria-current={current === tab.id ? "page" : undefined}
      onclick={() => onchange(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</nav>
