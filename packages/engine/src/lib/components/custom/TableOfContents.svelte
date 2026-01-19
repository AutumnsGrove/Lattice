<script lang="ts">
	import type { Component } from 'svelte';

	/**
	 * Header item for the table of contents
	 */
	export interface TOCHeader {
		/** Unique ID matching the section's id attribute */
		id: string;
		/** Display text for the TOC item */
		text: string;
		/** Header level (1-6) for indentation */
		level: number;
		/** Optional Svelte component to render as an icon */
		icon?: Component<{ class?: string }>;
	}

	interface Props {
		/** Array of headers to display in the TOC */
		headers?: TOCHeader[];
		/** Title displayed at the top of the TOC */
		title?: string;
		/** Scroll offset in pixels to account for sticky headers (default: 80) */
		scrollOffset?: number;
	}

	let { headers = [], title = 'Table of Contents', scrollOffset = 80 }: Props = $props();

	let activeId = $state('');

	// Set up intersection observer to track active section
	function setupScrollTracking() {
		if (typeof window === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0% -35% 0%',
				threshold: 0
			}
		);

		// Observe all headers in the document
		headers.forEach((header) => {
			const element = document.getElementById(header.id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}

	// Set up scroll tracking (runs on mount and when headers change)
	$effect(() => {
		const cleanup = setupScrollTracking();
		return cleanup;
	});

	function scrollToHeader(id: string) {
		const element = document.getElementById(id);
		if (element) {
			const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
			const offsetPosition = elementPosition - scrollOffset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			});

			// Update URL hash without jumping
			history.pushState(null, '', `#${id}`);
		} else {
			console.warn(`TableOfContents: Header element not found for ID: ${id}`);
		}
	}

	/**
	 * Check if icon is a valid Svelte component (has render capabilities)
	 */
	function isValidIcon(icon: unknown): icon is Component<{ class?: string }> {
		return typeof icon === 'function' || (typeof icon === 'object' && icon !== null);
	}
</script>

{#if headers.length > 0}
	<nav class="toc">
		<h3 class="toc-title">{title}</h3>
		<ul class="toc-list">
			{#each headers as header (header.id)}
				{@const IconComponent = header.icon && isValidIcon(header.icon) ? header.icon : null}
				<li
					class="toc-item level-{header.level}"
					class:active={activeId === header.id}
					class:has-icon={!!IconComponent}
				>
					<button
						type="button"
						onclick={() => scrollToHeader(header.id)}
						class="toc-link"
					>
						{#if IconComponent}
							<IconComponent class="toc-icon" />
						{/if}
						<span>{header.text}</span>
					</button>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: 2rem;
		max-height: calc(100vh - 4rem);
		overflow-y: auto;
		padding: 1.25rem;
		font-size: 0.875rem;
		/* Glass effect */
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 16px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}
	.toc:hover {
		background: rgba(255, 255, 255, 0.7);
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .toc {
		background: rgba(16, 50, 37, 0.45);
		border-color: rgba(74, 222, 128, 0.15);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .toc:hover {
		background: rgba(16, 50, 37, 0.55);
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.25);
	}
	.toc-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-foreground-muted, #666);
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-divider, rgba(0, 0, 0, 0.1));
		transition: color 0.3s ease, border-color 0.3s ease;
	}
	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.toc-item {
		margin: 0;
		padding: 0;
	}
	.toc-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.375rem 0;
		background: none;
		border: none;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: color 0.2s ease;
		font-size: inherit;
		font-family: inherit;
		line-height: 1.4;
	}
	/* Icon styling */
	.toc-link :global(.toc-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}
	.toc-item.active .toc-link :global(.toc-icon),
	.toc-link:hover :global(.toc-icon) {
		opacity: 1;
	}
	.toc-link:hover {
		color: var(--accent-success, #2c5f2d);
		padding-left: 0.5rem;
	}
	.toc-item.active .toc-link {
		color: var(--accent-success, #2c5f2d);
		font-weight: 600;
		/* Active indicator */
		background: var(--accent-success-faint, rgba(44, 95, 45, 0.1));
		padding: 0.375rem 0.75rem;
		margin-left: -0.75rem;
		margin-right: -0.75rem;
		border-radius: 8px;
	}
	:global(.dark) .toc-item.active .toc-link {
		background: rgba(74, 222, 128, 0.1);
	}
	/* Indentation based on header level */
	.level-1 .toc-link {
		padding-left: 0;
		font-weight: 600;
	}
	.level-2 .toc-link {
		padding-left: 0;
	}
	.level-3 .toc-link {
		padding-left: 1rem;
	}
	.level-4 .toc-link {
		padding-left: 2rem;
	}
	.level-5 .toc-link {
		padding-left: 3rem;
	}
	.level-6 .toc-link {
		padding-left: 4rem;
	}
	/* Scrollbar styling */
	.toc::-webkit-scrollbar {
		width: 4px;
	}
	.toc::-webkit-scrollbar-track {
		background: transparent;
	}
	.toc::-webkit-scrollbar-thumb {
		background: var(--color-foreground-subtle, #ccc);
		border-radius: 2px;
	}
</style>
