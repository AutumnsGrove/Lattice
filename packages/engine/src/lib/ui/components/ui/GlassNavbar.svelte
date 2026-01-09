<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	import Logo from "./Logo.svelte";

	/**
	 * GlassNavbar - A sticky glassmorphism navigation bar
	 *
	 * A reusable navigation component with glass styling that can be used
	 * across Grove properties (landing, plant, etc.)
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GlassNavbar logoHref="https://grove.place" title="Grove" />
	 * ```
	 *
	 * @example With custom content
	 * ```svelte
	 * <GlassNavbar logoHref="/" title="Grove">
	 *   {#snippet actions()}
	 *     <ThemeToggle />
	 *   {/snippet}
	 * </GlassNavbar>
	 * ```
	 */

	interface Props {
		/** URL the logo links to */
		logoHref?: string;
		/** Title text next to logo */
		title?: string;
		/** Whether to show the title text */
		showTitle?: boolean;
		/** Max width constraint */
		maxWidth?: 'narrow' | 'default' | 'wide';
		/** Additional CSS classes */
		class?: string;
		/** Slot for navigation items */
		navigation?: Snippet;
		/** Slot for action items (right side) */
		actions?: Snippet;
		/** Callback when logo is clicked */
		onLogoClick?: () => void;
	}

	let {
		logoHref = "/",
		title = "Grove",
		showTitle = true,
		maxWidth = 'default',
		class: className,
		navigation,
		actions,
		onLogoClick
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	function handleLogoClick(e: MouseEvent) {
		if (onLogoClick) {
			e.preventDefault();
			onLogoClick();
		}
	}
</script>

<header
	class={cn(
		"sticky top-0 z-40 py-4 px-6",
		"bg-white/60 dark:bg-slate-900/60 backdrop-blur-md",
		"border-b border-white/40 dark:border-slate-700/40",
		className
	)}
>
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo area -->
		<div class="flex items-center gap-2">
			{#if onLogoClick}
				<button
					onclick={handleLogoClick}
					class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
					aria-label="Go to homepage"
				>
					<Logo class="w-7 h-7" />
				</button>
			{:else}
				<a href={logoHref} class="flex-shrink-0 transition-transform hover:scale-105">
					<Logo class="w-7 h-7" />
				</a>
			{/if}

			{#if showTitle}
				<a
					href={logoHref}
					class="text-lg font-medium text-foreground hover:text-primary transition-colors"
				>
					{title}
				</a>
			{/if}
		</div>

		<!-- Navigation (center or left of actions) -->
		{#if navigation}
			<nav class="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
				{@render navigation()}
			</nav>
		{/if}

		<!-- Actions (right side) -->
		{#if actions}
			<div class="flex items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>
