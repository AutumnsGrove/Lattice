<script lang="ts">
	import {
		Check,
		Clock,
		Lock,
		ArrowRight,
		ArrowLeft,
		Loader2,
		Sprout,
	} from "@autumnsgrove/lattice/ui/icons";
	import { GlassCard, GroveTerm } from "@autumnsgrove/lattice/ui";
	import { groveModeStore } from "@autumnsgrove/lattice/ui/stores";

	// Use graft config for tier data and toggle component
	import {
		PricingToggle,
		type PricingTier,
		type BillingPeriod,
		DEFAULT_ANNUAL_SAVINGS,
		billingPeriodToDbFormat,
		getMonthlyEquivalentPrice,
		getYearlySavingsAmount,
	} from "@autumnsgrove/lattice/grafts/pricing";
	import type { TierStatus, TierKey } from "@autumnsgrove/lattice/config";

	// UpgradesGraft components for plan selection
	import { GrowthCard } from "@autumnsgrove/lattice/grafts/upgrades";

	// Shared icon mapping
	import { tierIcons } from "$lib/ui/tier-icons";

	// JSON form submission (grove-router POST proxy fix)
	import { submitFormAndGo } from "$lib/submit-form";

	// Type-safe props
	import type { PageData } from "./$types";
	let { data }: { data: PageData } = $props();

	// Plans from server (transformed via graft config)
	// svelte-ignore state_referenced_locally
	const plans: PricingTier[] = data.tiers;

	// ============================================================================
	// STATE
	// ============================================================================

	let billingPeriod = $state<BillingPeriod>("monthly");
	// Auto-select first available paid tier (skip wanderer so users see it as an explicit choice)
	let selectedPlan = $state<string | null>(
		plans.find((p: PricingTier) => p.status === "available" && p.key !== "wanderer")?.key ?? null,
	);

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	// Map billing period to database format (annual → yearly)
	let billingCycleForDb = $derived(billingPeriodToDbFormat(billingPeriod));

	// Check if the selected plan is wanderer
	let isWandererPlan = $derived(selectedPlan === "wanderer");

	// Submit plan selection via JSON API
	async function selectPlanForOnboarding(stage: TierKey) {
		if (isSubmitting) return;
		isSubmitting = true;
		submitError = null;

		// Wanderer plan skips checkout — goes directly to success
		const redirect = stage === "wanderer" ? "/success" : "/checkout";

		const error = await submitFormAndGo("/api/select-plan", {
			plan: stage,
			billingCycle: stage === "wanderer" ? "monthly" : billingCycleForDb,
		});

		if (error) {
			submitError = error;
			isSubmitting = false;
		}
		// On success, the page will navigate via submitFormAndGo
	}

	// ============================================================================
	// STATUS COLOR HELPERS
	// ============================================================================

	/** Color schemes for each tier status */
	const statusColors: Record<
		TierStatus,
		{
			text: string;
			bg: string;
			check: string;
			overlay: string;
		}
	> = {
		available: {
			text: "text-success",
			bg: "bg-success-bg/60 dark:bg-success-bg/40",
			check: "text-success",
			overlay: "",
		},
		coming_soon: {
			text: "text-warning",
			bg: "bg-warning-bg/60 dark:bg-warning-bg/30",
			check: "text-warning",
			overlay: "bg-warning/10 dark:bg-warning/5",
		},
		future: {
			text: "text-foreground-subtle",
			bg: "bg-surface-subtle/60 dark:bg-surface-subtle/40",
			check: "text-foreground-subtle",
			overlay: "bg-foreground-subtle/10 dark:bg-foreground-subtle/10",
		},
		deprecated: {
			text: "text-error",
			bg: "bg-error-bg/60 dark:bg-error-bg/40",
			check: "text-error",
			overlay: "bg-error/10 dark:bg-error/10",
		},
	};

	function getStatusColor(status: TierStatus, shade: keyof (typeof statusColors)["available"]) {
		return statusColors[status][shade];
	}

	// ============================================================================
	// SELECTION HELPERS
	// ============================================================================

	function canSelect(tier: PricingTier): boolean {
		return tier.status === "available";
	}

	function handleSelectPlan(tier: PricingTier): void {
		if (canSelect(tier)) {
			selectedPlan = tier.key;
		}
	}

	// Get icon name for GrowthCard
	function getIconName(iconKey: string): string {
		const iconMap: Record<string, string> = {
			user: "sprout",
			footprints: "footprints",
			sprout: "sprout",
			"tree-deciduous": "tree-deciduous",
			trees: "trees",
			crown: "crown",
		};
		return iconMap[iconKey] || "sprout";
	}
</script>

<div class="animate-fade-in space-y-8">
	<!-- Back navigation -->
	<div class="flex items-center gap-2">
		<a
			href="/profile"
			class="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to profile
		</a>
	</div>

	<!-- Header -->
	<header class="text-center space-y-3">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground">Choose how you'd like to grow</h1>
		<p class="text-foreground-muted max-w-md mx-auto">
			Start writing for free, or pick a plan that grows with you.
		</p>
	</header>

	<!-- Billing toggle (using shared graft component) -->
	<div class="flex justify-center">
		<PricingToggle
			{billingPeriod}
			savingsPercent={DEFAULT_ANNUAL_SAVINGS}
			onPeriodChange={(period) => (billingPeriod = period)}
		/>
	</div>

	<!-- Plans grid - using GrowthCard components -->
	<div class="space-y-4" role="radiogroup" aria-label="Select a plan">
		{#each plans as tier (tier.key)}
			{@const isAvailable = tier.status === "available"}
			{@const isComingSoon = tier.status === "coming_soon"}
			{@const isFuture = tier.status === "future"}
			{@const isSelected = selectedPlan === tier.key}
			{@const displayName = groveModeStore.current ? tier.name : tier.standardName || tier.name}
			{@const displayFeatures = groveModeStore.current
				? tier.featureStrings
				: tier.standardFeatureStrings || tier.featureStrings}
			{@const monthlyPrice = getMonthlyEquivalentPrice(tier, billingPeriod)}
			{@const yearlyPrice =
				billingPeriod === "annual" ? getMonthlyEquivalentPrice(tier, "annual") : 0}
			{@const savings = billingPeriod === "annual" ? getYearlySavingsAmount(tier) : 0}

			<div class="relative">
				<!-- Status badge positioned above card for unavailable tiers -->
				{#if isComingSoon}
					<div class="absolute -top-3 left-6 z-20" aria-hidden="true">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-warning text-white shadow-lg shadow-warning/25"
						>
							<Clock class="w-3 h-3" />
							Coming Soon
						</span>
					</div>
				{:else if isFuture}
					<div class="absolute -top-3 left-6 z-20" aria-hidden="true">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-foreground-subtle dark:bg-foreground-subtle text-white shadow-lg"
						>
							<Lock class="w-3 h-3" />
							Future
						</span>
					</div>
				{/if}

				<!-- GrowthCard for plan selection -->
				<GrowthCard
					stage={tier.key as TierKey}
					{displayName}
					tagline={tier.tagline}
					icon={getIconName(tier.icon)}
					isCurrent={false}
					isNext={isSelected}
					available={isAvailable}
					monthlyPrice={tier.key === "wanderer" ? 0 : Number(monthlyPrice)}
					annualPrice={tier.key === "wanderer" ? 0 : Number(yearlyPrice)}
					features={displayFeatures}
					variant={isSelected ? "primary" : "secondary"}
					onCultivate={() => handleSelectPlan(tier)}
				/>
			</div>
		{/each}
	</div>

	<!-- Fine print -->
	<div class="text-center py-2 space-y-1">
		<p class="text-xs text-foreground-subtle">
			Every plan includes Home, Blog, and About pages. Higher plans add more custom navigation
			pages.
		</p>
	</div>

	<!-- Selection status and continue -->
	<div class="space-y-4">
		{#if submitError}
			<div
				class="p-3 rounded-lg bg-error-bg/80 dark:bg-error-bg/30 border border-error dark:border-error text-error dark:text-error text-sm"
			>
				{submitError}
			</div>
		{/if}

		{#if selectedPlan}
			{@const selectedTier = plans.find((p) => p.key === selectedPlan)}
			{@const selectedSavings =
				billingPeriod === "annual" && selectedTier?.key !== "wanderer" && selectedTier
					? getYearlySavingsAmount(selectedTier)
					: 0}
			<div
				class="p-4 rounded-lg bg-surface-subtle/50 dark:bg-surface-subtle/30 border border-border dark:border-border"
			>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-foreground-muted">
							Selected: <span class="font-medium text-foreground"
								>{groveModeStore.current
									? selectedTier?.name
									: selectedTier?.standardName || selectedTier?.name}</span
							>
						</p>
						{#if billingPeriod === "annual" && selectedTier?.key !== "wanderer"}
							<p class="text-xs text-accent mt-0.5">
								Save ${selectedSavings}/year with annual billing
							</p>
						{/if}
					</div>
					{#if isSubmitting}
						<Loader2 class="w-5 h-5 animate-spin text-foreground-muted" />
					{:else}
						<Check class="w-5 h-5 text-success" />
					{/if}
				</div>
			</div>
		{/if}

		<button
			type="button"
			onclick={() => selectedPlan && selectPlanForOnboarding(selectedPlan as TierKey)}
			disabled={!selectedPlan || isSubmitting}
			class="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isSubmitting}
				<Loader2 class="w-5 h-5 animate-spin" />
				Processing...
			{:else if selectedPlan}
				{@const selectedTier = plans.find((p) => p.key === selectedPlan)}
				{#if selectedTier?.key === "wanderer"}
					Start writing for free
				{:else}
					Continue with {groveModeStore.current
						? selectedTier?.name
						: selectedTier?.standardName || selectedTier?.name}
				{/if}
			{:else}
				Select a plan to continue
			{/if}
		</button>
		{#if selectedPlan === "wanderer"}
			<p class="text-xs text-foreground-subtle text-center">
				No credit card required. Upgrade anytime.
			</p>
		{:else}
			<p class="text-xs text-foreground-subtle text-center">
				Full refund within 14 days. Cancel anytime.
			</p>
		{/if}
	</div>

	<!-- Full comparison link -->
	<div class="text-center pb-4">
		<a
			href="https://grove.place/pricing"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
		>
			View full plan comparison
			<span class="sr-only">(opens in new tab)</span>
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	</div>
</div>
