<script>
  import { GlassCard, Button, Spinner } from "$lib/ui";
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils";
  import {
    CreditCard,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Check,
    X,
    ExternalLink,
    Package,
    HardDrive,
    FileText,
    Calendar,
    RefreshCw,
  } from "lucide-svelte";
  import { formatStorage, formatLimit } from "$lib/config/tiers";

  let { data } = $props();

  // Action states
  let cancellingSubscription = $state(false);
  let resumingSubscription = $state(false);
  let changingPlan = $state(false);
  let selectedPlan = $state("");
  let openingPortal = $state(false);
  let exportingData = $state(false);
  let exportType = $state("full");

  // Computed
  const isTrialing = $derived(data.billing?.status === "trialing");
  const isActive = $derived(
    data.billing?.status === "active" || data.billing?.status === "trialing"
  );
  const isCancelled = $derived(data.billing?.cancelAtPeriodEnd === true);
  const isPastDue = $derived(data.billing?.status === "past_due");

  // Format date for display
  /** @param {string | null | undefined} isoString */
  function formatDate(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Calculate days remaining in billing period
  /** @param {string | null | undefined} endDateIso */
  function daysRemaining(endDateIso) {
    if (!endDateIso) return null;
    const end = new Date(endDateIso);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  // Cancel subscription
  async function handleCancel() {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription?\n\n" +
          "Your subscription will remain active until the end of your current billing period. " +
          "You can resume at any time before then."
      )
    ) {
      return;
    }

    cancellingSubscription = true;
    try {
      await api.patch("/api/billing", {
        action: "cancel",
        cancelImmediately: false,
      });
      toast.success("Subscription cancelled. Access continues until period end.");
      // Reload the page to refresh data
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription"
      );
    }
    cancellingSubscription = false;
  }

  // Resume cancelled subscription
  async function handleResume() {
    resumingSubscription = true;
    try {
      await api.patch("/api/billing", {
        action: "resume",
      });
      toast.success("Subscription resumed!");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resume subscription"
      );
    }
    resumingSubscription = false;
  }

  // Change plan
  /** @param {string} newPlan */
  async function handleChangePlan(newPlan) {
    if (newPlan === data.currentPlan) return;

    const tierInfo = data.availableTiers.find((t) => t.id === newPlan);
    const action = tierInfo?.isUpgrade ? "upgrade" : "downgrade";

    if (
      !confirm(
        `Are you sure you want to ${action} to ${tierInfo?.name}?\n\n` +
          (tierInfo?.isUpgrade
            ? "You will be charged the pro-rated difference immediately."
            : "The change will take effect at your next billing date.")
      )
    ) {
      return;
    }

    changingPlan = true;
    selectedPlan = newPlan;
    try {
      await api.patch("/api/billing", {
        action: "change_plan",
        plan: newPlan,
      });
      toast.success(`Plan changed to ${tierInfo?.name}!`);
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change plan"
      );
    }
    changingPlan = false;
    selectedPlan = "";
  }

  // Open billing portal for payment method updates
  async function handleOpenBillingPortal() {
    openingPortal = true;
    try {
      const returnUrl = window.location.href;
      const response = await api.put(
        `/api/billing?return_url=${encodeURIComponent(returnUrl)}`,
        {} // Empty body - the return_url is in the query params
      );
      if (response?.portalUrl) {
        window.location.href = response.portalUrl;
      } else {
        toast.error("Could not open billing portal");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open billing portal"
      );
    }
    openingPortal = false;
  }

  // Export data
  async function handleExportData() {
    exportingData = true;
    try {
      // The API returns JSON with Content-Disposition header
      // Open in new window to trigger download
      const downloadUrl = `/api/export?type=${exportType}`;
      window.open(downloadUrl, "_blank");
      toast.success("Data export started. Check your downloads.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export data"
      );
    }
    exportingData = false;
  }
</script>

<div class="account-page">
  <header class="page-header">
    <h1>Account & Subscription</h1>
    <p class="subtitle">Manage your subscription, billing, and data</p>
  </header>

  <!-- Current Plan Overview -->
  <GlassCard variant="frosted" class="mb-6">
    <div class="plan-header">
      <div class="plan-info">
        <div class="plan-badge">
          <Package class="plan-icon" />
          <span class="plan-name">{data.tierConfig?.name || "Unknown"}</span>
        </div>
        <p class="plan-tagline">{data.tierConfig?.tagline || ""}</p>
      </div>

      <div class="plan-status">
        {#if isTrialing}
          <span class="status-badge trialing">
            <Calendar class="status-icon" />
            Trial
          </span>
        {:else if isPastDue}
          <span class="status-badge past-due">
            <AlertCircle class="status-icon" />
            Past Due
          </span>
        {:else if isCancelled}
          <span class="status-badge cancelled">
            <X class="status-icon" />
            Cancelling
          </span>
        {:else if isActive}
          <span class="status-badge active">
            <Check class="status-icon" />
            Active
          </span>
        {:else}
          <span class="status-badge inactive">
            <AlertCircle class="status-icon" />
            {data.billing?.status || "No Subscription"}
          </span>
        {/if}
      </div>
    </div>

    {#if data.billing?.hasSubscription}
      <div class="billing-details">
        <div class="detail-row">
          <span class="detail-label">Current Period</span>
          <span class="detail-value">
            {formatDate(data.billing?.currentPeriodStart)} — {formatDate(data.billing?.currentPeriodEnd)}
          </span>
        </div>

        {#if data.billing?.currentPeriodEnd}
          {@const days = daysRemaining(data.billing.currentPeriodEnd)}
          <div class="detail-row">
            <span class="detail-label">
              {isCancelled ? "Access Ends In" : "Renews In"}
            </span>
            <span class="detail-value" class:warning={days !== null && days <= 7}>
              {days} {days === 1 ? "day" : "days"}
            </span>
          </div>
        {/if}

        {#if isTrialing && data.billing?.trialEnd}
          <div class="detail-row">
            <span class="detail-label">Trial Ends</span>
            <span class="detail-value">
              {formatDate(data.billing.trialEnd)}
            </span>
          </div>
        {/if}
      </div>

      <div class="plan-actions">
        {#if isCancelled}
          <Button
            variant="primary"
            onclick={handleResume}
            disabled={resumingSubscription}
          >
            {#if resumingSubscription}
              <Spinner size="sm" />
            {:else}
              <RefreshCw class="btn-icon" />
            {/if}
            Resume Subscription
          </Button>
        {:else}
          <Button
            variant="danger"
            onclick={handleCancel}
            disabled={cancellingSubscription}
          >
            {#if cancellingSubscription}
              <Spinner size="sm" />
            {:else}
              <X class="btn-icon" />
            {/if}
            Cancel Subscription
          </Button>
        {/if}
      </div>
    {:else}
      <div class="no-subscription">
        <p>No active subscription found.</p>
        <Button variant="primary" href="/plans">
          View Plans
        </Button>
      </div>
    {/if}
  </GlassCard>

  <!-- Usage Stats -->
  {#if data.usage}
    <GlassCard variant="default" class="mb-6">
      <h2>Usage</h2>
      <div class="usage-grid">
        <div class="usage-item">
          <HardDrive class="usage-icon" />
          <div class="usage-info">
            <span class="usage-label">Storage</span>
            <span class="usage-value">
              {formatStorage(data.usage.storageUsed)} / {formatStorage(data.usage.storageLimit)}
            </span>
            <div class="usage-bar">
              <div
                class="usage-fill"
                style:width="{Math.min(100, (data.usage.storageUsed / data.usage.storageLimit) * 100)}%"
                class:warning={(data.usage.storageUsed / data.usage.storageLimit) > 0.8}
              ></div>
            </div>
          </div>
        </div>

        <div class="usage-item">
          <FileText class="usage-icon" />
          <div class="usage-info">
            <span class="usage-label">Posts</span>
            <span class="usage-value">
              {data.usage.postCount} / {data.usage.postLimit ? formatLimit(data.usage.postLimit) : "Unlimited"}
            </span>
            {#if data.usage.postLimit}
              <div class="usage-bar">
                <div
                  class="usage-fill"
                  style:width="{Math.min(100, (data.usage.postCount / data.usage.postLimit) * 100)}%"
                  class:warning={(data.usage.postCount / data.usage.postLimit) > 0.8}
                ></div>
              </div>
            {/if}
          </div>
        </div>

        <div class="usage-item">
          <Calendar class="usage-icon" />
          <div class="usage-info">
            <span class="usage-label">Account Age</span>
            <span class="usage-value">{data.usage.accountAge} days</span>
          </div>
        </div>
      </div>
    </GlassCard>
  {/if}

  <!-- Payment Method -->
  <GlassCard variant="default" class="mb-6">
    <h2>Payment Method</h2>

    {#if data.billing?.paymentMethod}
      <div class="payment-info">
        <div class="card-display">
          <CreditCard class="card-icon" />
          <div class="card-details">
            <span class="card-brand">{data.billing.paymentMethod.brand || "Card"}</span>
            <span class="card-number">•••• {data.billing.paymentMethod.last4}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onclick={handleOpenBillingPortal}
          disabled={openingPortal}
        >
          {#if openingPortal}
            <Spinner size="sm" />
          {:else}
            <ExternalLink class="btn-icon" />
          {/if}
          Update Payment Method
        </Button>
      </div>
    {:else}
      <div class="no-payment">
        <p class="muted">No payment method on file.</p>
        {#if data.billing?.customerId}
          <Button
            variant="secondary"
            onclick={handleOpenBillingPortal}
            disabled={openingPortal}
          >
            {#if openingPortal}
              <Spinner size="sm" />
            {:else}
              <CreditCard class="btn-icon" />
            {/if}
            Add Payment Method
          </Button>
        {/if}
      </div>
    {/if}

    <p class="payment-note">
      Payment processing is handled securely by our payment provider.
      We never store your full card details.
    </p>
  </GlassCard>

  <!-- Change Plan -->
  {#if data.billing?.hasSubscription && data.availableTiers?.length > 1}
    <GlassCard variant="default" class="mb-6">
      <h2>Change Plan</h2>
      <p class="section-description">
        Upgrade for more features or downgrade if you need less.
        Changes are pro-rated based on your billing cycle.
      </p>

      <div class="plan-grid">
        {#each data.availableTiers.filter(t => t.status === 'available') as tier}
          <button
            class="plan-option"
            class:current={tier.isCurrent}
            class:disabled={tier.status === 'coming_soon' || changingPlan}
            onclick={() => handleChangePlan(tier.id)}
            disabled={tier.isCurrent || tier.status === 'coming_soon' || changingPlan}
          >
            <div class="plan-option-header">
              <span class="plan-option-name">{tier.name}</span>
              {#if tier.isCurrent}
                <span class="current-badge">Current</span>
              {:else if tier.isUpgrade}
                <ArrowUpRight class="direction-icon upgrade" />
              {:else}
                <ArrowDownRight class="direction-icon downgrade" />
              {/if}
            </div>

            <div class="plan-option-price">
              <span class="price-amount">${tier.monthlyPrice}</span>
              <span class="price-period">/month</span>
            </div>

            <ul class="plan-option-features">
              {#each tier.features.slice(0, 3) as feature}
                <li>{feature}</li>
              {/each}
            </ul>

            {#if changingPlan && selectedPlan === tier.id}
              <Spinner size="sm" />
            {/if}
          </button>
        {/each}
      </div>
    </GlassCard>
  {/if}

  <!-- Data Export -->
  <GlassCard variant="default" class="mb-6">
    <h2>Your Data</h2>
    <p class="section-description">
      You own your content. Export your blog posts, pages, images, and account
      data at any time. We believe in data portability — you should never feel
      locked in.
    </p>

    <div class="export-options">
      <label class="export-option">
        <input
          type="radio"
          name="exportType"
          value="full"
          bind:group={exportType}
        />
        <div class="export-info">
          <span class="export-name">Full Export</span>
          <span class="export-desc">All posts, pages, images, and settings</span>
        </div>
      </label>

      <label class="export-option">
        <input
          type="radio"
          name="exportType"
          value="posts"
          bind:group={exportType}
        />
        <div class="export-info">
          <span class="export-name">Posts Only</span>
          <span class="export-desc">All blog posts in Markdown format</span>
        </div>
      </label>

      <label class="export-option">
        <input
          type="radio"
          name="exportType"
          value="media"
          bind:group={exportType}
        />
        <div class="export-info">
          <span class="export-name">Media Only</span>
          <span class="export-desc">All uploaded images and files</span>
        </div>
      </label>
    </div>

    <Button
      variant="secondary"
      onclick={handleExportData}
      disabled={exportingData}
    >
      {#if exportingData}
        <Spinner size="sm" />
      {:else}
        <Download class="btn-icon" />
      {/if}
      Export Data
    </Button>
  </GlassCard>

  <!-- Danger Zone -->
  <GlassCard variant="accent" class="danger-zone">
    <h2>Danger Zone</h2>
    <p class="section-description">
      Need to delete your account? Contact us at
      <a href="mailto:autumnbrown23@pm.me">autumnbrown23@pm.me</a>.
      We'll help you export your data first and process the deletion within 30 days.
    </p>

    <p class="refund-info">
      <strong>Refund Policy:</strong> Full refund within 14 days of signup.
      After 14 days, pro-rated refund for unused time in your current billing period.
    </p>
  </GlassCard>
</div>

<style>
  .account-page {
    max-width: 800px;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0 0 0.25rem 0;
    font-size: 2rem;
    color: var(--color-text);
  }

  .subtitle {
    margin: 0;
    color: var(--color-text-muted);
  }

  :global(.account-page .glass-card) {
    padding: 1.5rem;
  }

  :global(.account-page h2) {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
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

  .status-badge.trialing {
    background: #dbeafe;
    color: #1e40af;
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

  :global(.dark) .status-badge.trialing {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
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

  /* Usage Grid */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .usage-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--grove-overlay-5);
    border-radius: var(--border-radius-standard);
  }

  :global(.usage-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .usage-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .usage-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .usage-value {
    font-weight: 600;
    color: var(--color-text);
  }

  .usage-bar {
    height: 4px;
    background: var(--grove-overlay-15);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  .usage-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .usage-fill.warning {
    background: #ea580c;
  }

  /* Payment */
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
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .no-payment p {
    margin: 0;
  }

  .payment-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-subtle);
  }

  /* Plan Grid */
  .plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .plan-option {
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s, background-color 0.2s;
  }

  .plan-option:hover:not(.current):not(.disabled) {
    border-color: var(--color-primary);
    background: var(--grove-overlay-5);
  }

  .plan-option.current {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.08);
    cursor: default;
  }

  .plan-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .plan-option-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .plan-option-name {
    font-weight: 600;
    color: var(--color-text);
  }

  .current-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 9999px;
  }

  :global(.direction-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  :global(.direction-icon.upgrade) {
    color: #16a34a;
  }

  :global(.direction-icon.downgrade) {
    color: #ea580c;
  }

  .plan-option-price {
    margin-bottom: 0.75rem;
  }

  .price-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .price-period {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .plan-option-features {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .plan-option-features li {
    padding: 0.125rem 0;
  }

  /* Export Options */
  .export-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .export-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .export-option:hover {
    border-color: var(--color-primary);
  }

  .export-option:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }

  .export-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
  }

  .export-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .export-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .export-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  /* Danger Zone */
  .danger-zone {
    border-color: rgba(239, 68, 68, 0.3) !important;
    background: rgba(239, 68, 68, 0.05) !important;
  }

  :global(.dark) .danger-zone {
    background: rgba(239, 68, 68, 0.1) !important;
  }

  .danger-zone h2 {
    color: #dc2626;
  }

  .danger-zone a {
    color: var(--color-primary);
  }

  .refund-info {
    margin: 1rem 0 0 0;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius-small);
    font-size: 0.9rem;
  }

  .muted {
    color: var(--color-text-muted);
  }

  /* Button icons */
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

    .payment-info {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
