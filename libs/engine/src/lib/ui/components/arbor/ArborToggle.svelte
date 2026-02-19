<!--
  ArborToggle — Standalone sidebar toggle button

  Place this inside any header to control the Arbor sidebar. Calls
  sidebarStore.toggle() on mobile and sidebarStore.toggleCollapse() on desktop.

  Usage:
    import { ArborToggle } from '@autumnsgrove/lattice/ui/arbor';

    <header>
      <ArborToggle />
      ...rest of header
    </header>
-->
<script lang="ts">
  import { Menu } from "lucide-svelte";
  import { sidebarStore } from "../../stores/sidebar.svelte";

  interface Props {
    /** Additional CSS classes */
    class?: string;
  }

  let { class: className = "" }: Props = $props();

  function handleToggle() {
    // On mobile (≤768px), toggle the slide-in overlay
    // On desktop (>768px), toggle the collapse state
    if (window.innerWidth <= 768) {
      sidebarStore.toggle();
    } else {
      sidebarStore.toggleCollapse();
    }
  }
</script>

<button
  class="arbor-toggle {className}"
  onclick={handleToggle}
  aria-label="Toggle sidebar"
  title="Toggle sidebar"
>
  <Menu class="arbor-toggle-icon" />
</button>

<style>
  .arbor-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--border-radius-small);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .arbor-toggle:hover {
    background: var(--grove-overlay-12);
    color: var(--color-text);
  }

  :global(.dark) .arbor-toggle:hover {
    background: var(--grove-overlay-12);
    color: var(--grove-text-strong);
  }

  :global(.arbor-toggle-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
