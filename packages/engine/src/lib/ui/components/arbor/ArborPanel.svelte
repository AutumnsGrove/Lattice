<!--
  ArborPanel — First-class admin panel shell for Grove consumers

  The main exported component. Renders a glass sidebar with navigation,
  utility bar (collapsed icon rail), mobile slide-in, and content area.
  Consumers configure it with data (navItems, footerLinks, user) and get
  the full admin experience for free.

  Usage:
    import { ArborPanel } from '@autumnsgrove/groveengine/ui/arbor';

    <ArborPanel {navItems} {footerLinks} user={data.user} brandTitle="Admin">
      {@render children()}
    </ArborPanel>
-->
<script lang="ts">
  import { GroveMessages } from "../ui";
  import { sidebarStore } from "../../stores/sidebar.svelte";
  import ArborNav from "./ArborNav.svelte";
  import ArborSidebarHeader from "./ArborSidebarHeader.svelte";
  import ArborSidebarFooter from "./ArborSidebarFooter.svelte";
  import ArborOverlay from "./ArborOverlay.svelte";
  import type { ArborPanelProps } from "./types";

  let {
    navItems,
    userPermissions,
    footerLinks,
    user,
    brandTitle = "Arbor",
    showLogo = true,
    logoutHref,
    onLogout,
    messages,
    isDemoMode = false,
    showLeafPattern = true,
    sidebarHeader,
    sidebarFooter,
    children,
  }: ArborPanelProps = $props();

  // Sidebar state from shared store
  let sidebarOpen = $derived(sidebarStore.open);
  let sidebarCollapsed = $derived(sidebarStore.collapsed);
  let sidebarHovered = $state(false);

  // Show expanded content when not collapsed OR when hovered (desktop only)
  let showExpanded = $derived(!sidebarCollapsed || sidebarHovered);

  function handleMouseEnter() {
    if (sidebarCollapsed) {
      sidebarHovered = true;
    }
  }

  function handleMouseLeave() {
    sidebarHovered = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && sidebarStore.open) {
      sidebarStore.close();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isDemoMode}
  <div class="arbor-demo-banner" class:visible={isDemoMode}>
    <span class="arbor-demo-icon">📸</span>
    <span class="arbor-demo-text">Demo Mode</span>
    <span class="arbor-demo-tip"
      >Screenshots enabled — use ?demo=true on any admin page</span
    >
  </div>
{/if}

<div
  class="arbor-layout"
  class:leaf-pattern={showLeafPattern}
>
  <ArborOverlay />

  <aside
    class="arbor-sidebar arbor-glass-sidebar"
    class:open={sidebarOpen}
    class:collapsed={sidebarCollapsed}
    class:hovered={sidebarHovered}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    <ArborSidebarHeader
      {brandTitle}
      {showLogo}
      {showExpanded}
      customHeader={sidebarHeader}
    />

    <ArborNav items={navItems} {showExpanded} {userPermissions} />

    <ArborSidebarFooter
      {showExpanded}
      {user}
      {footerLinks}
      {logoutHref}
      {onLogout}
      customFooter={sidebarFooter}
    />
  </aside>

  <main class="arbor-content" class:expanded={sidebarCollapsed}>
    {#if messages?.length}
      <div class="arbor-messages">
        <GroveMessages {messages} dismissible={true} />
      </div>
    {/if}
    {@render children()}
  </main>
</div>

<style>
  .arbor-layout {
    display: flex;
    min-height: 100vh;
    background: transparent;
    transition: background-color 0.3s ease;
  }

  /* Glass sidebar styling */
  .arbor-glass-sidebar {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--grove-overlay-15);
  }

  .arbor-sidebar {
    width: 250px;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    position: fixed;
    /* Chrome Header is 76px tall */
    top: calc(76px + 0.75rem);
    left: 0.75rem;
    bottom: 0.75rem;
    height: auto;
    max-height: calc(100vh - 76px - 1.5rem);
    z-index: 99;
    border-radius: var(--border-radius-standard);
    transition:
      width 0.3s ease,
      box-shadow 0.3s ease;
    overflow-y: auto;
    box-shadow: var(--shadow-md);
  }

  .arbor-sidebar.collapsed {
    width: 72px;
  }

  /* Hover-to-expand: when collapsed sidebar is hovered, expand it */
  .arbor-sidebar.collapsed.hovered {
    width: 250px;
    z-index: 100;
    box-shadow: var(--shadow-lg);
  }

  /* Collapsed state adjustments for internal children */
  .arbor-sidebar.collapsed :global(.arbor-sidebar-header) {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0.5rem;
  }

  .arbor-sidebar.collapsed.hovered :global(.arbor-sidebar-header) {
    flex-direction: row;
    padding: 1.25rem;
  }

  .arbor-sidebar.collapsed :global(.arbor-collapse-btn) {
    background: var(--grove-overlay-8);
    padding: 0.5rem;
    border-radius: var(--border-radius-button);
  }

  .arbor-sidebar.collapsed :global(.arbor-collapse-btn:hover) {
    background: var(--grove-overlay-15);
  }

  .arbor-sidebar.collapsed.hovered :global(.arbor-collapse-btn) {
    background: none;
    padding: 0.25rem;
  }

  .arbor-sidebar.collapsed :global(.arbor-nav-item) {
    justify-content: center;
    padding: 0.75rem;
    margin: 0.25rem 0.5rem;
  }

  .arbor-sidebar.collapsed.hovered :global(.arbor-nav-item) {
    justify-content: flex-start;
    padding: 0.75rem 1.25rem;
    margin: 0.125rem 0.5rem;
  }

  /* Content area */
  .arbor-content {
    flex: 1;
    margin-left: calc(250px + 0.75rem);
    padding: 2rem;
    min-height: 100vh;
    transition: margin-left 0.3s ease;
  }

  .arbor-content.expanded {
    margin-left: calc(72px + 0.75rem);
  }

  .arbor-messages {
    margin-bottom: 1.5rem;
  }

  /* Demo mode banner */
  .arbor-demo-banner {
    position: fixed;
    top: 76px;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    background: var(--grove-100, #ecfccb);
    color: var(--grove-800, #3f6212);
    padding: 0.5rem 1rem;
    border-radius: 0 0 var(--border-radius-standard) var(--border-radius-standard);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    z-index: 1000;
    box-shadow: var(--shadow-md);
    opacity: 0;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  .arbor-demo-banner.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }

  :global(.dark) .arbor-demo-banner {
    background: var(--grove-900, #14532d);
    color: var(--grove-200, #bbf7d0);
  }

  .arbor-demo-icon {
    font-size: 1rem;
  }

  .arbor-demo-tip {
    opacity: 0.7;
    font-weight: 400;
    margin-left: 0.5rem;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .arbor-sidebar {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 1002;
      top: 0;
      left: 0;
      bottom: 0;
      border-radius: 0;
      height: 100vh;
      height: 100dvh;
      max-height: none;
      border-right: 1px solid var(--grove-overlay-15);
      border-top: none;
      border-bottom: none;
      border-left: none;
    }

    .arbor-sidebar.open {
      transform: translateX(0);
    }

    .arbor-sidebar.collapsed {
      width: 250px;
    }

    .arbor-sidebar.collapsed.hovered {
      width: 250px;
      box-shadow: var(--shadow-md);
    }

    /* Reset collapsed overrides on mobile */
    .arbor-sidebar.collapsed :global(.arbor-sidebar-header) {
      flex-direction: row;
      padding: 1.25rem;
    }

    .arbor-sidebar.collapsed :global(.arbor-nav-item) {
      justify-content: flex-start;
      padding: 0.75rem 1.25rem;
      margin: 0.125rem 0.5rem;
    }

    .arbor-content {
      margin-left: 0;
      padding: 1rem;
      padding-top: calc(76px + 1rem);
    }

    .arbor-content.expanded {
      margin-left: 0;
    }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .arbor-sidebar {
      transition: none;
    }

    .arbor-content {
      transition: none;
    }

    .arbor-demo-banner {
      transition: none;
    }

    @media (max-width: 768px) {
      .arbor-sidebar {
        transition: none;
      }
    }
  }
</style>
