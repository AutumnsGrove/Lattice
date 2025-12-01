<script>
  import { Toast } from "$lib/components/ui";

  let { data, children } = $props();
  let sidebarOpen = $state(false);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<svelte:head>
  <title>Admin - Autumns Grove</title>
</svelte:head>

<div class="admin-layout">
  <!-- Mobile header -->
  <header class="mobile-header">
    <button class="hamburger" onclick={toggleSidebar} aria-label="Toggle menu">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
    <a href="/" class="mobile-home-link" aria-label="Go to home page">The Grove</a>
    <span class="mobile-header-spacer"></span>
  </header>

  <!-- Overlay for mobile -->
  {#if sidebarOpen}
    <button
      class="sidebar-overlay"
      onclick={closeSidebar}
      aria-label="Close menu"
    ></button>
  {/if}

  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <h2>Admin Panel</h2>
      <button class="close-sidebar" onclick={closeSidebar} aria-label="Close menu">
        &times;
      </button>
    </div>

    <nav class="sidebar-nav">
      <a href="/admin" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F3E0;</span>
        Dashboard
      </a>
      <a href="/admin/blog" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F4DD;</span>
        Blog Posts
      </a>
      <a href="/admin/pages" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F4C4;</span>
        Pages
      </a>
      <a href="/admin/recipes" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F373;</span>
        Recipes
      </a>
      <a href="/admin/images" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F4F7;</span>
        CDN Uploader
      </a>
      <a href="/admin/analytics" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F4CA;</span>
        Analytics
      </a>
      <a href="/admin/timeline" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F4C5;</span>
        Timeline
      </a>
      <a href="/admin/logs" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x1F5A5;</span>
        Console
      </a>
      <a href="/admin/settings" class="nav-item" onclick={closeSidebar}>
        <span class="nav-icon">&#x2699;</span>
        Settings
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <span class="email">{data.user.email}</span>
      </div>
      <a href="/auth/logout" class="logout-btn">Logout</a>
    </div>
  </aside>

  <main class="content">
    {@render children()}
  </main>
</div>

<Toast />

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg-secondary);
    transition: background-color 0.3s ease;
  }
  /* Mobile header - hidden on desktop */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--mobile-menu-bg);
    color: var(--color-text);
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    z-index: 1000;
    border-bottom: 1px solid var(--color-border);
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }
  .mobile-home-link {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--color-primary);
    text-decoration: none;
    transition: color 0.2s;
  }
  .mobile-home-link:hover {
    color: var(--color-primary-hover);
  }
  .mobile-header-spacer {
    width: 36px; /* Match hamburger button width for centering */
  }
  .hamburger {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: none;
    border: none;
    cursor: pointer;
  }
  .hamburger-line {
    width: 20px;
    height: 2px;
    background: var(--color-text);
    border-radius: 1px;
    transition: background-color 0.3s ease;
  }
  /* Sidebar overlay for mobile */
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
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
    background: var(--mobile-menu-bg);
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: calc(4rem + 0.75rem); /* Header height + margin */
    left: 0.75rem;
    bottom: 0.75rem;
    height: auto;
    max-height: calc(100vh - 5.5rem); /* Account for header + margins */
    z-index: 99; /* Below header (100) but above content */
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    overflow-y: auto;
  }
  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.3s ease;
  }
  .sidebar-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .sidebar-nav {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
    min-height: 0; /* Allow flex item to shrink */
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    transition: background 0.2s, color 0.2s;
  }
  .nav-item:hover {
    background: var(--color-bg-secondary);
    color: var(--color-primary);
  }
  .nav-icon {
    font-size: 1.1rem;
  }
  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    transition: border-color 0.3s ease;
    flex-shrink: 0; /* Prevent footer from being squeezed */
  }
  .user-info {
    margin-bottom: 0.75rem;
  }
  .email {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    word-break: break-all;
    transition: color 0.3s ease;
  }
  .logout-btn {
    display: block;
    text-align: center;
    padding: 0.5rem;
    background: var(--color-bg-secondary);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-button);
    font-size: 0.85rem;
    transition: background 0.2s, color 0.2s;
  }
  .logout-btn:hover {
    background: var(--color-border);
    color: var(--color-text);
  }
  .content {
    flex: 1;
    margin-left: calc(250px + 0.75rem); /* Sidebar width + left margin */
    padding: 2rem;
    min-height: 100vh;
  }
  /* Mobile styles */
  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }
    .sidebar {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 1002; /* Above sidebar-overlay (1001) on mobile */
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .sidebar-overlay {
      display: block;
    }
    .close-sidebar {
      display: block;
    }
    .content {
      margin-left: 0;
      padding: 1rem;
      padding-top: calc(56px + 1rem); /* Account for mobile header */
    }
  }
</style>
