<script lang="ts">
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import { CONTACT } from "$lib/config/contact";
	import {
		buildPortalUrl,
		buildCancelUrl,
		buildResumeUrl,
		buildCheckoutUrl,
	} from "$lib/config/billing";
	import { page } from "$app/stores";

	// Import extracted components
	import SubscriptionCard from "./SubscriptionCard.svelte";
	import UsageStatsCard from "./UsageStatsCard.svelte";
	import PaymentMethodCard from "./PaymentMethodCard.svelte";
	import ChangePlanCard from "./ChangePlanCard.svelte";
	import DataExportCard from "./DataExportCard.svelte";
	import FeaturesCard from "./FeaturesCard.svelte";

	// Import UpgradesGraft components for garden status
	import { GardenStatus } from "$lib/grafts/upgrades";
	import type { FlourishState } from "$lib/grafts/upgrades";

	// Import types and utils
	import { KeyRound } from "@lucide/svelte";
	import type { TierKey } from "$lib/config/tiers";

	let { data } = $props();

	// Action states (retained for spinner UX during redirect)
	let changingPlan = $state(false);
	let selectedPlan = $state("");

	// Current page URL for redirect-back after billing hub actions
	const currentUrl = $derived($page.url.href);

	// Derive flourish state from billing status
	function getFlourishState(): FlourishState {
		if (!data.billing) return "active";
		const status = data.billing.status;

		if (status === "past_due") return "past_due";
		if (data.billing.cancelAtPeriodEnd) return "resting";
		if (status === "canceled" || status === "unpaid") return "pruned";
		return "active";
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
		const changePlanSection = document.getElementById("change-plan-section");
		changePlanSection?.scrollIntoView({ behavior: "smooth" });
	}

	// Handle tend - redirect to BillingHub portal
	function handleTend(): void {
		window.location.href = buildPortalUrl(currentUrl);
	}

	// Cancel subscription - redirect to BillingHub cancel page (has its own confirmation)
	function handleCancelClick(): void {
		window.location.href = buildCancelUrl(currentUrl);
	}

	// Resume cancelled subscription - redirect to BillingHub resume page (has its own confirmation)
	function handleResume(): void {
		window.location.href = buildResumeUrl(currentUrl);
	}

	// Change plan - redirect to BillingHub checkout for the new tier
	function handleChangePlan(newPlan: string): void {
		if (newPlan === data.currentPlan) return;

		changingPlan = true;
		selectedPlan = newPlan;

		window.location.href = buildCheckoutUrl({
			tenantId: data.tenantId,
			tier: newPlan,
			billingCycle: "monthly",
			redirect: currentUrl,
		});
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
		{currentPeriodEnd}
		pruningScheduled={data.billing?.cancelAtPeriodEnd ?? false}
		paymentBrand={data.billing?.paymentMethod?.brand ?? ""}
		paymentLast4={data.billing?.paymentMethod?.last4 ?? ""}
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
		onCancel={handleCancelClick}
		onResume={handleResume}
	/>

	<!-- Usage Stats -->
	<UsageStatsCard usage={data.usage} usageError={data.usageError} />

	<!-- Features Overview -->
	<FeaturesCard curiosCount={data.curiosCount} />

	<!-- Payment Method -->
	<PaymentMethodCard billing={data.billing} isComped={data.isComped} />

	<!-- Passkeys — managed on login hub (single WebAuthn origin) -->
	<GlassCard variant="default" class="mb-6">
		<h2 style="display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem 0;">
			<KeyRound
				style="width: 1.25rem; height: 1.25rem; color: var(--color-primary);"
				aria-hidden="true"
			/>
			Passkeys
		</h2>
		<p style="margin: 0 0 1.5rem 0; color: var(--color-text-muted); font-size: 0.9rem;">
			Passkeys let you sign in securely using Face ID, Touch ID, or Windows Hello — no password
			needed. Manage your passkeys on the Grove login hub.
		</p>
		<a
			href="https://login.grove.place/passkey?redirect={encodeURIComponent(
				typeof window !== 'undefined' ? window.location.href : '',
			)}"
			class="passkey-manage-link"
		>
			Manage Passkeys →
		</a>
		<p
			style="margin: 1rem 0 0 0; padding-top: 1rem; border-top: 1px solid var(--color-border); font-size: 0.8rem; color: var(--color-text-subtle);"
		>
			Passkeys are more secure than passwords and protect against phishing attacks.
		</p>
	</GlassCard>

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
	<DataExportCard exportCounts={data.exportCounts} />

	<!-- Danger Zone -->
	<GlassCard variant="accent" class="danger-zone">
		<h2>Danger Zone</h2>
		<p class="section-description">
			Need to delete your account? Contact us at
			<a href="mailto:{CONTACT.supportEmail}">{CONTACT.supportEmailDisplay}</a>. We'll help you
			export your data first and process the deletion within 30 days.
		</p>

		<p class="refund-info">
			<strong>Refund Policy:</strong> Full refund within 14 days of signup. After 14 days, pro-rated refund
			for unused time in your current billing period.
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

	:global(.passkey-manage-link) {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border-radius: var(--border-radius-small);
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	:global(.passkey-manage-link:hover) {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}
</style>
