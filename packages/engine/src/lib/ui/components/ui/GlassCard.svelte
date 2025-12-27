<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * GlassCard - A card component with glassmorphism styling
	 *
	 * Beautiful translucent cards with backdrop blur effects.
	 * Includes optional header, footer, and hoverable state.
	 *
	 * @example Basic glass card
	 * ```svelte
	 * <GlassCard title="Settings" description="Manage your preferences">
	 *   <p>Card content here</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Accent card with footer
	 * ```svelte
	 * <GlassCard variant="accent" hoverable>
	 *   {#snippet header()}<CustomHeader />{/snippet}
	 *   Content here
	 *   {#snippet footer()}<Button>Save</Button>{/snippet}
	 * </GlassCard>
	 * ```
	 */

	type GlassVariant =
		| "default"   // Light translucent background
		| "accent"    // Accent-colored glass
		| "dark"      // Dark translucent background
		| "muted"     // Very subtle, barely visible
		| "frosted";  // Stronger blur effect, more opaque

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
		variant?: GlassVariant;
		title?: string;
		description?: string;
		hoverable?: boolean;
		border?: boolean;
		class?: string;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	}

	let {
		variant = "default",
		title,
		description,
		hoverable = false,
		border = true,
		class: className,
		header,
		footer,
		children,
		...restProps
	}: Props = $props();

	// Variant-specific styles
	const variantClasses: Record<GlassVariant, string> = {
		default: `
			bg-white/70 dark:bg-slate-800/60
			backdrop-blur-sm
		`.trim().replace(/\s+/g, ' '),

		accent: `
			bg-accent/20 dark:bg-accent/15
			backdrop-blur-sm
		`.trim().replace(/\s+/g, ' '),

		dark: `
			bg-slate-900/60 dark:bg-slate-950/70
			backdrop-blur-sm
			text-white
		`.trim().replace(/\s+/g, ' '),

		muted: `
			bg-white/40 dark:bg-slate-900/30
			backdrop-blur-sm
		`.trim().replace(/\s+/g, ' '),

		frosted: `
			bg-white/85 dark:bg-slate-800/80
			backdrop-blur-md
		`.trim().replace(/\s+/g, ' ')
	};

	// Border colors per variant
	const borderClasses: Record<GlassVariant, string> = {
		default: "border-white/30 dark:border-slate-600/30",
		accent: "border-accent/30 dark:border-accent/20",
		dark: "border-slate-700/30 dark:border-slate-600/30",
		muted: "border-white/20 dark:border-slate-700/20",
		frosted: "border-white/40 dark:border-slate-600/40"
	};

	// Hover styles
	const hoverClasses: Record<GlassVariant, string> = {
		default: "hover:bg-white/85 dark:hover:bg-slate-800/75 hover:shadow-lg hover:border-white/50 dark:hover:border-slate-500/40",
		accent: "hover:bg-accent/30 dark:hover:bg-accent/25 hover:shadow-lg hover:shadow-accent/10 hover:border-accent/40",
		dark: "hover:bg-slate-900/75 dark:hover:bg-slate-950/85 hover:shadow-xl hover:border-slate-600/50",
		muted: "hover:bg-white/55 dark:hover:bg-slate-900/45 hover:shadow-md hover:border-white/30",
		frosted: "hover:bg-white/95 dark:hover:bg-slate-800/90 hover:shadow-lg hover:border-white/60"
	};

	const computedClass = $derived(
		cn(
			"rounded-xl transition-all duration-200",
			variantClasses[variant],
			border && `border ${borderClasses[variant]}`,
			hoverable && `cursor-pointer ${hoverClasses[variant]}`,
			"shadow-sm",
			className
		)
	);

	// Text color adjustments for dark variant
	const titleClass = $derived(
		variant === "dark"
			? "text-white"
			: "text-foreground"
	);

	const descriptionClass = $derived(
		variant === "dark"
			? "text-slate-300"
			: "text-muted-foreground"
	);
</script>

<div class={computedClass} {...restProps}>
	{#if header || title || description}
		<div class="px-6 py-4 {(children || footer) ? 'border-b border-inherit' : ''}">
			{#if header}
				{@render header()}
			{:else}
				{#if title}
					<h3 class="text-lg font-semibold {titleClass}">{title}</h3>
				{/if}
				{#if description}
					<p class="text-sm {descriptionClass} mt-1">{description}</p>
				{/if}
			{/if}
		</div>
	{/if}

	{#if children}
		<div class="px-6 py-4">
			{@render children()}
		</div>
	{/if}

	{#if footer}
		<div class="px-6 py-4 border-t border-inherit">
			{@render footer()}
		</div>
	{/if}
</div>
