<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * GlassOverlay - A fullscreen overlay with glassmorphism effect
	 *
	 * Perfect for modal backdrops, loading screens, and focus overlays.
	 * Provides a dark translucent backdrop with blur effect.
	 *
	 * @example Basic overlay
	 * ```svelte
	 * {#if showModal}
	 *   <GlassOverlay onclick={closeModal} />
	 * {/if}
	 * ```
	 *
	 * @example Custom intensity
	 * ```svelte
	 * <GlassOverlay variant="light" intensity="strong" />
	 * ```
	 */

	type OverlayVariant =
		| "dark"      // Dark overlay (default for modals)
		| "light"     // Light overlay
		| "accent";   // Tinted with accent color

	type BlurIntensity =
		| "none"      // No blur
		| "light"     // 4px blur
		| "medium"    // 8px blur
		| "strong";   // 12px blur

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
		variant?: OverlayVariant;
		intensity?: BlurIntensity;
		/** Whether clicking the overlay should be interactive (for close handlers) */
		interactive?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		variant = "dark",
		intensity = "light",
		interactive = true,
		class: className,
		children,
		...restProps
	}: Props = $props();

	// Variant backgrounds
	const variantClasses: Record<OverlayVariant, string> = {
		dark: "bg-black/50 dark:bg-black/60",
		light: "bg-white/70 dark:bg-bark-900/50",
		accent: "bg-accent/30 dark:bg-accent/20"
	};

	// Blur intensities
	const intensityClasses: Record<BlurIntensity, string> = {
		none: "",
		light: "backdrop-blur-sm",
		medium: "backdrop-blur",
		strong: "backdrop-blur-md"
	};

	const computedClass = $derived(
		cn(
			"fixed inset-0 z-grove-overlay",
			variantClasses[variant],
			intensityClasses[intensity],
			interactive && "cursor-pointer",
			// Animation classes for when used with transitions
			"data-[state=open]:animate-in data-[state=closed]:animate-out",
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className
		)
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class={computedClass}
	role={interactive ? "button" : "presentation"}
	tabindex={interactive ? 0 : -1}
	aria-label={interactive ? "Close overlay" : undefined}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
