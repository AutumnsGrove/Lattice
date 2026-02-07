<script lang="ts">
	import type { Snippet, Component } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";
	import { slide } from "svelte/transition";

	/**
	 * GlassLegend - A compact legend component with glassmorphism styling
	 *
	 * Display status indicators, color keys, or any labeled items in a
	 * beautiful glass container. Perfect for explaining table statuses,
	 * chart colors, or map markers.
	 *
	 * @example Status legend
	 * ```svelte
	 * <GlassLegend
	 *   title="Status"
	 *   items={[
	 *     { label: 'Active', description: 'In production', color: 'green' },
	 *     { label: 'Planned', description: 'Coming soon', color: 'slate' },
	 *   ]}
	 * />
	 * ```
	 *
	 * @example Collapsible legend
	 * ```svelte
	 * <GlassLegend title="Legend" items={items} collapsible defaultOpen={false} />
	 * ```
	 *
	 * @example Compact inline legend
	 * ```svelte
	 * <GlassLegend layout="inline" items={items} />
	 * ```
	 */

	type GlassVariant = "default" | "muted" | "frosted";
	type Layout = "stacked" | "inline" | "grid";
	type ColorKey = "green" | "amber" | "blue" | "slate" | "red" | "purple" | "accent";

	interface LegendItem {
		/** The label text (e.g., "Active", "Planned") */
		label: string;
		/** Optional description text */
		description?: string;
		/** Color indicator - uses predefined palette */
		color?: ColorKey;
		/** Custom color class override */
		colorClass?: string;
		/** Optional Lucide icon component */
		icon?: Component;
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
		/** Legend items to display */
		items: LegendItem[];
		/** Optional title for the legend */
		title?: string;
		/** Glass variant styling */
		variant?: GlassVariant;
		/** Layout mode */
		layout?: Layout;
		/** Show color dots/badges */
		showColors?: boolean;
		/** Compact mode - smaller text and spacing */
		compact?: boolean;
		/** Enable collapsible behavior */
		collapsible?: boolean;
		/** Initial open state when collapsible (defaults to true) */
		defaultOpen?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		items,
		title,
		variant = "muted",
		layout = "stacked",
		showColors = true,
		compact = false,
		collapsible = false,
		defaultOpen = true,
		class: className,
		...restProps
	}: Props = $props();

	// Collapsible state (captures initial prop value intentionally)
	const initialOpen = defaultOpen;
	let isOpen = $state(initialOpen);

	// Color palette - warm grove tones
	const colorClasses: Record<ColorKey, string> = {
		green: "bg-green-500 dark:bg-green-400",
		amber: "bg-amber-500 dark:bg-amber-400",
		blue: "bg-blue-500 dark:bg-blue-400",
		slate: "bg-bark-400 dark:bg-bark-500",
		red: "bg-red-500 dark:bg-red-400",
		purple: "bg-purple-500 dark:bg-purple-400",
		accent: "bg-accent dark:bg-accent"
	};

	// Variant-specific glass styles
	const variantClasses: Record<GlassVariant, string> = {
		default: "bg-white/80 dark:bg-bark-800/50 backdrop-blur-md border-white/40 dark:border-bark-700/40",
		muted: "bg-white/60 dark:bg-bark-800/30 backdrop-blur border-white/20 dark:border-bark-700/30",
		frosted: "bg-white/80 dark:bg-bark-800/70 backdrop-blur-lg border-white/50 dark:border-bark-700/40"
	};

	// Layout classes
	const layoutClasses: Record<Layout, string> = {
		stacked: "flex flex-col gap-2",
		inline: "flex flex-wrap gap-x-4 gap-y-2",
		grid: "grid grid-cols-2 gap-2 sm:grid-cols-3"
	};

	const containerClass = $derived(
		cn(
			"rounded-lg border shadow-sm",
			variantClasses[variant],
			compact ? "px-3 py-2" : "px-4 py-3",
			className
		)
	);

	const itemsClass = $derived(layoutClasses[layout]);

	const textSize = $derived(compact ? "text-xs" : "text-sm");

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<div class={containerClass} {...restProps}>
	{#if title}
		{#if collapsible}
			<button
				type="button"
				onclick={toggle}
				class="w-full flex items-center justify-between {compact ? 'text-xs' : 'text-sm'} font-medium text-foreground-muted hover:text-foreground transition-colors"
				aria-expanded={isOpen}
			>
				<span>{title}</span>
				<svg
					class="w-4 h-4 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
		{:else}
			<div class="mb-2 {compact ? 'text-xs' : 'text-sm'} font-medium text-foreground-muted">
				{title}
			</div>
		{/if}
	{/if}

	{#if !collapsible || isOpen}
		<div
			class="{itemsClass} {collapsible && title ? 'mt-2' : ''}"
			transition:slide={{ duration: 200 }}
		>
			{#each items as item}
				<div class="flex items-center gap-2">
					{#if showColors && (item.color || item.colorClass)}
						<span
							class={cn(
								"rounded-full flex-shrink-0",
								compact ? "w-2 h-2" : "w-2.5 h-2.5",
								item.colorClass ?? colorClasses[item.color ?? "slate"]
							)}
						></span>
					{/if}

					{#if item.icon}
						{@const IconComponent = item.icon}
						<IconComponent class={cn("flex-shrink-0 text-foreground-muted", compact ? "w-3 h-3" : "w-4 h-4")} />
					{/if}

					<span class="{textSize} font-medium text-foreground">
						{item.label}
					</span>

					{#if item.description}
						<span class="{textSize} text-foreground-muted">
							{item.description}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
