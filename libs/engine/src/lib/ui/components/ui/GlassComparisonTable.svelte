<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	import { Check, X, Minus } from "lucide-svelte";

	/**
	 * GlassComparisonTable - A glassmorphism comparison table with mobile card layout
	 *
	 * Shows feature comparisons between platforms. On desktop, renders a proper
	 * semantic HTML table. On mobile, transforms into "You vs. Competitor" cards
	 * so users always see both values side by side.
	 *
	 * @example
	 * ```svelte
	 * <GlassComparisonTable
	 *   {columns}
	 *   {rows}
	 *   title="How Grove Compares"
	 *   highlightColumn="Grove"
	 * />
	 * ```
	 */

	interface ComparisonColumn {
		name: string;
		highlighted?: boolean;
		href?: string;
	}

	interface ComparisonRow {
		feature: string;
		description?: string;
		values: Record<string, string | boolean>;
	}

	interface Props {
		columns: ComparisonColumn[];
		rows: ComparisonRow[];
		title?: string;
		description?: string;
		highlightColumn?: string;
		class?: string;
	}

	let {
		columns,
		rows,
		title,
		description,
		highlightColumn,
		class: className,
	}: Props = $props();

	// Find the highlighted column (usually Grove)
	const highlightedCol = $derived(
		highlightColumn ?? columns.find((c) => c.highlighted)?.name
	);

	// Competitor columns (non-highlighted) for mobile cards
	const competitorColumns = $derived(
		columns.filter((c) => c.name !== highlightedCol)
	);

	/**
	 * Renders a cell value as accessible text for screen readers
	 */
	function getCellLabel(value: string | boolean | undefined): string {
		if (value === true) return "Yes";
		if (value === false) return "No";
		if (value === undefined) return "N/A";
		return value;
	}
</script>

{#if title || description}
	<div class="text-center mb-8">
		{#if title}
			<h2 class="text-lg font-serif text-foreground-muted">{title}</h2>
		{/if}
		{#if description}
			<p class="text-foreground-subtle text-sm font-sans mt-2 max-w-xl mx-auto">{description}</p>
		{/if}
	</div>
{/if}

<!-- Desktop: Full comparison table (hidden on mobile) -->
<div class={cn(
	"hidden md:block rounded-xl overflow-hidden",
	"bg-white/80 dark:bg-bark-800/50 backdrop-blur-md",
	"border border-white/40 dark:border-bark-700/40",
	"shadow-sm",
	className
)}>
	<div class="overflow-x-auto">
		<table class="w-full text-sm font-sans" aria-label={title ?? "Platform comparison"}>
			<thead>
				<tr class="border-b border-white/30 dark:border-bark-700/30">
					<!-- Feature column header -->
					<th scope="col" class="text-left px-5 py-4 text-foreground-muted font-medium w-[200px]">
						Feature
					</th>
					<!-- Platform column headers -->
					{#each columns as col}
						{@const isHighlighted = col.name === highlightedCol}
						<th
							scope="col"
							class={cn(
								"px-4 py-4 text-center font-semibold whitespace-nowrap",
								isHighlighted
									? "text-foreground bg-accent-subtle/20 dark:bg-grove-950/20"
									: "text-foreground-muted"
							)}
						>
							{#if col.href}
								<a href={col.href} class="hover:text-accent-muted transition-colors" target="_blank" rel="noopener noreferrer">
									{col.name}
								</a>
							{:else}
								{col.name}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i}
					<tr class={cn(
						i < rows.length - 1 && "border-b border-white/20 dark:border-bark-700/20"
					)}>
						<!-- Feature name -->
						<th scope="row" class="text-left px-5 py-3.5 text-foreground font-medium">
							{row.feature}
							{#if row.description}
								<span class="block text-xs text-foreground-faint font-normal mt-0.5">{row.description}</span>
							{/if}
						</th>
						<!-- Values -->
						{#each columns as col}
							{@const value = row.values[col.name]}
							{@const isHighlighted = col.name === highlightedCol}
							<td
								class={cn(
									"px-4 py-3.5 text-center",
									isHighlighted && "bg-accent-subtle/20 dark:bg-grove-950/20"
								)}
								aria-label={getCellLabel(value)}
							>
								{#if value === true}
									<span class="inline-flex items-center justify-center">
										<Check class="w-5 h-5 text-grove-600 dark:text-grove-400" aria-hidden="true" />
									</span>
								{:else if value === false}
									<span class="inline-flex items-center justify-center">
										<X class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
									</span>
								{:else if value === undefined}
									<span class="inline-flex items-center justify-center">
										<Minus class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
									</span>
								{:else}
									<span class={cn(
										"text-sm",
										isHighlighted ? "text-foreground font-medium" : "text-foreground-muted"
									)}>
										{value}
									</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Mobile: Card-based comparison (hidden on desktop) -->
<div class={cn("md:hidden space-y-4", className)}>
	{#each competitorColumns as competitor}
		<div
			class={cn(
				"rounded-xl overflow-hidden",
				"bg-white/80 dark:bg-bark-800/50 backdrop-blur-md",
				"border border-white/40 dark:border-bark-700/40",
				"shadow-sm"
			)}
		>
			<!-- Card header: Grove vs Competitor -->
			<div class="flex items-center border-b border-white/30 dark:border-bark-700/30">
				<div class="flex-1 px-4 py-3 text-center bg-accent-subtle/20 dark:bg-grove-950/20">
					<span class="font-semibold text-sm text-foreground font-sans">{highlightedCol}</span>
				</div>
				<div class="w-px h-8 bg-white/30 dark:bg-bark-700/30"></div>
				<div class="flex-1 px-4 py-3 text-center">
					{#if competitor.href}
						<a href={competitor.href} class="font-semibold text-sm text-foreground-muted font-sans hover:text-accent-muted transition-colors" target="_blank" rel="noopener noreferrer">
							{competitor.name}
						</a>
					{:else}
						<span class="font-semibold text-sm text-foreground-muted font-sans">{competitor.name}</span>
					{/if}
				</div>
			</div>

			<!-- Feature rows -->
			{#each rows as row, i}
				{@const groveValue = row.values[highlightedCol ?? '']}
				{@const competitorValue = row.values[competitor.name]}
				<div class={cn(
					"px-4 py-3",
					i < rows.length - 1 && "border-b border-white/15 dark:border-bark-700/15"
				)}>
					<!-- Feature name -->
					<div class="text-xs text-foreground-muted font-sans mb-2 font-medium">{row.feature}</div>
					<!-- Values side by side -->
					<div class="flex items-center">
						<!-- Grove value -->
						<div class="flex-1 flex items-center justify-center" aria-label="{highlightedCol}: {getCellLabel(groveValue)}">
							{#if groveValue === true}
								<Check class="w-5 h-5 text-grove-600 dark:text-grove-400" aria-hidden="true" />
							{:else if groveValue === false}
								<X class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
							{:else if groveValue === undefined}
								<Minus class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
							{:else}
								<span class="text-sm text-foreground font-medium font-sans">{groveValue}</span>
							{/if}
						</div>
						<div class="w-px h-5 bg-white/20 dark:bg-bark-700/20 mx-2"></div>
						<!-- Competitor value -->
						<div class="flex-1 flex items-center justify-center" aria-label="{competitor.name}: {getCellLabel(competitorValue)}">
							{#if competitorValue === true}
								<Check class="w-5 h-5 text-grove-600 dark:text-grove-400" aria-hidden="true" />
							{:else if competitorValue === false}
								<X class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
							{:else if competitorValue === undefined}
								<Minus class="w-4 h-4 text-foreground-faint" aria-hidden="true" />
							{:else}
								<span class="text-sm text-foreground-muted font-sans">{competitorValue}</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>
