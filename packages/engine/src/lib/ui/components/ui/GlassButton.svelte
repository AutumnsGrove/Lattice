<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * GlassButton - A button with glassmorphism styling
	 *
	 * Beautiful translucent buttons with backdrop blur effects.
	 * Perfect for floating actions, overlays, and modern UI designs.
	 *
	 * @example Basic glass button
	 * ```svelte
	 * <GlassButton>Click me</GlassButton>
	 * ```
	 *
	 * @example Accent glass button
	 * ```svelte
	 * <GlassButton variant="accent">Subscribe</GlassButton>
	 * ```
	 *
	 * @example Ghost glass with icon
	 * ```svelte
	 * <GlassButton variant="ghost" size="icon">
	 *   <X class="w-4 h-4" />
	 * </GlassButton>
	 * ```
	 */

	type GlassVariant =
		| "default"   // Light translucent background
		| "accent"    // Accent-colored glass
		| "dark"      // Dark translucent background
		| "ghost"     // No background until hover
		| "outline";  // Transparent with glass border

	type ButtonSize = "sm" | "md" | "lg" | "icon";

	interface Props extends Omit<HTMLButtonAttributes, "class"> {
		variant?: GlassVariant;
		size?: ButtonSize;
		disabled?: boolean;
		href?: string;
		class?: string;
		children?: Snippet;
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
	}

	let {
		variant = "default",
		size = "md",
		disabled = false,
		href,
		class: className,
		children,
		ref = $bindable(null),
		type = "button",
		...restProps
	}: Props = $props();

	// Base styles shared by all variants
	const baseClasses = `
		inline-flex items-center justify-center gap-2
		font-medium rounded-lg
		transition-all duration-200
		backdrop-blur-sm
		outline-none
		focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2
		disabled:opacity-50 disabled:pointer-events-none
		[&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0
	`.trim().replace(/\s+/g, ' ');

	// Variant-specific styles
	const variantClasses: Record<GlassVariant, string> = {
		default: `
			bg-white/70 dark:bg-slate-800/60
			border border-white/30 dark:border-slate-600/30
			text-foreground
			hover:bg-white/90 dark:hover:bg-slate-800/80
			hover:border-white/50 dark:hover:border-slate-500/40
			shadow-sm hover:shadow-md
		`.trim().replace(/\s+/g, ' '),

		accent: `
			bg-accent/80 dark:bg-accent/70
			border border-accent/40 dark:border-accent/30
			text-white
			hover:bg-accent/95 dark:hover:bg-accent/85
			hover:border-accent/60 dark:hover:border-accent/50
			shadow-sm hover:shadow-md shadow-accent/20
		`.trim().replace(/\s+/g, ' '),

		dark: `
			bg-slate-900/70 dark:bg-slate-950/80
			border border-slate-700/30 dark:border-slate-600/30
			text-white
			hover:bg-slate-900/90 dark:hover:bg-slate-950/95
			hover:border-slate-600/50 dark:hover:border-slate-500/40
			shadow-md hover:shadow-lg
		`.trim().replace(/\s+/g, ' '),

		ghost: `
			bg-transparent
			border border-transparent
			text-foreground
			hover:bg-white/50 dark:hover:bg-slate-800/50
			hover:border-white/20 dark:hover:border-slate-600/20
		`.trim().replace(/\s+/g, ' '),

		outline: `
			bg-transparent
			border border-white/40 dark:border-slate-600/40
			text-foreground
			hover:bg-white/30 dark:hover:bg-slate-800/30
			hover:border-white/60 dark:hover:border-slate-500/50
		`.trim().replace(/\s+/g, ' ')
	};

	// Size-specific styles
	const sizeClasses: Record<ButtonSize, string> = {
		sm: "h-8 px-3 text-sm",
		md: "h-10 px-4 text-sm",
		lg: "h-12 px-6 text-base",
		icon: "h-10 w-10 p-0"
	};

	const computedClass = $derived(
		cn(
			baseClasses,
			variantClasses[variant],
			sizeClasses[size],
			className
		)
	);
</script>

{#if href && !disabled}
	<a
		bind:this={ref}
		{href}
		class={computedClass}
		aria-disabled={disabled}
		{...restProps}
	>
		{#if children}{@render children()}{/if}
	</a>
{:else}
	<button
		bind:this={ref}
		{type}
		{disabled}
		class={computedClass}
		{...restProps}
	>
		{#if children}{@render children()}{/if}
	</button>
{/if}
