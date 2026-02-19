<script lang="ts">
  /**
   * QuotaWarning - Warning banner for post limit status
   *
   * Shows contextual warnings when users are near or at their limit.
   * Can be placed on the post editor or dashboard.
   */

  import type { PreSubmitCheckResult, AlertVariant } from '../../heartwood/index.js';
  import { ALERT_VARIANTS } from '../../heartwood/index.js';

  interface Props {
    check: PreSubmitCheckResult;
    upgradeUrl?: string;
    onDismiss?: () => void;
    showDismiss?: boolean;
  }

  let {
    check,
    upgradeUrl = '/upgrade',
    onDismiss,
    showDismiss = true,
  }: Props = $props();

  let dismissed = $state(false);

  function handleDismiss() {
    dismissed = true;
    onDismiss?.();
  }

  // Defensive check for malformed data
  const isValidCheck = $derived(
    check &&
    typeof check === 'object' &&
    check.status &&
    typeof check.status === 'object'
  );

  // Determine variant based on check result
  const variant = $derived<AlertVariant>(
    !isValidCheck ? 'info' :
    check.upgradeRequired ? 'error' :
    check.status.is_in_grace_period ? 'warning' :
    check.status.is_at_limit ? 'warning' :
    'info'
  );

  // Get variant classes from shared utility
  const variantClasses = $derived(ALERT_VARIANTS[variant]);
</script>

{#if isValidCheck && check.showWarning && !dismissed}
  <div class="rounded-lg border p-4 {variantClasses.container}">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div class="flex-shrink-0">
        {#if variant === 'error'}
          <svg class="w-5 h-5 {variantClasses.icon}" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        {:else if variant === 'warning'}
          <svg class="w-5 h-5 {variantClasses.icon}" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg class="w-5 h-5 {variantClasses.icon}" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        {/if}
      </div>

      <!-- Content -->
      <div class="flex-1">
        <h3 class="text-sm font-medium {variantClasses.title}">
          {#if check.upgradeRequired}
            Upgrade Required
          {:else if check.status.is_in_grace_period}
            Grace Period Active
          {:else if check.status.is_at_limit}
            Post Limit Reached
          {:else}
            Approaching Limit
          {/if}
        </h3>

        {#if check.warningMessage}
          <p class="mt-1 text-sm {variantClasses.text}">
            {check.warningMessage}
          </p>
        {/if}

        <!-- Actions -->
        <div class="mt-3 flex items-center gap-3">
          <a
            href={upgradeUrl}
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md {variantClasses.button}"
          >
            {check.upgradeRequired ? 'Upgrade Now' : 'View Plans'}
          </a>

          {#if !check.upgradeRequired}
            <span class="text-sm {variantClasses.text}">
              {check.status.posts_remaining !== null ? `${check.status.posts_remaining} posts remaining` : ''}
            </span>
          {/if}
        </div>
      </div>

      <!-- Dismiss button -->
      {#if showDismiss && !check.upgradeRequired}
        <button
          onclick={handleDismiss}
          class="flex-shrink-0 {variantClasses.text} hover:opacity-75"
          aria-label="Dismiss"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
{/if}
