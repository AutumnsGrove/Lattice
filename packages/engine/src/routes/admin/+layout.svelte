<script>
  import { Toast, Logo } from "$lib/ui/components/ui";
  import {
    LayoutDashboard,
    FileText,
    FileStack,
    Image,
    Settings,
    ChevronLeft,
    LogOut,
    CreditCard,
    HelpCircle,
    MessageCircle,
    Shield,
    Gift,
    Eye,
  } from "lucide-svelte";
  import { sidebarStore } from "$lib/ui/stores/sidebar.svelte";

  let { data, children } = $props();
  // Sidebar open state now comes from shared store (controlled by Chrome Header)
  let sidebarOpen = $derived(sidebarStore.open);
  // Desktop collapse state also from shared store so Header toggle can control it
  let sidebarCollapsed = $derived(sidebarStore.collapsed);
  let sidebarHovered = $state(false);

  // Computed: show expanded content when not collapsed OR when hovered
  let showExpanded = $derived(!sidebarCollapsed || sidebarHovered);

  // Grove admin emails who can see Vista section
  const ADMIN_EMAILS = ["autumn@grove.place", "admin@grove.place"];
  let isGroveAdmin = $derived(
    data.user?.email ? ADMIN_EMAILS.includes(data.user.email.toLowerCase()) : false
  );

  function closeSidebar() {
    sidebarStore.close();
  }

  function toggleCollapse() {
    sidebarStore.toggleCollapse();
  }

  function handleMouseEnter() {
    if (sidebarCollapsed) {
      sidebarHovered = true;
    }
  }

  function handleMouseLeave() {
    sidebarHovered = false;
  }
</script>

<svelte:head>
  <title>Admin - {data.tenant?.displayName || data.tenant?.subdomain || 'Grove'}</title>
</svelte:head>

<div class="admin-layout leaf-pattern">
  <!-- Header is now unified Chrome Header from root layout with sidebar toggle -->

  <!-- Overlay for mobile -->
  {#if sidebarOpen}
    <button
      class="sidebar-overlay"
      onclick={closeSidebar}
      aria-label="Close menu"
    ></button>
  {/if}

  <aside
    class="sidebar glass-sidebar"
    class:open={sidebarOpen}
    class:collapsed={sidebarCollapsed}
    class:hovered={sidebarHovered}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    <div class="sidebar-header">
      {#if showExpanded}
        <div class="sidebar-brand">
          <Logo class="sidebar-logo-small" />
          <h2>Arbor <span class="admin-label">(admin panel)</span></h2>
        </div>
      {:else}
        <a href="/admin" class="sidebar-logo-link" title="Arbor Dashboard">
          <Logo class="sidebar-logo" />
        </a>
      {/if}
      <button
        class="collapse-btn"
        onclick={toggleCollapse}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft class="collapse-icon{sidebarCollapsed ? ' rotated' : ''}" />
      </button>
      <button class="close-sidebar" onclick={closeSidebar} aria-label="Close menu">
        &times;
      </button>
    </div>

    <nav class="sidebar-nav">
      <a href="/admin" class="nav-item" onclick={closeSidebar} title="Dashboard">
        <LayoutDashboard class="nav-icon" />
        <span class="nav-label" class:hidden={!showExpanded}>Dashboard</span>
      </a>
      <a href="/admin/blog" class="nav-item" onclick={closeSidebar} title="Blog Posts">
        <FileText class="nav-icon" />
        <span class="nav-label" class:hidden={!showExpanded}>Blog Posts</span>
      </a>
      <a href="/admin/pages" class="nav-item" onclick={closeSidebar} title="Pages">
        <FileStack class="nav-icon" />
        <span class="nav-label" class:hidden={!showExpanded}>Pages</span>
      </a>
      <a href="/admin/images" class="nav-item" onclick={closeSidebar} title="Images">
        <Image class="nav-icon" />
        <span class="nav-label" class:hidden={!showExpanded}>Images</span>
      </a>
      <a href="/admin/account" class="nav-item" onclick={closeSidebar} title="Account">
        <CreditCard class="nav-icon" />
        <span class="nav-label" class:hidden={sidebarCollapsed}>Account</span>
      </a>
      <a href="/admin/settings" class="nav-item" onclick={closeSidebar} title="Settings">
        <Settings class="nav-icon" />
        <span class="nav-label" class:hidden={!showExpanded}>Settings</span>
      </a>

      {#if isGroveAdmin}
        <!-- Vista: Grove Admin Section -->
        <div class="nav-divider" class:hidden={!showExpanded}></div>
        <div class="nav-section-label" class:hidden={!showExpanded}>
          <Eye class="section-icon" />
          <span>Vista</span>
        </div>
        <a href="/admin/comped-invites" class="nav-item" onclick={closeSidebar} title="Comped Invites">
          <Gift class="nav-icon" />
          <span class="nav-label" class:hidden={!showExpanded}>Comped Invites</span>
        </a>
        <a href="/admin/reserved-usernames" class="nav-item" onclick={closeSidebar} title="Reserved Usernames">
          <Shield class="nav-icon" />
          <span class="nav-label" class:hidden={!showExpanded}>Reserved Names</span>
        </a>
      {/if}
    </nav>

    {#if showExpanded}
      <div class="sidebar-footer">
        <div class="user-info">
          <span class="email">{data.user?.email ?? 'Guest (Demo Mode)'}</span>
        </div>
        <a href="https://grove.place/knowledge/help" target="_blank" rel="noopener" class="help-link">
          <HelpCircle class="help-icon" />
          <span>Help Center</span>
        </a>
        <a href="https://grove.place/porch" target="_blank" rel="noopener" class="help-link">
          <MessageCircle class="help-icon" />
          <span>Get Support</span>
        </a>
        {#if data.user}
          <a href="/auth/logout" class="logout-btn">
            <LogOut class="logout-icon" />
            <span>Logout</span>
          </a>
        {:else}
          <a href="/auth/login" class="logout-btn">
            <LogOut class="logout-icon" />
            <span>Sign In</span>
          </a>
        {/if}
      </div>
    {:else}
      <div class="sidebar-footer-collapsed">
        <a href="https://grove.place/knowledge/help" target="_blank" rel="noopener" class="help-link-icon" title="Help Center">
          <HelpCircle class="help-icon" />
        </a>
        <a href="https://grove.place/porch" target="_blank" rel="noopener" class="help-link-icon" title="Get Support">
          <MessageCircle class="help-icon" />
        </a>
        {#if data.user}
          <a href="/auth/logout" class="logout-btn-icon" title="Logout" aria-label="Logout">
            <LogOut class="logout-icon" />
          </a>
        {:else}
          <a href="/auth/login" class="logout-btn-icon" title="Sign In" aria-label="Sign In">
            <LogOut class="logout-icon" />
          </a>
        {/if}
      </div>
    {/if}
  </aside>

  <main class="content" class:expanded={sidebarCollapsed}>
    {@render children()}
  </main>
</div>

<Toast />

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    /* Transparent background to show leaf pattern */
    background: transparent;
    transition: background-color 0.3s ease;
  }

  /* Glass sidebar styling */
  .glass-sidebar {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--grove-overlay-15);
  }

  /* Sidebar overlay for mobile */
  .sidebar-overlay {
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

  /* Close button in sidebar - hidden on desktop */
  .close-sidebar {
    display: none;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.3s ease;
  }

  .sidebar {
    width: 250px;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    position: fixed;
    /* Chrome Header is 76px tall (py-6 = 24px*2 + content ~28px) */
    top: calc(76px + 0.75rem);
    left: 0.75rem;
    bottom: 0.75rem;
    height: auto;
    max-height: calc(100vh - 76px - 1.5rem);
    z-index: 99;
    border-radius: var(--border-radius-standard);
    transition: all 0.3s ease;
    overflow-y: auto;
    box-shadow: var(--shadow-md);
  }

  .sidebar.collapsed {
    width: 72px;
  }

  /* Hover-to-expand: when collapsed sidebar is hovered, expand it */
  .sidebar.collapsed.hovered {
    width: 250px;
    z-index: 100;
    box-shadow: var(--shadow-lg);
  }

  .sidebar-header {
    padding: 1.25rem;
    border-bottom: 1px solid var(--grove-border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    transition: border-color 0.3s ease;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    /* Use user's accent color with fallback to Grove Green */
    color: var(--user-accent, var(--color-primary));
  }

  .admin-label {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  :global(.dark) .admin-label {
    color: var(--grove-text-subtle);
  }

  :global(.sidebar-logo) {
    width: 2rem;
    height: 2.5rem;
  }

  :global(.sidebar-logo-small) {
    width: 1.5rem;
    height: 1.875rem;
  }

  .sidebar-logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .sidebar-logo-link:hover {
    opacity: 0.8;
  }

  .sidebar.collapsed .sidebar-header {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0.5rem;
  }

  /* When hovered, restore normal header layout */
  .sidebar.collapsed.hovered .sidebar-header {
    flex-direction: row;
    padding: 1.25rem;
  }

  .sidebar.collapsed .collapse-btn {
    background: var(--grove-overlay-8);
    padding: 0.5rem;
    border-radius: var(--border-radius-button);
  }

  .sidebar.collapsed .collapse-btn:hover {
    background: var(--grove-overlay-15);
  }

  /* When hovered, restore normal collapse button */
  .sidebar.collapsed.hovered .collapse-btn {
    background: none;
    padding: 0.25rem;
  }

  .collapse-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-small);
    transition: background-color 0.2s, color 0.2s;
  }

  .collapse-btn:hover {
    background: var(--overlay-dark-5);
    color: var(--color-text);
  }

  :global(.dark) .collapse-btn:hover {
    background: var(--overlay-light-10);
  }

  :global(.collapse-icon) {
    width: 1.25rem;
    height: 1.25rem;
    transition: transform 0.3s ease;
  }

  :global(.collapse-icon.rotated) {
    transform: rotate(180deg);
  }

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
    min-height: 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    transition: background 0.2s, color 0.2s;
    margin: 0.125rem 0.5rem;
  }

  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 0.75rem;
    margin: 0.25rem 0.5rem;
  }

  /* When hovered, restore normal nav item layout */
  .sidebar.collapsed.hovered .nav-item {
    justify-content: flex-start;
    padding: 0.75rem 1.25rem;
    margin: 0.125rem 0.5rem;
  }

  .nav-item:hover {
    background: var(--grove-overlay-8);
    color: var(--user-accent, var(--color-primary));
  }

  :global(.dark) .nav-item:hover {
    background: var(--grove-overlay-12);
    color: var(--grove-300, #86efac);
  }

  :global(.dark) .nav-item {
    color: var(--grove-text-strong);
  }

  .nav-item :global(.nav-icon) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
  }

  .hidden {
    display: none;
  }

  .nav-divider {
    height: 1px;
    background: var(--grove-border-subtle);
    margin: 0.75rem 1rem;
  }

  .nav-section-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 1.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  :global(.section-icon) {
    width: 0.75rem;
    height: 0.75rem;
  }

  .sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--grove-border-subtle);
    transition: border-color 0.3s ease;
    flex-shrink: 0;
  }

  .sidebar-footer-collapsed {
    padding: 0.75rem;
    border-top: 1px solid var(--grove-border-subtle);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  :global(.dark) .sidebar-footer-collapsed {
    border-color: var(--grove-border-subtle);
  }

  .user-info {
    margin-bottom: 0.75rem;
  }

  .email {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    word-break: break-all;
    transition: color 0.3s ease;
  }

  :global(.dark) .email {
    color: var(--grove-text-muted);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--grove-overlay-8);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    font-size: 0.85rem;
    transition: background 0.2s, color 0.2s;
  }

  :global(.dark) .logout-btn {
    background: var(--grove-overlay-10);
    color: var(--grove-text-strong);
  }

  .logout-btn:hover {
    background: var(--grove-overlay-15);
    color: var(--user-accent, var(--color-primary));
  }

  :global(.dark) .logout-btn:hover {
    background: var(--grove-overlay-18);
    color: var(--grove-300, #86efac);
  }

  .logout-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--grove-overlay-8);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    transition: background 0.2s, color 0.2s;
  }

  :global(.dark) .logout-btn-icon {
    background: var(--grove-overlay-10);
    color: var(--grove-text-strong);
  }

  .logout-btn-icon:hover {
    background: var(--grove-overlay-15);
    color: var(--user-accent, var(--color-primary));
  }

  :global(.dark) .logout-btn-icon:hover {
    background: var(--grove-overlay-18);
    color: var(--grove-300, #86efac);
  }

  .help-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--grove-overlay-8);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    font-size: 0.85rem;
    transition: background 0.2s, color 0.2s;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .help-link {
    background: var(--grove-overlay-10);
    color: var(--grove-text-strong);
  }

  .help-link:hover {
    background: var(--grove-overlay-15);
    color: var(--user-accent, var(--color-primary));
  }

  :global(.dark) .help-link:hover {
    background: var(--grove-overlay-18);
    color: var(--grove-300, #86efac);
  }

  .help-link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--grove-overlay-8);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    transition: background 0.2s, color 0.2s;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .help-link-icon {
    background: var(--grove-overlay-10);
    color: var(--grove-text-strong);
  }

  .help-link-icon:hover {
    background: var(--grove-overlay-15);
    color: var(--user-accent, var(--color-primary));
  }

  :global(.dark) .help-link-icon:hover {
    background: var(--grove-overlay-18);
    color: var(--grove-300, #86efac);
  }

  :global(.help-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.logout-icon) {
    width: 1rem;
    height: 1rem;
  }

  .content {
    flex: 1;
    margin-left: calc(250px + 0.75rem);
    padding: 2rem;
    min-height: 100vh;
    transition: margin-left 0.3s ease;
  }

  .content.expanded {
    margin-left: calc(72px + 0.75rem);
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .sidebar {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 1002;
      top: 0;
      left: 0;
      bottom: 0;
      border-radius: 0;
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar.collapsed {
      width: 250px; /* Don't collapse on mobile */
    }

    .sidebar.collapsed.hovered {
      width: 250px; /* No hover expansion on mobile */
      box-shadow: var(--shadow-md);
    }

    .sidebar-overlay {
      display: block;
    }

    .close-sidebar {
      display: block;
    }

    .collapse-btn {
      display: none;
    }

    .content {
      margin-left: 0;
      padding: 1rem;
      /* Chrome Header is ~76px tall (py-6 = 24px*2 + content) */
      padding-top: calc(76px + 1rem);
    }

    .content.expanded {
      margin-left: 0;
    }
  }
</style>
