<script lang="ts">
  import { GlassCard } from "$lib/ui";
  import { CreditCard, ExternalLink, Loader2, Gift } from "lucide-svelte";
  import { api } from "$lib/utils";
  import type { BillingData } from "./types";

  interface Props {
    billing: BillingData | null;
  }

  let { billing }: Props = $props();

  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let isComped = $state(false);
  let compedMessage = $state<string | null>(null);

  /**
   * Open Stripe Billing Portal
   * Creates a portal session and redirects the user
   */
  async function openBillingPortal() {
    isLoading = true;
    errorMessage = null;
    isComped = false;
    compedMessage = null;

    try {
      const data = await api.put<{
        isComped?: boolean;
        message?: string;
        portalUrl?: string;
        success?: boolean;
      }>("/api/billing", {});

      // Handle comped accounts gracefully
      if (data?.isComped) {
        isComped = true;
        compedMessage = data.message || "Your account is complimentary.";
        isLoading = false;
        return;
      }

      if (data?.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Failed to open billing portal:", err);
      errorMessage =
        err instanceof Error ? err.message : "Failed to open billing portal";
      isLoading = false;
    }
  }
</script>

<GlassCard variant="default" class="mb-6">
  <h2>Payment Method</h2>

  {#if isComped}
    <!-- Comped account - show friendly message -->
    <div class="comped-notice">
      <div class="comped-icon">
        <Gift class="gift-icon" aria-hidden="true" />
      </div>
      <div class="comped-content">
        <p class="comped-title">Complimentary Account</p>
        <p class="comped-description">{compedMessage}</p>
      </div>
    </div>
  {:else if billing?.paymentMethod}
    <div class="payment-info">
      <div class="card-display">
        <CreditCard class="card-icon" aria-hidden="true" />
        <div class="card-details">
          <span class="card-brand">{billing.paymentMethod.brand || "Card"}</span>
          <span class="card-number">•••• {billing.paymentMethod.last4}</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="no-payment">
      <p class="muted">Payment method on file with Stripe.</p>
    </div>
  {/if}

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}

  {#if !isComped}
    <p class="payment-note">
      <button
        type="button"
        onclick={openBillingPortal}
        disabled={isLoading}
        class="portal-button"
      >
        {#if isLoading}
          <Loader2 class="spinner" aria-hidden="true" />
          Opening portal...
        {:else}
          Manage Payment Method
          <ExternalLink class="external-icon" aria-hidden="true" />
        {/if}
      </button>
    </p>
  {/if}
</GlassCard>

<style>
  .payment-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.card-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-text-muted);
  }

  .card-details {
    display: flex;
    flex-direction: column;
  }

  .card-brand {
    font-weight: 500;
    text-transform: capitalize;
  }

  .card-number {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-family: monospace;
  }

  .no-payment {
    margin-bottom: 1rem;
  }

  .no-payment p {
    margin: 0;
  }

  .payment-note {
    margin: 0;
  }

  .portal-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .portal-button:hover:not(:disabled) {
    background: var(--color-primary-dark, #15803d);
  }

  .portal-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  :global(.external-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.spinner) {
    width: 1rem;
    height: 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    color: var(--color-error, #ef4444);
    font-size: 0.875rem;
    margin: 0.5rem 0;
  }

  .muted {
    color: var(--color-text-muted);
  }

  @media (max-width: 640px) {
    .payment-info {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  /* Comped account styles */
  .comped-notice {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-success-bg, rgba(34, 197, 94, 0.1));
    border: 1px solid var(--color-success-border, rgba(34, 197, 94, 0.3));
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .comped-icon {
    flex-shrink: 0;
    padding: 0.5rem;
    background: var(--color-success-icon-bg, rgba(34, 197, 94, 0.2));
    border-radius: 0.375rem;
  }

  :global(.gift-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-success, #22c55e);
  }

  .comped-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .comped-title {
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .comped-description {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
