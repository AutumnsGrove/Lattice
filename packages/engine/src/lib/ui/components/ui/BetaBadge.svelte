<script lang="ts">
	import { cn } from "$lib/ui/utils";
	import { FlaskConical } from "lucide-svelte";
	import type { Snippet } from "svelte";

	/**
	 * BetaBadge - A small inline badge indicating beta program membership
	 *
	 * Matches the visual style of the "Rooted" badge in the arbor dashboard
	 * but uses a blue/indigo palette with a flask icon to signal beta status.
	 *
	 * Can render as a link (with href), a button (with onclick), or a plain span.
	 *
	 * @example Inline badge (no link)
	 * ```svelte
	 * <BetaBadge />
	 * ```
	 *
	 * @example As a link to beta info
	 * ```svelte
	 * <BetaBadge href="/knowledge/beta" />
	 * ```
	 *
	 * @example With custom label
	 * ```svelte
	 * <BetaBadge>Early Access</BetaBadge>
	 * ```
	 */

	interface Props {
		/** Optional link target */
		href?: string;
		/** Additional CSS classes */
		class?: string;
		/** Custom badge content (defaults to "Beta") */
		children?: Snippet;
		/** Custom title/tooltip text */
		title?: string;
		/** aria-label for accessibility */
		"aria-label"?: string;
	}

	let {
		href,
		class: className,
		children,
		title: titleProp = "You're part of the Grove beta",
		"aria-label": ariaLabel,
	}: Props = $props();

	const badgeClass = $derived(cn(
		"beta-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
		className,
	));
</script>

{#if href}
	<a
		{href}
		class={badgeClass}
		title={titleProp}
		aria-label={ariaLabel}
		target={href.startsWith("http") ? "_blank" : undefined}
		rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
	>
		<FlaskConical class="w-3.5 h-3.5" />
		{#if children}
			{@render children()}
		{:else}
			Beta
		{/if}
	</a>
{:else}
	<span
		class={badgeClass}
		title={titleProp}
		role="status"
	>
		<FlaskConical class="w-3.5 h-3.5" />
		{#if children}
			{@render children()}
		{:else}
			Beta
		{/if}
	</span>
{/if}

<style>
	.beta-badge {
		background: rgba(59, 130, 246, 0.15);
		color: var(--blue-700, #1d4ed8);
	}

	:global(.dark) .beta-badge {
		color: var(--blue-400, #60a5fa);
	}

	a.beta-badge:hover {
		background: rgba(59, 130, 246, 0.25);
	}
</style>
