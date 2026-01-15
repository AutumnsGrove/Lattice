<script lang="ts">
  import { GlassCard } from "$lib/ui";
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils";
  import { invalidateAll, beforeNavigate } from "$app/navigation";

  // Import extracted components
  import SubscriptionCard from "./SubscriptionCard.svelte";
  import UsageStatsCard from "./UsageStatsCard.svelte";
  import PaymentMethodCard from "./PaymentMethodCard.svelte";
  import ChangePlanCard from "./ChangePlanCard.svelte";
  import DataExportCard from "./DataExportCard.svelte";

  // Import types and utils
  import type { ExportType } from "./types";
  import { sanitizeErrorMessage } from "./utils";

  let { data } = $props();

  // Action states
  let cancellingSubscription = $state(false);
  let resumingSubscription = $state(false);
  let changingPlan = $state(false);
  let selectedPlan = $state("");
  let openingPortal = $state(false);
  let exportingData = $state(false);
  let exportType = $state<ExportType>("full");

  // Reset portal state if user navigates back to this page
  beforeNavigate(() => {
    openingPortal = false;
  });

  // Cancel subscription
  async function handleCancel(): Promise<void> {
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

  // Change plan
  async function handleChangePlan(newPlan: string): Promise<void> {
    if (newPlan === data.currentPlan) return;

    const tierInfo = data.availableTiers.find((t) => t.id === newPlan);
    const action = tierInfo?.isUpgrade ? "upgrade" : "downgrade";

    if (
      !confirm(
        `Are you sure you want to ${action} to ${tierInfo?.name}?\n\n` +
          (tierInfo?.isUpgrade
            ? "You will be charged the pro-rated difference immediately."
            : "You will receive a pro-rated credit for your remaining time.")
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

  // Open billing portal for payment method updates
  async function handleOpenBillingPortal(): Promise<void> {
    openingPortal = true;
    try {
      const returnUrl = window.location.href;
      const response = await api.put("/api/billing", { returnUrl });
      if (response?.portalUrl) {
        window.location.href = response.portalUrl;
      } else {
        toast.error("Could not open billing portal");
        openingPortal = false;
      }
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to open billing portal"));
      openingPortal = false;
    }
  }

  // Export data
  async function handleExportData(): Promise<void> {
    exportingData = true;
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: exportType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(errorData?.message || `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const filename =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `grove-export-${exportType}-${new Date().toISOString().split("T")[0]}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data export downloaded successfully.");
    } catch (error) {
      toast.error(sanitizeErrorMessage(error, "Failed to export data"));
    } finally {
      exportingData = false;
    }
  }

  function handleExportTypeChange(type: ExportType): void {
    exportType = type;
  }
</script>

<div class="account-page">
  <header class="page-header">
    <h1>Account & Subscription</h1>
    <p class="subtitle">Manage your subscription, billing, and data</p>
  </header>

  <!-- Current Plan Overview -->
  <SubscriptionCard
    billing={data.billing}
    billingError={data.billingError}
    tierConfig={data.tierConfig}
    {cancellingSubscription}
    {resumingSubscription}
    onCancel={handleCancel}
    onResume={handleResume}
  />

  <!-- Usage Stats -->
  <UsageStatsCard usage={data.usage} usageError={data.usageError} />

  <!-- Payment Method -->
  <PaymentMethodCard
    billing={data.billing}
    {openingPortal}
    onOpenPortal={handleOpenBillingPortal}
  />

  <!-- Change Plan -->
  <ChangePlanCard
    availableTiers={data.availableTiers}
    {changingPlan}
    {selectedPlan}
    hasSubscription={data.billing?.hasSubscription ?? false}
    onChangePlan={handleChangePlan}
  />

  <!-- Data Export -->
  <DataExportCard
    {exportType}
    {exportingData}
    onExport={handleExportData}
    onExportTypeChange={handleExportTypeChange}
  />

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
</style>
