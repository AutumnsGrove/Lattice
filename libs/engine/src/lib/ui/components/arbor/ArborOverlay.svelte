<!--
  ArborOverlay — Mobile backdrop overlay

  Renders when the sidebar is open on mobile. Clicking dismisses the sidebar.
  Internal component — not exported to consumers.
-->
<script lang="ts">
  import { sidebarStore } from "../../stores/sidebar.svelte";

  function closeSidebar() {
    sidebarStore.close();
  }
</script>

{#if sidebarStore.open}
  <button
    class="arbor-overlay"
    onclick={closeSidebar}
    aria-label="Close menu"
  ></button>
{/if}

<style>
  .arbor-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: var(--overlay-dark-40);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 1001;
    border: none;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .arbor-overlay {
      display: block;
    }
  }
</style>
