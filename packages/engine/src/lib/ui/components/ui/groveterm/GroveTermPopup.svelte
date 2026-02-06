<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X, Leaf } from 'lucide-svelte';
	import { cn } from '$lib/ui/utils';
	import GlassCard from '../GlassCard.svelte';
	import { DialogOverlay } from '$lib/ui/components/primitives/dialog';
	import type { GroveTermEntry, GroveTermManifest, GroveTermCategory } from './types';
	import { GROVE_TERM_CATEGORY_LABELS, GROVE_TERM_COLORS } from './types';
	import { themeStore, groveModeStore } from '$lib/ui/stores';

	/**
	 * GroveTermPopup - Definition overlay for Grove terminology
	 *
	 * Displays term definitions in a glassmorphism popup with category badge,
	 * definition, usage examples, and related term links.
	 *
	 * @example
	 * ```svelte
	 * <GroveTermPopup
	 *   bind:open={showTerm}
	 *   entry={groveEntry}
	 * />
	 * ```
	 */

	interface Props {
		/** Whether the popup is open (bindable) */
		open?: boolean;
		/** The term entry to display */
		entry: GroveTermEntry | null;
		/** Manifest for looking up related terms */
		manifest?: GroveTermManifest;
		/** Loading state */
		loading?: boolean;
		/** Error message */
		error?: string | null;
		/** Called when the popup closes */
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		entry,
		manifest,
		loading = false,
		error = null,
		onclose
	}: Props = $props();

	// Track which related term to show (for "see also" navigation)
	let relatedEntry = $state<GroveTermEntry | null>(null);

	// The currently displayed entry (either main or related)
	const displayEntry = $derived(relatedEntry || entry);

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && open) {
			onclose?.();
			// Reset related entry when closing
			relatedEntry = null;
		}
		open = isOpen;
	}

	function handleClose() {
		open = false;
		relatedEntry = null;
		onclose?.();
	}

	function handleRelatedClick(slug: string) {
		if (manifest && slug in manifest) {
			relatedEntry = manifest[slug];
		} else if (manifest) {
			// Try with your- prefix
			const withPrefix = `your-${slug}`;
			if (withPrefix in manifest) {
				relatedEntry = manifest[withPrefix];
			}
		}
	}

	function handleBackClick() {
		relatedEntry = null;
	}

	// Get category color for badge (reactive to theme changes)
	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const isGroveMode = $derived(groveModeStore.current);

	function getCategoryColor(category: GroveTermCategory): string {
		return isDark ? GROVE_TERM_COLORS[category].dark : GROVE_TERM_COLORS[category].light;
	}
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<!-- Overlay with blur effect -->
		<DialogOverlay />

		<!-- Popup content -->
		<DialogPrimitive.Content
			class={cn(
				'fixed left-[50%] md:left-[calc(50%+128px)] top-[50%] z-grove-modal w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 outline-none',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				'data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]'
			)}
			aria-labelledby="grove-term-popup-title"
			aria-describedby="grove-term-popup-description"
		>
			<GlassCard variant="frosted" class="overflow-hidden max-h-[70vh] flex flex-col">
				<!-- Header -->
				<div class="px-6 pt-5 pb-4 flex items-start gap-4 border-b border-white/20 dark:border-slate-700/30">
					{#if loading}
						<div class="flex-shrink-0 p-2.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse w-10 h-10"></div>
						<div class="flex-1 min-w-0">
							<div class="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
						</div>
					{:else if error}
						<div class="flex-shrink-0 p-2.5 rounded-full bg-red-100 dark:bg-red-900/30">
							<Leaf class="w-5 h-5 text-red-600 dark:text-red-400" />
						</div>
						<div class="flex-1 min-w-0">
							<DialogPrimitive.Title
								id="grove-term-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								Term not found
							</DialogPrimitive.Title>
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
						</div>
					{:else if displayEntry}
						<!-- Category badge -->
						<div
							class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-white"
							style="background-color: {getCategoryColor(displayEntry.category)}"
						>
							{GROVE_TERM_CATEGORY_LABELS[displayEntry.category]}
						</div>
						<div class="flex-1 min-w-0">
							<DialogPrimitive.Title
								id="grove-term-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								{displayEntry.term}
							</DialogPrimitive.Title>
							<DialogPrimitive.Description
								id="grove-term-popup-description"
								class="mt-1 text-sm text-muted-foreground"
							>
								{#if !isGroveMode && displayEntry.standardTerm && !displayEntry.alwaysGrove}
									Grove's name for {displayEntry.standardTerm}
								{:else}
									{displayEntry.tagline}
								{/if}
							</DialogPrimitive.Description>
						</div>
					{:else}
						<div class="flex-shrink-0 p-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
							<Leaf class="w-5 h-5 text-muted-foreground" />
						</div>
						<div class="flex-1 min-w-0">
							<DialogPrimitive.Title
								id="grove-term-popup-title"
								class="text-lg font-semibold text-foreground leading-tight"
							>
								Grove Term
							</DialogPrimitive.Title>
						</div>
					{/if}

					<DialogPrimitive.Close
						class="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
						aria-label="Close term popup"
					>
						<X class="w-5 h-5" />
					</DialogPrimitive.Close>
				</div>

				<!-- Content area - scrollable -->
				<div class="flex-1 overflow-y-auto px-6 py-4" aria-busy={loading} aria-live="polite">
					{#if loading}
						<!-- Loading skeleton -->
						<div class="space-y-3">
							<div class="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
							<div class="h-4 w-4/5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
						</div>
					{:else if error}
						<p class="text-sm text-muted-foreground">
							This term isn't in the Grove lexicon yet.
						</p>
					{:else if displayEntry}
						<!-- Definition -->
						<div class="prose prose-sm prose-slate dark:prose-invert max-w-none grove-term-content">
							<p>{displayEntry.definition}</p>
						</div>

						<!-- Usage example -->
						{#if displayEntry.usageExample}
							<blockquote class="mt-4 pl-4 border-l-2 border-slate-300 dark:border-slate-600 italic text-sm text-muted-foreground">
								{#each displayEntry.usageExample.split('\n') as line}
									<p class="my-1">{line}</p>
								{/each}
							</blockquote>
						{/if}

						<!-- See also links -->
						{#if displayEntry.seeAlso && displayEntry.seeAlso.length > 0 && manifest}
							<div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
								<p class="text-xs font-medium text-muted-foreground mb-2">See also</p>
								<div class="flex flex-wrap gap-2">
									{#each displayEntry.seeAlso as relatedSlug}
										{@const related = manifest[relatedSlug] || manifest[`your-${relatedSlug}`]}
										{#if related}
											<button
												type="button"
												class="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
												onclick={() => handleRelatedClick(relatedSlug)}
											>
												{related.term}
											</button>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground">
							No definition available for this term.
						</p>
					{/if}
				</div>

				<!-- Footer - only show back button when viewing related term -->
				{#if relatedEntry}
					<div class="px-6 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-white/20 dark:border-slate-700/30">
						<button
							type="button"
							class="text-sm text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded"
							onclick={handleBackClick}
						>
							← Back to {entry?.term}
						</button>
					</div>
				{/if}
			</GlassCard>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>

<style>
	/* Content styling */
	:global(.grove-term-content) {
		font-size: 0.9375rem;
		line-height: 1.7;
	}

	:global(.grove-term-content p) {
		margin-bottom: 0.75rem;
	}

	:global(.grove-term-content p:last-child) {
		margin-bottom: 0;
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		:global([data-state='open']),
		:global([data-state='closed']) {
			animation: none !important;
		}
	}
</style>
