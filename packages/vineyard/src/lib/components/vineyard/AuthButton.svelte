<!--
  AuthButton.svelte
  Simple authentication button with Better Auth integration

  Usage:
  <AuthButton provider="google" />
  <AuthButton provider="github" signInText="Login with GitHub" />
-->
<script lang="ts">
  import type { AuthButtonProps } from '../../types/index.js';
  import { signIn, signOut, getSession } from '../../auth/index.js';
  import { LogIn, LogOut } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Props extends AuthButtonProps {}

  let {
    provider = 'google',
    signInText = `Sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
    signOutText = 'Sign out'
  }: Props = $props();

  let isAuthenticated = $state(false);
  let isLoading = $state(true);

  onMount(async () => {
    const session = await getSession();
    isAuthenticated = session.user !== null;
    isLoading = false;
  });

  function handleSignIn() {
    signIn(provider);
  }

  async function handleSignOut() {
    await signOut();
  }
</script>

<button
  class="auth-button"
  class:authenticated={isAuthenticated}
  onclick={isAuthenticated ? handleSignOut : handleSignIn}
  disabled={isLoading}
  aria-label={isAuthenticated ? 'Sign out' : 'Sign in'}
>
  {#if isLoading}
    <span class="loading-spinner"></span>
    <span>Loading...</span>
  {:else if isAuthenticated}
    <LogOut size={16} />
    <span>{signOutText}</span>
  {:else}
    <LogIn size={16} />
    <span>{signInText}</span>
  {/if}
</button>

<style>
  .auth-button {
    --grove-amber-500: #f59e0b;
    --grove-amber-600: #d97706;
    --grove-red-500: #ef4444;
    --grove-red-600: #dc2626;
    --grove-stone-800: #292524;

    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .auth-button:not(.authenticated) {
    background: linear-gradient(135deg, var(--grove-amber-500) 0%, var(--grove-amber-600) 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }

  .auth-button:not(.authenticated):hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  .auth-button.authenticated {
    background: linear-gradient(135deg, var(--grove-red-500) 0%, var(--grove-red-600) 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }

  .auth-button.authenticated:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
