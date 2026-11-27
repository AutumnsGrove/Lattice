<script lang="ts">
	import ContentWithGutter from "$lib/ui/components/custom/ContentWithGutter.svelte";
	import type { GutterItem as GutterItemProp } from "$lib/utils/gutter";

	interface Props {
		show: boolean;
		previewHtml: string;
		previewTitle: string;
		previewDate: string;
		previewTags: string[];
		previewHeaders: Array<{ level: number; text: string; id: string }>;
		gutterItems: GutterItemProp[];
		onClose: () => void;
	}

	let {
		show,
		previewHtml,
		previewTitle,
		previewDate,
		previewTags,
		previewHeaders,
		gutterItems,
		onClose,
	}: Props = $props();

	let fullPreviewModalRef: HTMLDivElement | null = $state(null);
	let previouslyFocused: HTMLElement | null = null;

	$effect(() => {
		if (show) {
			const activeEl = document.activeElement;
			if (activeEl instanceof HTMLElement) {
				previouslyFocused = activeEl;
			}
			setTimeout(() => {
				fullPreviewModalRef?.focus();
			}, 50);
		} else if (previouslyFocused) {
			previouslyFocused.focus();
			previouslyFocused = null;
		}
	});
</script>

{#if show}
	<div
		bind:this={fullPreviewModalRef}
		class="full-preview-modal"
		role="dialog"
		aria-modal="true"
		aria-label="Full article preview"
		tabindex="-1"
		onkeydown={(e) => e.key === "Escape" && onClose()}
	>
		<button
			type="button"
			class="full-preview-backdrop"
			onclick={onClose}
			aria-label="Close preview"
		></button>
		<div class="full-preview-container" class:has-vines={gutterItems.length > 0}>
			<header class="full-preview-header">
				<h2>
					:: full preview {#if gutterItems.length > 0}<span class="vine-count"
							>({gutterItems.length} vine{gutterItems.length !== 1 ? "s" : ""})</span
						>{/if}
				</h2>
				<div class="full-preview-actions">
					<button
						type="button"
						class="full-preview-close"
						onclick={onClose}
					>
						[<span class="key">c</span>lose]
					</button>
				</div>
			</header>
			<div class="full-preview-scroll">
				{#if gutterItems.length > 0}
					<!-- Use ContentWithGutter when we have vines -->
					<ContentWithGutter
						content={previewHtml}
						gutterContent={gutterItems}
						headers={previewHeaders}
						showTableOfContents={previewHeaders.length > 0}
					>
						{#if previewTitle || previewDate || previewTags.length > 0}
							<header class="content-header">
								{#if previewTitle}
									<h1 class="full-preview-title">{previewTitle}</h1>
								{/if}
								{#if previewDate || previewTags.length > 0}
									<div class="post-meta">
										{#if previewDate}
											<time datetime={previewDate}>
												{new Date(previewDate).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</time>
										{/if}
										{#if previewTags.length > 0}
											<div class="tags">
												{#each previewTags as tag}
													<span class="tag">{tag}</span>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							</header>
						{/if}
					</ContentWithGutter>
				{:else}
					<!-- Simple preview without vines -->
					<article class="full-preview-article">
						{#if previewTitle || previewDate || previewTags.length > 0}
							<header class="content-header">
								{#if previewTitle}
									<h1>{previewTitle}</h1>
								{/if}
								{#if previewDate || previewTags.length > 0}
									<div class="post-meta">
										{#if previewDate}
											<time datetime={previewDate}>
												{new Date(previewDate).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</time>
										{/if}
										{#if previewTags.length > 0}
											<div class="tags">
												{#each previewTags as tag}
													<span class="tag">{tag}</span>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							</header>
						{/if}

						<div class="content-body">
							{#if previewHtml}
								{#key previewHtml}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized highlighted code -->
									<div>{@html previewHtml}</div>
								{/key}
							{:else}
								<p class="preview-placeholder">Start writing to see your content here...</p>
							{/if}
						</div>
					</article>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.full-preview-modal {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.full-preview-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.full-preview-container {
		position: relative;
		width: 90%;
		max-width: 900px;
		height: 90vh;
		background: var(--color-bg, var(--light-bg-primary));
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
		transition: max-width 0.3s ease;
	}
	.full-preview-container.has-vines {
		max-width: 1400px;
	}
	.vine-count {
		font-weight: 400;
		color: var(--color-foreground-subtle);
		font-size: 0.75rem;
		margin-left: 0.5rem;
	}
	:global(.dark) .full-preview-container {
		background: var(--color-bg-dark, #0d1117);
	}
	.full-preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: var(--color-bg-secondary, var(--light-bg-tertiary));
		border-bottom: 1px solid var(--color-border, var(--light-border-primary));
		flex-shrink: 0;
	}
	:global(.dark) .full-preview-header {
		background: var(--color-bg-secondary-dark, var(--light-bg-primary));
		border-color: var(--color-border-dark, var(--light-border-secondary));
	}
	.full-preview-header h2 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: "JetBrains Mono", "Fira Code", monospace;
		color: var(--grove-accent);
	}
	.full-preview-close {
		padding: 0.3rem 0.5rem;
		background: transparent;
		color: var(--color-foreground-subtle);
		border: none;
		font-size: 0.85rem;
		font-family: "JetBrains Mono", "Fira Code", monospace;
		cursor: pointer;
		transition: color 0.1s ease;
	}
	.full-preview-close:hover {
		color: var(--grove-accent-light);
	}
	.key {
		color: var(--editor-accent, #8bc48b);
		font-weight: bold;
		text-decoration: underline;
	}
	.full-preview-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}
	.full-preview-article {
		max-width: 800px;
		margin: 0 auto;
	}
	.full-preview-article .post-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	.full-preview-article time {
		color: var(--light-text-light);
		font-size: 1rem;
		transition: color 0.3s ease;
	}
	:global(.dark) .full-preview-article time {
		color: var(--color-text-subtle-dark, #666);
	}
	.full-preview-article .tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.full-preview-article .tag {
		padding: 0.25rem 0.75rem;
		background: var(--tag-bg, var(--grove-accent-dark));
		color: white;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}
</style>
