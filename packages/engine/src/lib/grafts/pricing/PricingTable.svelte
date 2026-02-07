<script lang="ts" module>
	/**
	 * Module-level constants for PricingTable
	 * Defined outside component scope for better performance
	 */
	import {
		Sprout,
		TreeDeciduous,
		Trees,
		Crown,
		User,
		Check,
		PenLine,
		FileText,
		HardDrive,
		Palette,
		Amphora,
		Flower2,
		MessageCircle,
		SearchCode,
		Mail,
		Clock,
		LifeBuoy,
		CalendarDays,
	} from "lucide-svelte";
	import type { TierIcon } from "../../config/tiers.js";

	// Icon components for tier headers - defined at module level for performance
	const TIER_ICON_MAP: Record<TierIcon, typeof Sprout> = {
		user: User,
		sprout: Sprout,
		"tree-deciduous": TreeDeciduous,
		trees: Trees,
		crown: Crown,
	} as const;
</script>

<script lang="ts">
	/**
	 * PricingTable
	 *
	 * Full comparison table showing all tiers side-by-side.
	 * Glassmorphism styled with Grove aesthetics.
	 */

	import type { PricingTableProps, PricingTier } from "./types.js";
	import { groveModeStore } from "../../ui/stores/grove-mode.svelte";

	let {
		tiers,
		billingPeriod,
		onCheckout,
		class: className = "",
	}: PricingTableProps = $props();

	// Row definitions for the comparison table
	type RowType =
		| "feature"
		| "limit"
		| "price"
		| "custom"
		| "support"
		| "bestfor";

	interface TableRow {
		type: RowType;
		label: string;
		standardLabel?: string;
		icon: typeof PenLine;
		getValue: (tier: PricingTier) => string | boolean;
	}

	const tableRows: TableRow[] = [
		{
			type: "feature",
			label: "Blog",
			icon: PenLine,
			getValue: (tier) => tier.features.blog,
		},
		{
			type: "limit",
			label: "Blog Posts",
			icon: FileText,
			getValue: (tier) => tier.limits.posts,
		},
		{
			type: "limit",
			label: "Storage",
			icon: HardDrive,
			getValue: (tier) => tier.limits.storage,
		},
		{
			type: "limit",
			label: "Themes",
			icon: Palette,
			getValue: (tier) => tier.limits.themes,
		},
		{
			type: "limit",
			label: "Curios",
			standardLabel: "Custom Pages",
			icon: Amphora,
			getValue: (tier) => tier.limits.navPages,
		},
		{
			type: "feature",
			label: "Meadow",
			standardLabel: "Community Feed",
			icon: Flower2,
			getValue: (tier) => tier.features.meadow,
		},
		{
			type: "limit",
			label: "Public Comments",
			icon: MessageCircle,
			getValue: (tier) => tier.limits.commentsPerWeek,
		},
		{
			type: "custom",
			label: "Custom Domain",
			icon: SearchCode,
			getValue: (tier) => {
				if (!tier.features.customDomain) return "—";
				if (tier.features.byod) return "BYOD";
				return true;
			},
		},
		{
			type: "custom",
			label: "@grove.place Email",
			icon: Mail,
			getValue: (tier) => {
				if (tier.features.fullEmail) return "Full";
				if (tier.features.emailForwarding) return "Forward";
				return "—";
			},
		},
		{
			type: "feature",
			label: "Centennial",
			standardLabel: "100-Year Preservation",
			icon: Clock,
			getValue: (tier) => tier.features.centennial,
		},
		{
			type: "support",
			label: "Support",
			icon: LifeBuoy,
			getValue: (tier) => tier.supportLevel,
		},
		{
			type: "bestfor",
			label: "Best for",
			icon: User,
			getValue: (tier) => tier.bestFor,
		},
	];

	// Resolve row label based on Grove Mode
	function rowLabel(row: TableRow): string {
		if (groveModeStore.current) return row.label;
		return row.standardLabel || row.label;
	}

	// Helper to render cell value
	function renderValue(
		value: string | boolean,
		row: TableRow,
	): { type: "check" | "dash" | "text"; text?: string } {
		if (typeof value === "boolean") {
			return value ? { type: "check" } : { type: "dash" };
		}
		if (value === "—" || value === "0" || value === "") {
			return { type: "dash" };
		}
		return { type: "text", text: value };
	}
</script>

<div
	class="overflow-x-auto bg-white/80 dark:bg-grove-950/25 backdrop-blur-md rounded-xl p-4 border border-white/40 dark:border-grove-800/25 shadow-sm {className}"
>
	<table class="w-full text-left border-collapse" aria-label="Pricing tier comparison">
		<thead>
			<tr class="border-b-2 border-default">
				<!-- Empty header cell for row labels -->
				<th scope="col" class="py-4 px-3 font-serif text-foreground">
					<span class="sr-only">Feature</span>
				</th>

				<!-- Tier header cells -->
				{#each tiers as tier}
					{@const IconComponent = TIER_ICON_MAP[tier.icon]}
					<th scope="col" aria-label="{tier.name} tier" class="py-4 px-3 text-center min-w-[120px]">
						{#if tier.monthlyPrice > 0}
							<div
								class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-grove-100/50 dark:bg-grove-900/30 mb-2"
							>
								<IconComponent
									class="w-5 h-5 text-grove-600 dark:text-grove-400"
								/>
							</div>
						{/if}
						<div class="font-serif text-foreground">{groveModeStore.current ? tier.name : (tier.standardName || tier.name)}</div>
						<div class="text-2xl font-sans font-bold text-accent-muted">
							{tier.monthlyPrice === 0 ? "$0" : `$${tier.monthlyPrice}`}
							{#if tier.monthlyPrice > 0}
								<span class="text-sm font-normal text-foreground-faint"
									>/mo</span
								>
							{/if}
						</div>
						{#if tier.status === "coming_soon"}
							<span
								class="text-xs text-foreground-faint italic">Coming Soon</span
							>
						{:else if tier.status === "future"}
							<span class="text-xs text-foreground-faint italic">Future</span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="text-sm font-sans">
			{#each tableRows as row, rowIndex}
				{@const Icon = row.icon}
				<tr
					class="border-b border-subtle {rowIndex % 2 === 1 ? 'bg-surface' : ''}"
				>
					<!-- Row label -->
					<th scope="row" class="py-3 px-3 text-foreground-muted font-normal text-left">
						<span class="inline-flex items-center gap-2">
							<Icon class="w-4 h-4 text-accent-subtle flex-shrink-0" aria-hidden="true" />
							{rowLabel(row)}
						</span>
					</th>

					<!-- Tier values -->
					{#each tiers as tier}
						{@const value = row.getValue(tier)}
						{@const rendered = renderValue(value, row)}
						<td
							class="py-3 px-3 text-center {rendered.type === 'dash'
								? 'text-foreground-faint'
								: row.type === 'bestfor'
									? 'text-foreground-subtle italic'
									: 'text-foreground'}"
						>
							{#if rendered.type === "check"}
								<Check class="w-5 h-5 mx-auto text-accent-muted" aria-hidden="true" />
								<span class="sr-only">Included</span>
							{:else if rendered.type === "dash"}
								<span aria-label="Not included">—</span>
							{:else}
								{rendered.text}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}

			<!-- Yearly price row -->
			<tr>
				<th scope="row" class="py-4 px-3 text-foreground-muted font-normal text-left">
					<span class="inline-flex items-center gap-2">
						<CalendarDays class="w-4 h-4 text-accent-subtle flex-shrink-0" aria-hidden="true" />
						Yearly
					</span>
				</th>
				{#each tiers as tier}
					<td class="py-4 px-3 text-center">
						{#if tier.monthlyPrice === 0}
							<span class="text-foreground-faint">—</span>
						{:else}
							<span class="font-medium text-accent-muted"
								>${Math.round(tier.annualPrice)}</span
							>
						{/if}
					</td>
				{/each}
			</tr>
		</tbody>
	</table>
</div>

<p class="text-center text-sm text-foreground-faint font-sans mt-4">
	Yearly plans save 15% — pay for 10 months, get 12.
</p>
