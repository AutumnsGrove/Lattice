<script lang="ts">
  import { GlassCard } from "$lib/ui";
  import { CreditCard, ExternalLink, Loader2 } from "lucide-svelte";
  import type { BillingData } from "./types";

  interface Props {
    billing: BillingData | null;
  }

  let { billing }: Props = $props();

  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  /**
   * Open Stripe Billing Portal
   * Creates a portal session and redirects the user
   */
  async function openBillingPortal() {
    isLoading = true;
    errorMessage = null;

    try {
      const response = await fetch("/api/billing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to open billing portal");
      }

      if (data.portalUrl) {
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

  {#if billing?.paymentMethod}
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
</style>
