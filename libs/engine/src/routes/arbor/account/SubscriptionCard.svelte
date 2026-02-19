<script lang="ts">
  import { GlassCard, Button, Spinner } from "$lib/ui";
  import {
    AlertCircle,
    Check,
    X,
    Package,
    Calendar,
    RefreshCw,
  } from "lucide-svelte";
  import type { BillingData, TierConfig } from "./types";
  import { formatDate, daysRemaining } from "./utils";

  interface Props {
    billing: BillingData | null;
    billingError: boolean;
    tierConfig: TierConfig | null;
    cancellingSubscription: boolean;
    resumingSubscription: boolean;
    onCancel: () => void;
    onResume: () => void;
  }

  let {
    billing,
    billingError,
    tierConfig,
    cancellingSubscription,
    resumingSubscription,
    onCancel,
    onResume,
  }: Props = $props();

  // Computed status flags
  const isActive = $derived(billing?.status === "active");
  const isCancelled = $derived(billing?.cancelAtPeriodEnd === true);
  const isPastDue = $derived(billing?.status === "past_due");
</script>

<GlassCard variant="frosted" class="mb-6">
  {#if billingError}
    <div class="error-state" role="alert" aria-live="polite">
      <AlertCircle class="error-icon" aria-hidden="true" />
      <div>
        <p class="error-title">Could not load billing information</p>
        <p class="error-desc">Please try refreshing the page. If the problem persists, contact support.</p>
      </div>
    </div>
  {:else}
    <div class="plan-header">
      <div class="plan-info">
        <div class="plan-badge">
          <Package class="plan-icon" />
          <span class="plan-name">{tierConfig?.name || "Unknown"}</span>
        </div>
        <p class="plan-tagline">{tierConfig?.tagline || ""}</p>
      </div>

      <div class="plan-status" role="status" aria-live="polite">
        {#if isPastDue}
          <span class="status-badge past-due" aria-label="Subscription status: Payment past due">
            <AlertCircle class="status-icon" aria-hidden="true" />
            Past Due
          </span>
        {:else if isCancelled}
          <span class="status-badge cancelled" aria-label="Subscription status: Cancelling at period end">
            <X class="status-icon" aria-hidden="true" />
            Cancelling
          </span>
        {:else if isActive}
          <span class="status-badge active" aria-label="Subscription status: Active">
            <Check class="status-icon" aria-hidden="true" />
            Active
          </span>
        {:else}
          <span class="status-badge inactive" aria-label="Subscription status: {billing?.status || 'No subscription'}">
            <AlertCircle class="status-icon" aria-hidden="true" />
            {billing?.status || "No Subscription"}
          </span>
        {/if}
      </div>
    </div>
  {/if}

  {#if billing?.hasSubscription}
    <div class="billing-details">
      {#if billing?.currentPeriodStart && billing?.currentPeriodEnd}
        <div class="detail-row">
          <span class="detail-label">Current Period</span>
          <span class="detail-value">
            {formatDate(billing.currentPeriodStart)} — {formatDate(billing.currentPeriodEnd)}
          </span>
        </div>
      {:else if billing?.hasSubscription}
        <div class="detail-row">
          <span class="detail-label">Current Period</span>
          <span class="detail-value muted">Period unavailable</span>
        </div>
      {/if}

      {#if billing?.currentPeriodEnd}
        {@const days = daysRemaining(billing.currentPeriodEnd)}
        <div class="detail-row">
          <span class="detail-label">
            {isCancelled ? "Access Ends In" : "Renews In"}
          </span>
          <span class="detail-value" class:warning={days !== null && days <= 7}>
            {days} {days === 1 ? "day" : "days"}
          </span>
        </div>
      {/if}

    </div>

    <div class="plan-actions" role="group" aria-label="Subscription actions">
      {#if isCancelled}
        <Button
          variant="primary"
          onclick={onResume}
          disabled={resumingSubscription}
          aria-busy={resumingSubscription}
          aria-label={resumingSubscription ? "Resuming subscription..." : "Resume subscription"}
        >
          {#if resumingSubscription}
            <span aria-hidden="true"><Spinner size="sm" /></span>
          {:else}
            <RefreshCw class="btn-icon" aria-hidden="true" />
          {/if}
          Resume Membership
        </Button>
      {:else}
        <Button
          variant="danger"
          onclick={onCancel}
          disabled={cancellingSubscription}
          aria-busy={cancellingSubscription}
          aria-label={cancellingSubscription ? "Cancelling subscription..." : "Cancel subscription"}
        >
          {#if cancellingSubscription}
            <span aria-hidden="true"><Spinner size="sm" /></span>
          {:else}
            <X class="btn-icon" aria-hidden="true" />
          {/if}
          Cancel Membership
        </Button>
      {/if}
    </div>
  {:else if !billingError}
    <div class="no-subscription">
      <p>No active membership found.</p>
      <Button variant="primary" href="https://grove.place/plans">
        View Plans
      </Button>
    </div>
  {/if}
</GlassCard>

<style>
  /* Error States */
  .error-state {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--border-radius-standard);
  }

  :global(.error-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: #dc2626;
    flex-shrink: 0;
  }

  .error-title {
    margin: 0 0 0.25rem 0;
    font-weight: 600;
    color: #dc2626;
  }

  .error-desc {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  /* Plan Header */
  .plan-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .plan-info {
    flex: 1;
    min-width: 200px;
  }

  .plan-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  :global(.plan-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-primary);
  }

  .plan-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .plan-tagline {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  /* Status Badges */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  :global(.status-icon) {
    width: 1rem;
    height: 1rem;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.cancelled {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.past-due {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-badge.inactive {
    background: #f3f4f6;
    color: #6b7280;
  }

  :global(.dark) .status-badge.active {
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
  }

  :global(.dark) .status-badge.cancelled {
    background: rgba(245, 158, 11, 0.2);
    color: #fcd34d;
  }

  :global(.dark) .status-badge.past-due {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  /* Billing Details */
  .billing-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--grove-overlay-5);
    border-radius: var(--border-radius-standard);
    margin-bottom: 1.5rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .detail-label {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .detail-value {
    font-weight: 500;
    color: var(--color-text);
  }

  .detail-value.warning {
    color: #ea580c;
  }

  .detail-value.muted {
    color: var(--color-text-muted);
  }

  .plan-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .no-subscription {
    text-align: center;
    padding: 1rem 0;
  }

  .no-subscription p {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }

  @media (max-width: 640px) {
    .plan-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .billing-details {
      padding: 0.75rem;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>
