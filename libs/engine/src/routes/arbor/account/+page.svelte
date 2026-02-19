<script lang="ts">
  import { GlassCard, GlassConfirmDialog } from "$lib/ui";
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils";
  import { invalidateAll } from "$app/navigation";
  import { CONTACT } from "$lib/config/contact";

  // Import extracted components
  import SubscriptionCard from "./SubscriptionCard.svelte";
  import UsageStatsCard from "./UsageStatsCard.svelte";
  import PaymentMethodCard from "./PaymentMethodCard.svelte";
  import PasskeyCard from "./PasskeyCard.svelte";
  import ChangePlanCard from "./ChangePlanCard.svelte";
  import DataExportCard from "./DataExportCard.svelte";
  import FeaturesCard from "./FeaturesCard.svelte";

  // Import UpgradesGraft components for garden status
  import { GardenStatus } from '$lib/grafts/upgrades';
  import type { FlourishState } from '$lib/grafts/upgrades';

  // Import types and utils
  import { sanitizeErrorMessage } from "./utils";
  import { checkPasskeySupport } from "./passkey-utils";
  import type { TierKey } from '$lib/config/tiers';

  let { data } = $props();

  // Action states
  let cancellingSubscription = $state(false);
  let resumingSubscription = $state(false);
  let changingPlan = $state(false);
  let selectedPlan = $state("");

  // Dialog states
  let showCancelDialog = $state(false);
  let showChangePlanDialog = $state(false);
  let pendingPlanChange = $state<{ plan: string; tierInfo: { name: string; isUpgrade: boolean } | null }>({ plan: "", tierInfo: null });

  // Passkey states
  let supportsPasskeys = $state(false);
  let deletingPasskeyId = $state<string | null>(null);

  // Check passkey support on mount
  $effect(() => {
    checkPasskeySupport().then((supported) => {
      supportsPasskeys = supported;
    });
  });

  // Derive flourish state from billing status
  function getFlourishState(): FlourishState {
    if (!data.billing) return 'active';
    const status = data.billing.status;

    if (status === 'past_due') return 'past_due';
    if (data.billing.cancelAtPeriodEnd) return 'resting';
    if (status === 'canceled' || status === 'unpaid') return 'pruned';
    return 'active';
  }

  let flourishState = $derived<FlourishState>(getFlourishState());

  // Get current period end as timestamp for GardenStatus
  function getPeriodEnd(): number | null {
    if (!data.billing?.currentPeriodEnd) return null;
    return new Date(data.billing.currentPeriodEnd).getTime() / 1000;
  }

  let currentPeriodEnd = $derived(getPeriodEnd());

  // Handle nurture - open plan selection for upgrades
  function handleNurture(): void {
    // Scroll to change plan section
    const changePlanSection = document.getElementById('change-plan-section');
    changePlanSection?.scrollIntoView({ behavior: 'smooth' });
  }

  // Handle tend - open billing portal
  async function handleTend(): Promise<void> {
    try {
      const response = await api.post('/api/grafts/upgrades/tend', {});
      if (response.shedUrl) {
        window.location.href = response.shedUrl;
      } else {
        toast.error('Unable to open billing portal');
      }
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, 'Failed to open billing portal'));
    }
  }

  
  // Cancel subscription - show dialog
  function handleCancelClick(): void {
    showCancelDialog = true;
  }

  // Cancel subscription - confirmed
  async function handleCancelConfirm(): Promise<void> {
    cancellingSubscription = true;
    try {
      await api.patch("/api/billing", {
        action: "cancel",
        cancelImmediately: false,
      });
      toast.success("Subscription cancelled. Access continues until period end.");
      try {
        await invalidateAll();
      } catch (e) {
        console.error("Failed to refresh data:", e);
        toast.warning("Page data may be stale. Please refresh if needed.");
      }
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to cancel subscription"));
    } finally {
      cancellingSubscription = false;
    }
  }

  // Resume cancelled subscription
  async function handleResume(): Promise<void> {
    resumingSubscription = true;
    try {
      await api.patch("/api/billing", {
        action: "resume",
      });
      toast.success("Subscription resumed!");
      try {
        await invalidateAll();
      } catch (e) {
        console.error("Failed to refresh data:", e);
        toast.warning("Page data may be stale. Please refresh if needed.");
      }
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to resume subscription"));
    } finally {
      resumingSubscription = false;
    }
  }

  // Change plan - show dialog
  function handleChangePlan(newPlan: string): void {
    if (newPlan === data.currentPlan) return;

    const tierInfo = data.availableTiers.find((t) => t.id === newPlan);
    pendingPlanChange = { plan: newPlan, tierInfo: tierInfo ?? null };
    showChangePlanDialog = true;
  }

  // Change plan - confirmed
  async function handleChangePlanConfirm(): Promise<void> {
    const { plan: newPlan, tierInfo } = pendingPlanChange;
    if (!newPlan) return;

    changingPlan = true;
    selectedPlan = newPlan;
    try {
      await api.patch("/api/billing", {
        action: "change_plan",
        plan: newPlan,
      });
      toast.success(`Plan changed to ${tierInfo?.name}!`);
      try {
        await invalidateAll();
      } catch (e) {
        console.error("Failed to refresh data:", e);
        toast.warning("Page data may be stale. Please refresh if needed.");
      }
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to change plan"));
    } finally {
      changingPlan = false;
      selectedPlan = "";
    }
  }

  // Register a new passkey — redirects to login hub (single WebAuthn origin)
  function handleRegisterPasskey(): void {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://login.grove.place/passkey?redirect=${returnUrl}`;
  }

  // Delete a passkey
  async function handleDeletePasskey(id: string): Promise<void> {
    deletingPasskeyId = id;
    try {
      await api.delete(`/api/passkey/${id}`);
      toast.success("Passkey removed");
      await invalidateAll();
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to remove passkey"));
    } finally {
      deletingPasskeyId = null;
    }
  }
</script>

<div class="account-page">
  <header class="page-header">
    <h1>Account & Subscription</h1>
    <p class="subtitle">Manage your subscription, billing, and data</p>
  </header>

  <!-- Garden Status Overview -->
  <GardenStatus
    currentStage={data.currentPlan as TierKey}
    {flourishState}
    currentPeriodEnd={currentPeriodEnd}
    pruningScheduled={data.billing?.cancelAtPeriodEnd ?? false}
    paymentBrand={data.billing?.paymentMethod?.brand ?? ''}
    paymentLast4={data.billing?.paymentMethod?.last4 ?? ''}
    showDetails={true}
    onTend={handleTend}
    onNurture={handleNurture}
    class="mb-6"
  />

  <!-- Current Plan Overview -->
  <SubscriptionCard
    billing={data.billing}
    billingError={data.billingError}
    tierConfig={data.tierConfig}
    {cancellingSubscription}
    {resumingSubscription}
    onCancel={handleCancelClick}
    onResume={handleResume}
  />

  <!-- Usage Stats -->
  <UsageStatsCard usage={data.usage} usageError={data.usageError} />

  <!-- Features Overview -->
  <FeaturesCard curiosCount={data.curiosCount} />

  <!-- Payment Method -->
  <PaymentMethodCard billing={data.billing} />

  <!-- Passkeys (deferred data - streams in after initial render) -->
  {#await data.passkeyData}
    <PasskeyCard
      passkeys={[]}
      passkeyError={false}
      {supportsPasskeys}
      deletingId={null}
      onRegister={handleRegisterPasskey}
      onDelete={handleDeletePasskey}
      loading={true}
    />
  {:then passkeyResult}
    <PasskeyCard
      passkeys={passkeyResult.passkeys}
      passkeyError={passkeyResult.error}
      {supportsPasskeys}
      deletingId={deletingPasskeyId}
      onRegister={handleRegisterPasskey}
      onDelete={handleDeletePasskey}
    />
  {:catch}
    <PasskeyCard
      passkeys={[]}
      passkeyError={true}
      {supportsPasskeys}
      deletingId={null}
      onRegister={handleRegisterPasskey}
      onDelete={handleDeletePasskey}
    />
  {/await}

  <!-- Change Plan -->
  <div id="change-plan-section">
    <ChangePlanCard
      availableTiers={data.availableTiers}
      {changingPlan}
      {selectedPlan}
      hasSubscription={data.billing?.hasSubscription ?? false}
      onChangePlan={handleChangePlan}
    />
  </div>

  <!-- Data Export -->
  <DataExportCard
    exportCounts={data.exportCounts}
  />

  <!-- Danger Zone -->
  <GlassCard variant="accent" class="danger-zone">
    <h2>Danger Zone</h2>
    <p class="section-description">
      Need to delete your account? Contact us at
      <a href="mailto:{CONTACT.supportEmail}">{CONTACT.supportEmailDisplay}</a>.
      We'll help you export your data first and process the deletion within 30 days.
    </p>

    <p class="refund-info">
      <strong>Refund Policy:</strong> Full refund within 14 days of signup.
      After 14 days, pro-rated refund for unused time in your current billing period.
    </p>
  </GlassCard>
</div>

<!-- Cancel Subscription Dialog -->
<GlassConfirmDialog
  bind:open={showCancelDialog}
  title="Cancel Subscription"
  message="Your subscription will remain active until the end of your current billing period. You can resume at any time before then."
  confirmLabel="Cancel Subscription"
  variant="danger"
  loading={cancellingSubscription}
  onconfirm={handleCancelConfirm}
/>

<!-- Change Plan Dialog -->
<GlassConfirmDialog
  bind:open={showChangePlanDialog}
  title={pendingPlanChange.tierInfo?.isUpgrade ? "Upgrade Plan" : "Downgrade Plan"}
  message={pendingPlanChange.tierInfo?.isUpgrade
    ? `Are you sure you want to upgrade to ${pendingPlanChange.tierInfo?.name}? You will be charged the pro-rated difference immediately.`
    : `Are you sure you want to downgrade to ${pendingPlanChange.tierInfo?.name}? You will receive a pro-rated credit for your remaining time.`}
  confirmLabel={pendingPlanChange.tierInfo?.isUpgrade ? "Upgrade" : "Downgrade"}
  variant={pendingPlanChange.tierInfo?.isUpgrade ? "default" : "warning"}
  loading={changingPlan}
  onconfirm={handleChangePlanConfirm}
/>

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

  /* Danger Zone - uses :global() because class is passed to child component */
  :global(.danger-zone) {
    border-color: rgba(239, 68, 68, 0.3) !important;
    background: rgba(239, 68, 68, 0.05) !important;
  }

  :global(.dark .danger-zone) {
    background: rgba(239, 68, 68, 0.1) !important;
  }

  :global(.danger-zone h2) {
    color: #dc2626;
  }

  :global(.danger-zone a) {
    color: var(--color-primary);
  }

  .refund-info {
    margin: 1rem 0 0 0;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius-small);
    font-size: 0.9rem;
  }
</style>
