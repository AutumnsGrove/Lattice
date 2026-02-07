<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X, BookOpen, HelpCircle } from 'lucide-svelte';
	import { cn } from '$lib/ui/utils';
	import GlassCard from '../GlassCard.svelte';
	import Button from '../Button.svelte';
	import { DialogOverlay } from '$lib/ui/components/primitives/dialog';
	import { sanitizeMarkdown } from '$lib/utils/sanitize';
	import type { WaystoneExcerpt } from './types';

	/**
	 * WaystonePopup - In-context help overlay for Waystone components
	 *
	 * Displays KB article excerpts in a glassmorphism popup without
	 * navigating away from the current page. Built on bits-ui Dialog
	 * for accessibility (focus trap, escape-to-close, ARIA).
	 *
	 * @example
	 * ```svelte
	 * <WaystonePopup
	 *   bind:open={showHelp}
	 *   excerpt={customFontsExcerpt}
	 *   fullArticleUrl="https://grove.place/knowledge/help/custom-fonts"
	 * />
	 * ```
	 */

	interface Props {
		/** Whether the popup is open (bindable) */
		open?: boolean;
		/** The excerpt data to display */
		excerpt: WaystoneExcerpt | null;
		/** URL to the full KB article */
		fullArticleUrl: string;
		/** Loading state while fetching excerpt */
		loading?: boolean;
		/** Error message if excerpt fetch failed */
		error?: string | null;
		/** Called when the popup closes */
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		excerpt,
		fullArticleUrl,
		loading = false,
		error = null,
		onclose
	}: Props = $props();

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && open) {
			onclose?.();
		}
		open = isOpen;
	}

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<!-- Overlay with blur effect -->
		<DialogOverlay />

		<!-- Popup content - centered modal on desktop, bottom sheet concept for future mobile -->
		<!-- Centered in viewport on mobile, offset for sidebar on desktop (sidebar is 256px, so offset by 128px) -->
		<DialogPrimitive.Content
			class={cn(
				'fixed left-[50%] md:left-[calc(50%+128px)] top-[50%] z-grove-modal w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 outline-none',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				'data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]'
			)}
			aria-labelledby="waystone-popup-title"
			aria-describedby="waystone-popup-description"
		>
			<GlassCard variant="frosted" flush class="overflow-hidden max-h-[70vh] flex flex-col">
				<!-- Header -->
				<div class="flex-shrink-0 px-6 pt-5 pb-4 flex items-start gap-4 border-b border-white/20 dark:border-slate-700/30">
					<div class="flex-shrink-0 p-2.5 rounded-full bg-accent/10 dark:bg-accent/20">
						<HelpCircle class="w-5 h-5 text-accent-muted" />
					</div>
					<div class="flex-1 min-w-0">
						{#if loading}
							<div class="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
						{:else if error}
							<DialogPrimitive.Title
								id="waystone-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								Unable to load help
							</DialogPrimitive.Title>
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
						{:else if excerpt}
							<DialogPrimitive.Title
								id="waystone-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								{excerpt.title}
							</DialogPrimitive.Title>
							<DialogPrimitive.Description
								id="waystone-popup-description"
								class="mt-1 text-sm text-muted-foreground"
							>
								{excerpt.description}
							</DialogPrimitive.Description>
						{:else}
							<DialogPrimitive.Title
								id="waystone-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								Help
							</DialogPrimitive.Title>
						{/if}
					</div>
					<DialogPrimitive.Close
						class="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
						aria-label="Close help popup"
					>
						<X class="w-5 h-5" />
					</DialogPrimitive.Close>
				</div>

				<!-- Content area - scrollable (min-h-0 required for flex + overflow) -->
				<div class="flex-1 min-h-0 overflow-y-auto px-6 py-4">
					{#if loading}
						<!-- Loading skeleton -->
						<div class="space-y-3">
							<div class="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-4/5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
						</div>
					{:else if error}
						<p class="text-sm text-muted-foreground">
							We couldn't load the help content. You can still read the full article.
						</p>
					{:else if excerpt}
						<!-- Rendered first section HTML -->
						<div
							class="prose prose-sm prose-slate dark:prose-invert max-w-none waystone-content"
						>
							{@html sanitizeMarkdown(excerpt.firstSection)}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">
							No help content available for this topic.
						</p>
					{/if}
				</div>

				<!-- Footer with link to full article - flex-shrink-0 ensures always visible -->
				<div class="flex-shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-white/20 dark:border-slate-700/30 flex items-center justify-between">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						{#if excerpt?.readingTime}
							<BookOpen class="w-4 h-4" />
							<span>{excerpt.readingTime} min read</span>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" onclick={handleClose}>
							Close
						</Button>
						<a
							href={fullArticleUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
						>
							Read full article
							<span class="sr-only">(opens in new tab)</span>
						</a>
					</div>
				</div>
			</GlassCard>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>

<style>
	/* Content styling for rendered markdown excerpts */
	:global(.waystone-content) {
		font-size: 0.9375rem;
		line-height: 1.7;
	}

	:global(.waystone-content p) {
		margin-bottom: 0.75rem;
	}

	:global(.waystone-content p:last-child) {
		margin-bottom: 0;
	}

	:global(.waystone-content img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 0.75rem 0;
	}

	:global(.waystone-content ul),
	:global(.waystone-content ol) {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
	}

	:global(.waystone-content li) {
		margin-bottom: 0.25rem;
	}

	:global(.waystone-content code) {
		font-size: 0.875em;
		padding: 0.125rem 0.375rem;
		background: var(--color-surface, rgba(0, 0, 0, 0.05));
		border-radius: 0.25rem;
	}

	:global(.waystone-content a) {
		color: var(--color-accent);
		text-decoration: underline;
		text-decoration-color: var(--color-accent);
		text-underline-offset: 2px;
	}

	:global(.waystone-content a:hover) {
		text-decoration-color: currentColor;
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		:global([data-state='open']),
		:global([data-state='closed']) {
			animation: none !important;
		}
	}
</style>
