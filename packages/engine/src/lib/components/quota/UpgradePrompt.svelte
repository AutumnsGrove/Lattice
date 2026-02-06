<script lang="ts">
  /**
   * UpgradePrompt - Modal/dialog for upgrade prompts
   *
   * Shows when user tries to create a post but is at/over limit.
   * Provides options to upgrade, delete posts, or cancel.
   *
   * Accessibility features:
   * - Focus trap within modal
   * - Escape key closes modal
   * - Focus returns to trigger element on close
   * - ARIA attributes for screen readers
   */

  import type { SubscriptionStatus } from '../../heartwood/index.js';
  import { TIERS, getNextTier, formatLimit, type PaidTierKey } from '../../config/tiers.js';

  interface Props {
    open: boolean;
    status: SubscriptionStatus;
    upgradeUrl?: string;
    onClose: () => void;
    onProceed?: () => void; // If allowed during grace period
    oldestPostTitle?: string;
    oldestPostDate?: string;
  }

  let {
    open,
    status,
    upgradeUrl = '/upgrade',
    onClose,
    onProceed,
    oldestPostTitle,
    oldestPostDate,
  }: Props = $props();

  // Reference to the modal dialog element
  let dialogRef: HTMLDivElement | null = $state(null);

  // Store the previously focused element to restore on close
  let previouslyFocusedElement: HTMLElement | null = null;

  // Defensive check for malformed status data
  const isValidStatus = $derived(
    status &&
    typeof status === 'object' &&
    typeof status.tier === 'string' &&
    typeof status.post_count === 'number'
  );

  // Safe status with fallback values
  const safeStatus = $derived(isValidStatus ? status : {
    tier: 'seedling' as const,
    post_count: 0,
    post_limit: 50,
    posts_remaining: 50,
    percentage_used: 0,
    is_at_limit: false,
    is_in_grace_period: false,
    grace_period_days_remaining: null,
    can_create_post: true,
    upgrade_required: false,
  });

  // Can proceed if in grace period and not expired
  const canProceed = $derived(
    safeStatus.is_in_grace_period &&
    safeStatus.grace_period_days_remaining !== null &&
    safeStatus.grace_period_days_remaining > 0
  );

  // Tier upgrade path (derived from unified config)
  const nextTier = $derived(getNextTier(safeStatus.tier as PaidTierKey));

  const nextTierName = $derived(nextTier ? TIERS[nextTier].display.name : null);
  const currentTierName = $derived(TIERS[safeStatus.tier as PaidTierKey]?.display.name || 'Unknown');

  // Get next tier's post limit for display
  const nextTierPostLimit = $derived(
    nextTier ? formatLimit(TIERS[nextTier].limits.posts) : null
  );

  /**
   * Get all focusable elements within the modal
   */
  function getFocusableElements(): HTMLElement[] {
    if (!dialogRef) return [];
    return Array.from(
      dialogRef.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  /**
   * Handle keyboard events for focus trap and escape
   */
  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  /**
   * Focus the first focusable element when modal opens
   */
  function focusFirstElement() {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Handle modal open/close
  $effect(() => {
    if (open) {
      // Store the currently focused element
      previouslyFocusedElement = document.activeElement as HTMLElement;

      // Add escape key listener to document
      document.addEventListener('keydown', handleKeyDown);

      // Focus the first element after render
      // Use setTimeout to ensure the DOM is ready
      setTimeout(focusFirstElement, 0);
    }

    // Always return cleanup to handle both open→closed transitions and unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously focused element
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
      }
    };
  });

</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-grove-modal flex items-center justify-center p-4"
    onclick={onClose}
    role="presentation"
  >
    <!-- Modal -->
    <div
      bind:this={dialogRef}
      class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      aria-describedby="upgrade-description"
      tabindex="0"
    >
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>

        <h3 id="upgrade-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {#if safeStatus.upgrade_required}
            Upgrade Required
          {:else}
            You're at {safeStatus.post_count}/{safeStatus.post_limit} posts
          {/if}
        </h3>
      </div>

      <!-- Content -->
      <div id="upgrade-description" class="space-y-4 mb-6">
        {#if safeStatus.upgrade_required}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            Your grace period has expired. To continue creating posts, please upgrade your plan or delete some existing posts.
          </p>
        {:else if safeStatus.is_in_grace_period}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            You're over your post limit. You have <strong class="text-yellow-600 dark:text-yellow-400">{safeStatus.grace_period_days_remaining} days</strong> remaining in your grace period.
          </p>

          {#if oldestPostTitle}
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
              <p class="text-gray-500 dark:text-gray-400">If you continue, new posts may need to replace older ones. Your oldest post:</p>
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100">"{oldestPostTitle}"</p>
              {#if oldestPostDate}
                <p class="text-xs text-gray-500 dark:text-gray-400">{oldestPostDate}</p>
              {/if}
            </div>
          {/if}
        {:else}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            You've reached your post limit on the <strong>{currentTierName}</strong> plan. Upgrade to get more posts.
          </p>
        {/if}

        <!-- Tier comparison -->
        {#if nextTierName && nextTierPostLimit}
          <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-blue-900 dark:text-blue-100">{nextTierName} Plan</p>
                <p class="text-sm text-blue-700 dark:text-blue-300">
                  {nextTierPostLimit === 'Unlimited' ? 'Unlimited posts' : `Up to ${nextTierPostLimit} posts`}
                </p>
              </div>
              <a
                href={upgradeUrl}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Upgrade
              </a>
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        {#if canProceed && onProceed}
          <button
            onclick={onProceed}
            class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Continue Anyway
          </button>
        {/if}

        <div class="flex gap-3">
          <a
            href="/arbor/posts"
            class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Manage Posts
          </a>

          <button
            onclick={onClose}
            class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
