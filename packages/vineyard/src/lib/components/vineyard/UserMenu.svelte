<!--
  UserMenu.svelte
  Display user information with dropdown menu

  Usage:
  <UserMenu />
  <UserMenu showAvatar={true} showEmail={true} />
-->
<script lang="ts">
  import type { UserMenuProps } from '../../types/index.js';
  import type { BetterAuthUser } from '../../types/index.js';
  import { getSession, signOut } from '../../auth/index.js';
  import { User, LogOut, ChevronDown } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Props extends UserMenuProps {}

  let { showAvatar = true, showEmail = true }: Props = $props();

  let user = $state<BetterAuthUser | null>(null);
  let isLoading = $state(true);
  let isMenuOpen = $state(false);

  onMount(async () => {
    const session = await getSession();
    user = session.user;
    isLoading = false;
  });

  async function handleSignOut() {
    isMenuOpen = false;
    await signOut();
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      closeMenu();
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  });
</script>

{#if isLoading}
  <div class="user-menu-loading">
    <div class="loading-spinner"></div>
  </div>
{:else if user}
  <div class="user-menu-container">
    <button class="user-menu-trigger" onclick={toggleMenu} aria-expanded={isMenuOpen}>
      {#if showAvatar}
        <div class="user-avatar">
          {#if user.image}
            <img src={user.image} alt={user.name} />
          {:else}
            <User size={20} />
          {/if}
        </div>
      {/if}
      <div class="user-info">
        <span class="user-name">{user.name}</span>
        {#if showEmail}
          <span class="user-email">{user.email}</span>
        {/if}
      </div>
      <div class="chevron" class:rotated={isMenuOpen}>
        <ChevronDown size={16} />
      </div>
    </button>

    {#if isMenuOpen}
      <div class="user-menu-dropdown">
        <div class="menu-section">
          <div class="menu-user-details">
            <div class="menu-user-name">{user.name}</div>
            <div class="menu-user-email">{user.email}</div>
          </div>
        </div>
        <div class="menu-divider"></div>
        <button class="menu-item menu-item-danger" onclick={handleSignOut}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .user-menu-container {
    --grove-amber-500: #f59e0b;
    --grove-stone-800: #292524;
    --grove-stone-700: #44403c;
    --grove-stone-600: #57534e;
    --grove-stone-500: #78716c;
    --grove-stone-100: #f5f5f4;
    --grove-glass-bg: rgba(255, 251, 235, 0.95);

    position: relative;
    display: inline-block;
  }

  .user-menu-loading {
    display: flex;
    align-items: center;
    padding: 0.5rem;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--grove-stone-300, #d6d3d1);
    border-top-color: var(--grove-amber-500);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .user-menu-trigger {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--grove-glass-bg);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    backdrop-filter: blur(8px);
  }

  .user-menu-trigger:hover {
    background: rgba(255, 251, 235, 1);
    border-color: var(--grove-amber-500);
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: var(--grove-amber-600, #d97706);
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }

  .user-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--grove-stone-800);
    line-height: 1;
  }

  .user-email {
    font-size: 0.75rem;
    color: var(--grove-stone-500);
    line-height: 1;
  }

  .chevron {
    display: flex;
    align-items: center;
    color: var(--grove-stone-600);
    transition: transform 0.2s ease;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .user-menu-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 240px;
    background: white;
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 0.75rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    z-index: 50;
    animation: slideDown 0.15s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-section {
    padding: 0.75rem;
  }

  .menu-user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .menu-user-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--grove-stone-800);
  }

  .menu-user-email {
    font-size: 0.75rem;
    color: var(--grove-stone-500);
  }

  .menu-divider {
    height: 1px;
    background: rgba(245, 158, 11, 0.2);
    margin: 0.25rem 0;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--grove-stone-800);
    transition: background 0.15s ease;
    font-family: inherit;
    text-align: left;
  }

  .menu-item:hover {
    background: var(--grove-stone-100);
  }

  .menu-item-danger {
    color: #dc2626;
  }

  .menu-item-danger:hover {
    background: #fef2f2;
  }
</style>
