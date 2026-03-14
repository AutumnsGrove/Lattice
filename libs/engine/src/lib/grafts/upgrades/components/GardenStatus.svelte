<script lang="ts">
	/**
	 * GardenStatus
	 *
	 * Overview widget showing garden health and subscription status.
	 * Used in dashboard sidebars and account pages.
	 */

	import {
		Sprout,
		TreeDeciduous,
		Trees,
		Crown,
		Footprints,
		Calendar,
		CreditCard,
		Settings,
		AlertCircle,
		CheckCircle2,
		Clock,
		ArrowRight,
	} from "@lucide/svelte";
	import GroveTerm from "$lib/ui/components/ui/groveterm/GroveTerm.svelte";
	import type { GardenStatusProps } from "./types.js";
	import type { TierKey } from "$lib/config/tiers";
	import type { FlourishState } from "../types.js";

	let {
		currentStage = "wanderer",
		flourishState = "active" as FlourishState,
		currentPeriodEnd = null,
		pruningScheduled = false,
		paymentBrand = "",
		paymentLast4 = "",
		showDetails = true,
		onTend,
		onNurture,
		class: className = "",
	}: GardenStatusProps = $props();

	// Icon mapping — keyed by TierKey
	const iconComponents: Record<TierKey, typeof Sprout> = {
		wanderer: Footprints,
		seedling: Sprout,
		sapling: TreeDeciduous,
		oak: Trees,
		evergreen: Crown,
	};

	// Stage display names
	const stageNames: Record<TierKey, string> = {
		wanderer: "Wanderer",
		seedling: "Seedling",
		sapling: "Sapling",
		oak: "Oak",
		evergreen: "Evergreen",
	};

	// State icons
	const stateIcons: Record<FlourishState, typeof CheckCircle2> = {
		active: CheckCircle2,
		past_due: AlertCircle,
		resting: Clock,
		pruned: AlertCircle,
	};

	// State labels and colors
	const stateConfig: Record<FlourishState, { label: string; color: string; bg: string }> = {
		active: { label: "Active", color: "text-success", bg: "bg-success-bg" },
		past_due: { label: "Past Due", color: "text-error", bg: "bg-error-bg" },
		resting: {
			label: "Scheduled End",
			color: "text-warning",
			bg: "bg-warning-bg",
		},
		pruned: { label: "Ended", color: "text-foreground-muted", bg: "bg-muted" },
	};

	// Next stage for nurture CTA
	const nextStage: Record<TierKey, TierKey | null> = {
		wanderer: "seedling",
		seedling: "sapling",
		sapling: "oak",
		oak: "evergreen",
		evergreen: null,
	};

	let IconComponent = $derived(iconComponents[currentStage] || Sprout);
	let StateIcon = $derived(stateIcons[flourishState]);
	let stateInfo = $derived(stateConfig[flourishState]);
	let canNurture = $derived(nextStage[currentStage] !== null);

	// Format period end date
	let formattedPeriodEnd = $derived.by(() => {
		if (!currentPeriodEnd) return null;
		return new Date(currentPeriodEnd * 1000).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});
</script>

<div
	class="
    p-5 rounded-xl
    bg-white/60 dark:bg-cream-100/85 backdrop-blur-sm
    border border-white/40 dark:border-cream-300/40
    {className}
  "
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-4">
		<div class="flex items-center gap-3">
			<div
				class="w-12 h-12 rounded-full bg-grove-100/50 dark:bg-cream-300/30 flex items-center justify-center"
			>
				<IconComponent class="w-6 h-6 text-grove-600 dark:text-grove-300" />
			</div>
			<div>
				<h3 class="font-serif text-lg text-foreground">
					<GroveTerm term="garden-status" standard="Plan Status">Garden Status</GroveTerm>
				</h3>
				<p class="text-sm text-foreground-muted">{stageNames[currentStage]}</p>
			</div>
		</div>

		<button
			type="button"
			class="p-2 rounded-lg hover:bg-grove-100 dark:hover:bg-grove-800 transition-colors"
			onclick={() => onTend?.()}
			aria-label="Open garden shed"
		>
			<Settings class="w-4 h-4 text-foreground-muted" />
		</button>
	</div>

	<!-- Flourish state -->
	<div class="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 {stateInfo.bg}">
		<StateIcon class="w-4 h-4 {stateInfo.color}" />
		<span class="text-sm font-medium {stateInfo.color}">{stateInfo.label}</span>
		{#if pruningScheduled}
			<span class="text-xs text-foreground-muted">(ends {formattedPeriodEnd})</span>
		{/if}
	</div>

	<!-- Details -->
	{#if showDetails}
		<div class="space-y-3">
			<!-- Billing period -->
			{#if currentPeriodEnd && flourishState !== "pruned"}
				<div class="flex items-center gap-3 text-sm">
					<Calendar class="w-4 h-4 text-foreground-muted" />
					<span class="text-foreground-muted">Next billing period:</span>
					<span class="font-medium text-foreground">{formattedPeriodEnd}</span>
				</div>
			{/if}

			<!-- Payment method -->
			{#if paymentLast4 && flourishState !== "pruned"}
				<div class="flex items-center gap-3 text-sm">
					<CreditCard class="w-4 h-4 text-foreground-muted" />
					<span class="text-foreground-muted">Payment:</span>
					<span class="font-medium text-foreground">{paymentBrand} •••• {paymentLast4}</span>
				</div>
			{/if}

			<!-- Nurture CTA for users who can upgrade -->
			{#if canNurture && flourishState === "active"}
				<div class="mt-2 p-3 rounded-lg bg-grove-50 dark:bg-grove-900/30 text-sm">
					<p class="text-foreground-muted">
						{#if currentStage === "wanderer"}
							Free tier.
						{/if}
						<button
							type="button"
							class="inline-flex items-center gap-1 text-accent hover:underline"
							onclick={() => onNurture?.()}
						>
							<Sprout class="w-3.5 h-3.5" />
							{#if currentStage === "wanderer"}<GroveTerm term="cultivate" standard="Grow to Seedling"
									>Cultivate to Seedling</GroveTerm
								>{:else}<GroveTerm term="nurture" standard="Explore upgrades"
									>Nurture your garden</GroveTerm
								>{/if}
							<ArrowRight class="w-3 h-3" />
						</button>
						{#if currentStage === "wanderer"}
							to unlock more features.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
