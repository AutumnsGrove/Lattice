<script>
	import { tick, untrack, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import TableOfContents from './TableOfContents.svelte';
	import MobileTOC from './MobileTOC.svelte';
	import GutterItem from './GutterItem.svelte';
	import {
		getAnchorKey,
		getUniqueAnchors,
		getAnchorLabel,
		getItemsForAnchor,
		getOrphanItems,
		findAnchorElement,
		parseAnchor
	} from '$lib/utils/gutter.js';
	import '$lib/styles/content.css';

	// Constants for positioning calculations
	const MIN_GAP = 16; // Minimum gap between items in pixels
	const BOTTOM_PADDING = 32; // Padding from bottom of content
	const HIDDEN_POSITION = -9999; // Position for hidden items
	const DEBOUNCE_DELAY = 100; // Debounce delay for resize in ms

	let {
		content = '',
		gutterContent = [],
		headers = [],
		showTableOfContents = true,
		children
	} = $props();

	// References to mobile gutter containers for each anchor
	let mobileGutterRefs = $state({});

	// Track content height for overflow detection
	let contentBodyElement = $state();
	let contentHeight = $state(0);
	let overflowingAnchorKeys = $state([]);

	// Gutter positioning state
	let gutterElement = $state();
	let itemPositions = $state({});
	let anchorGroupElements = $state({});

	// Compute unique anchors once as a derived value (performance optimization)
	let uniqueAnchors = $derived(getUniqueAnchors(gutterContent));
	let orphanItems = $derived(getOrphanItems(gutterContent, headers));

	// Check if we have content for gutters
	let hasLeftGutter = $derived(gutterContent && gutterContent.length > 0);
	let hasRightGutter = $derived(showTableOfContents && headers && headers.length > 0);
	let hasGutters = $derived(hasLeftGutter || hasRightGutter);
	let hasOverflow = $derived(overflowingAnchorKeys.length > 0);

	// Helper to get anchor key with headers context
	function getKey(anchor) {
		return getAnchorKey(anchor, headers);
	}

	// Get items for a specific anchor
	function getItems(anchor) {
		return getItemsForAnchor(gutterContent, anchor);
	}

	// Generate unique key for a gutter item
	function getItemKey(item, index) {
		// Combine item properties to create a unique identifier
		const parts = [
			item.type || 'unknown',
			item.file || item.src || item.url || '',
			item.anchor || '',
			index.toString()
		];
		return parts.join('-');
	}

	/**
	 * Calculate positions based on anchor locations, with collision detection
	 * Uses getBoundingClientRect() for accurate positioning regardless of offset parent chains
	 */
	async function updatePositions() {
		if (!gutterElement || !contentBodyElement) return;

		await tick(); // Wait for DOM to update

		// Use getBoundingClientRect for accurate relative positioning
		// This works regardless of offset parent chains and CSS transforms
		const gutterRect = gutterElement.getBoundingClientRect();

		let lastBottom = 0; // Track the bottom edge of the last positioned item
		const newOverflowingAnchors = [];
		const newPositions = { ...itemPositions };

		// Sort anchors by their position in the document
		const anchorPositions = uniqueAnchors.map(anchor => {
			const el = findAnchorElement(anchor, contentBodyElement, headers);
			if (!el && import.meta.env.DEV) {
				console.warn(`Anchor element not found for: ${anchor}`);
			}
			// Use getBoundingClientRect for consistent positioning
			const elRect = el ? el.getBoundingClientRect() : null;
			return {
				anchor,
				key: getKey(anchor),
				element: el,
				elementRect: elRect,
				top: elRect ? elRect.top : Infinity
			};
		}).sort((a, b) => a.top - b.top);

		anchorPositions.forEach(({ anchor, key, element, elementRect }) => {
			const groupEl = anchorGroupElements[key];

			if (element && elementRect && groupEl) {
				// Calculate position relative to the gutter element's top
				// This accounts for any content above the content-body (headers, etc.)
				let desiredTop = elementRect.top - gutterRect.top;

				// Get the height of this gutter group
				const groupHeight = groupEl.offsetHeight;

				// Check for collision with previous item
				if (desiredTop < lastBottom + MIN_GAP) {
					// Push down to avoid overlap
					desiredTop = lastBottom + MIN_GAP;
				}

				// Check if this item would overflow past the content
				const effectiveContentHeight = contentHeight > 0 ? contentHeight : Infinity;
				if (desiredTop + groupHeight > effectiveContentHeight - BOTTOM_PADDING) {
					// This item overflows - mark it and hide it in the gutter
					newOverflowingAnchors.push(key);
					newPositions[key] = HIDDEN_POSITION;
				} else {
					newPositions[key] = desiredTop;
					// Update lastBottom for next iteration
					lastBottom = desiredTop + groupHeight;
				}
			} else if (groupEl) {
				// Element not found - hide this group
				newPositions[key] = HIDDEN_POSITION;
			}
		});

		// Update state with new objects (idiomatic Svelte 5)
		itemPositions = newPositions;
		overflowingAnchorKeys = newOverflowingAnchors;
	}

	// Setup resize listener on mount with proper cleanup
	onMount(() => {
		let resizeTimeoutId;
		const handleResize = () => {
			clearTimeout(resizeTimeoutId);
			resizeTimeoutId = setTimeout(() => {
				requestAnimationFrame(updatePositions);
			}, DEBOUNCE_DELAY);
		};

		window.addEventListener('resize', handleResize);
		return () => {
			clearTimeout(resizeTimeoutId);
			window.removeEventListener('resize', handleResize);
		};
	});

	// Setup copy button functionality for code blocks
	onMount(() => {
		const handleCopyClick = async (event) => {
			const button = event.currentTarget;
			const codeText = button.getAttribute('data-code');

			if (!codeText) return;

			try {
				// Decode HTML entities back to original text
				const textarea = document.createElement('textarea');
				textarea.innerHTML = codeText;
				const decodedText = textarea.value;

				await navigator.clipboard.writeText(decodedText);

				// Update button text and style to show success
				const copyText = button.querySelector('.copy-text');
				const originalText = copyText.textContent;
				copyText.textContent = 'Copied!';
				button.classList.add('copied');

				// Reset after 2 seconds
				setTimeout(() => {
					copyText.textContent = originalText;
					button.classList.remove('copied');
				}, 2000);
			} catch (err) {
				console.error('Failed to copy code:', err);
				const copyText = button.querySelector('.copy-text');
				copyText.textContent = 'Failed';
				setTimeout(() => {
					copyText.textContent = 'Copy';
				}, 2000);
			}
		};

		// Attach event listeners to all copy buttons
		const copyButtons = document.querySelectorAll('.code-block-copy');
		copyButtons.forEach(button => {
			button.addEventListener('click', handleCopyClick);
		});

		// Cleanup
		return () => {
			copyButtons.forEach(button => {
				button.removeEventListener('click', handleCopyClick);
			});
		};
	});

	// Handle initial positioning and re-calculate when dependencies change
	$effect(() => {
		// Explicitly reference dependencies to track changes
		gutterContent;
		headers;
		contentHeight;
		uniqueAnchors;

		// Use requestAnimationFrame for smoother updates
		requestAnimationFrame(updatePositions);
	});

	// Add IDs to headers and position mobile gutter items
	$effect(() => {
		// Track moved elements for cleanup
		const movedElements = [];

		untrack(() => {
			if (!contentBodyElement) return;

			// First, add IDs to headers
			if (headers && headers.length > 0) {
				const headerElements = contentBodyElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
				headerElements.forEach((el) => {
					const text = el.textContent.trim();
					const matchingHeader = headers.find(h => h.text === text);
					if (matchingHeader) {
						el.id = matchingHeader.id;
					}
				});
			}

			// Position mobile gutter items for all anchor types
			for (const anchor of uniqueAnchors) {
				const anchorKey = getKey(anchor);
				const mobileGutterEl = mobileGutterRefs[anchorKey];
				if (!mobileGutterEl || mobileGutterEl.children.length === 0) continue;

				// Track original parent for cleanup
				const originalParent = mobileGutterEl.parentElement;
				const originalNextSibling = mobileGutterEl.nextSibling;

				const targetEl = findAnchorElement(anchor, contentBodyElement, headers);

				if (targetEl) {
					targetEl.insertAdjacentElement('afterend', mobileGutterEl);
					movedElements.push({ element: mobileGutterEl, originalParent, originalNextSibling });
				}
			}
		});

		// Cleanup: restore moved elements to their original positions
		return () => {
			for (const { element, originalParent, originalNextSibling } of movedElements) {
				if (originalParent && element.parentElement !== originalParent) {
					if (originalNextSibling) {
						originalParent.insertBefore(element, originalNextSibling);
					} else {
						originalParent.appendChild(element);
					}
				}
			}
		};
	});

	// Track content height (only the content-body to avoid feedback loop with overflow section)
	$effect(() => {
		if (contentBodyElement) {
			const updateHeight = () => {
				// Get the bottom of content-body relative to the article
				const rect = contentBodyElement.getBoundingClientRect();
				const articleRect = contentBodyElement.closest('.content-article')?.getBoundingClientRect();
				if (articleRect) {
					contentHeight = rect.bottom - articleRect.top;
				} else {
					contentHeight = contentBodyElement.offsetTop + contentBodyElement.offsetHeight;
				}
			};
			updateHeight();

			// Create ResizeObserver to track height changes
			const observer = new ResizeObserver(updateHeight);
			observer.observe(contentBodyElement);

			return () => observer.disconnect();
		}
	});

	// Get items for overflowing anchors with reference numbers
	function getOverflowItems() {
		const items = [];
		let refNum = 1;
		for (const anchorKey of overflowingAnchorKeys) {
			// Find the original anchor string that matches this key
			const anchor = uniqueAnchors.find(a => getKey(a) === anchorKey);
			if (anchor) {
				const anchorItems = getItems(anchor);
				const label = getAnchorLabel(anchor);
				items.push({ anchorKey, label, items: anchorItems, refNum });
				refNum++;
			}
		}
		return items;
	}

	// Inject reference markers into content HTML for overflowing items
	function injectReferenceMarkers(html, overflowKeys) {
		if (!overflowKeys || overflowKeys.length === 0 || typeof window === 'undefined') {
			return html;
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		let refNum = 1;
		for (const anchorKey of overflowKeys) {
			const anchor = uniqueAnchors.find(a => getKey(a) === anchorKey);
			if (!anchor) continue;

			const parsed = parseAnchor(anchor);
			let targetEl = null;

			switch (parsed.type) {
				case 'header': {
					const headerText = anchor.replace(/^#+\s*/, '');
					// Find header by text content
					const allHeaders = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6');
					for (const h of allHeaders) {
						if (h.textContent.trim() === headerText) {
							targetEl = h;
							break;
						}
					}
					break;
				}
				case 'paragraph': {
					const paragraphs = doc.body.querySelectorAll(':scope > p');
					const index = parsed.value - 1;
					if (index >= 0 && index < paragraphs.length) {
						targetEl = paragraphs[index];
					}
					break;
				}
				case 'tag': {
					targetEl = doc.body.querySelector(`[data-anchor="${parsed.value}"]`);
					break;
				}
			}

			if (targetEl) {
				// Create reference marker
				const marker = doc.createElement('sup');
				marker.className = 'gutter-ref-marker';
				marker.id = `ref-${refNum}`;

				const link = doc.createElement('a');
				link.href = `#overflow-${refNum}`;
				link.textContent = refNum;
				link.title = `See gutter content for: ${getAnchorLabel(anchor)}`;

				marker.appendChild(link);

				// Insert marker based on element type
				if (parsed.type === 'header') {
					// Insert after header text
					targetEl.appendChild(doc.createTextNode(' '));
					targetEl.appendChild(marker);
				} else {
					// Insert at start of paragraph/tag element
					targetEl.insertBefore(marker, targetEl.firstChild);
					targetEl.insertBefore(doc.createTextNode(' '), marker.nextSibling);
				}
			}

			refNum++;
		}

		return doc.body.innerHTML;
	}

	// Derive content with reference markers injected
	let processedContent = $derived(injectReferenceMarkers(content, overflowingAnchorKeys));

	// Sanitize HTML content to prevent XSS attacks (browser-only for SSR compatibility)
	let DOMPurify = $state(null);

	// Load DOMPurify only in browser
	onMount(async () => {
		if (browser) {
			const module = await import('isomorphic-dompurify');
			DOMPurify = module.default;
		}
	});

	let sanitizedContent = $derived(
		DOMPurify
			? DOMPurify.sanitize(processedContent, {
					ALLOWED_TAGS: [
						// Headings
						'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
						// Block elements
						'p', 'blockquote', 'pre', 'hr', 'br', 'div',
						// Lists
						'ul', 'ol', 'li', 'dl', 'dt', 'dd',
						// Inline elements
						'a', 'span', 'code', 'strong', 'em', 'b', 'i', 'u',
						'sup', 'sub', 'del', 'ins', 'mark', 'small', 'abbr',
						'kbd', 'samp', 'var', 'q', 's',
						// Tables
						'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
						// Media
						'img', 'figure', 'figcaption', 'picture', 'source',
						// Forms (for task lists)
						'input', 'label',
						// Code block copy buttons
						'button', 'svg', 'path', 'rect', 'g', 'line', 'circle', 'polyline'
					],
					ALLOWED_ATTR: [
						// Links and media
						'href', 'src', 'alt', 'title', 'target', 'rel',
						// Styling and identification
						'class', 'id', 'style',
						// Data attributes for custom functionality
						'data-anchor', 'data-language', 'data-line-numbers', 'data-code',
						// Accessibility
						'aria-label', 'aria-hidden', 'role',
						// Form elements (for task lists)
						'type', 'checked', 'disabled',
						// SVG attributes
						'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
						'stroke-linejoin', 'd', 'width', 'height', 'x', 'y', 'x1', 'y1',
						'x2', 'y2', 'r', 'cx', 'cy', 'points', 'xmlns',
						// Tables
						'colspan', 'rowspan', 'scope'
					],
					ALLOW_DATA_ATTR: true
			  })
			: processedContent
	);
</script>

<div class="content-layout"
     class:has-gutters={hasGutters}
     class:has-left-gutter={hasLeftGutter}
     class:has-right-gutter={hasRightGutter}
     class:has-both-gutters={hasLeftGutter && hasRightGutter}>
	<!-- Left Gutter - Comments/Photos/Emojis -->
	{#if hasLeftGutter}
		<div class="left-gutter-container desktop-only">
			<aside class="left-gutter" bind:this={gutterElement}>
				<!-- Show orphan items at the top -->
				{#each orphanItems as item, index (getItemKey(item, index))}
					<div class="gutter-item-wrapper">
						<GutterItem {item} />
					</div>
				{/each}

				<!-- Show items positioned by anchor -->
				{#each uniqueAnchors as anchor (anchor)}
					{@const anchorKey = getKey(anchor)}
					{@const anchorItems = getItems(anchor)}
					{#if anchorItems.length > 0}
						<div
							class="anchor-group"
							data-for-anchor={anchorKey}
							style="top: {itemPositions[anchorKey] || 0}px"
							bind:this={anchorGroupElements[anchorKey]}
						>
							{#each anchorItems as item, index (getItemKey(item, index))}
								<GutterItem {item} />
							{/each}
						</div>
					{/if}
				{/each}
			</aside>
		</div>
	{/if}

	<!-- Main Content -->
	<article class="content-article">
		<!-- Custom header content via children/slot -->
		{#if children}
			{@render children()}
		{/if}

		<!-- Mobile gutter: orphan items at top (no matching anchor) -->
		{#if hasLeftGutter && orphanItems.length > 0}
			<div class="mobile-gutter-content">
				{#each orphanItems as item, index (getItemKey(item, index))}
					<GutterItem {item} />
				{/each}
			</div>
		{/if}

		<!-- Mobile gutter containers for each anchor (will be moved into position) -->
		{#if hasLeftGutter}
			{#each uniqueAnchors as anchor (anchor)}
				{@const anchorKey = getKey(anchor)}
				{@const anchorItems = getItems(anchor)}
				{#if anchorItems.length > 0}
					<div
						class="mobile-gutter-content mobile-gutter-inline"
						bind:this={mobileGutterRefs[anchorKey]}
					>
						{#each anchorItems as item, index (getItemKey(item, index))}
							<GutterItem {item} />
						{/each}
					</div>
				{/if}
			{/each}
		{/if}

		<div class="prose prose-lg dark:prose-invert max-w-none content-body" bind:this={contentBodyElement}>
			{@html sanitizedContent}
		</div>

		<!-- Overflow gutter items rendered inline -->
		{#if hasOverflow}
			<div class="overflow-gutter-section">
				<div class="overflow-divider"></div>
				{#each getOverflowItems() as group (group.anchorKey)}
					<div class="overflow-group">
						<h4 class="overflow-anchor-label">From: {group.label}</h4>
						{#each group.items as item, index (getItemKey(item, index))}
							<GutterItem {item} />
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</article>

	<!-- Right Gutter - Table of Contents -->
	{#if hasRightGutter}
		<div class="right-gutter-container desktop-only">
			<TableOfContents {headers} />
		</div>
	{/if}
</div>

<!-- Mobile TOC Button -->
{#if hasRightGutter}
	<MobileTOC {headers} />
{/if}

<style>
	/* Left gutter styles */
	.left-gutter {
		position: relative;
		padding: 1rem;
		min-height: 100%;
	}
	.gutter-item-wrapper {
		margin-bottom: 1rem;
	}
	.anchor-group {
		position: absolute;
		left: 1rem;
		right: 1rem;
	}
	/* Scrollbar styling */
	.left-gutter::-webkit-scrollbar {
		width: 4px;
	}
	.left-gutter::-webkit-scrollbar-track {
		background: transparent;
	}
	.left-gutter::-webkit-scrollbar-thumb {
		background: var(--light-text-secondary);
		border-radius: 2px;
	}
	:global(.dark) .left-gutter::-webkit-scrollbar-thumb {
		background: var(--light-border-light);
	}
	/* Overflow gutter section */
	.overflow-gutter-section {
		margin-top: 3rem;
		padding-top: 2rem;
	}
	.overflow-divider {
		height: 1px;
		background: linear-gradient(to right, transparent, var(--light-border-primary), transparent);
		margin-bottom: 2rem;
	}
	:global(.dark) .overflow-divider {
		background: linear-gradient(to right, transparent, var(--light-border-primary), transparent);
	}
	.overflow-group {
		margin-bottom: 2rem;
	}
	.overflow-anchor-label {
		font-size: 0.85rem;
		color: var(--light-text-light);
		margin: 0 0 0.75rem 0;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	:global(.dark) .overflow-anchor-label {
		color: #666;
	}
	/* Reference number in overflow label */
	.overflow-ref-num {
		color: #2c5f2d;
		font-weight: 600;
		margin-right: 0.5rem;
	}
	:global(.dark) .overflow-ref-num {
		color: var(--accent-success);
	}
	/* Reference markers in content (global because they're in @html) */
	:global(.gutter-ref-marker) {
		font-size: 0.75em;
		vertical-align: super;
		line-height: 0;
		margin-left: 0.1em;
	}
	:global(.gutter-ref-marker a) {
		color: #2c5f2d;
		text-decoration: none;
		font-weight: 600;
		padding: 0.1em 0.3em;
		background: rgba(44, 95, 45, 0.1);
		border-radius: 3px;
		transition: background-color 0.2s ease, color 0.2s ease;
	}
	:global(.dark .gutter-ref-marker a) {
		color: var(--accent-success);
		background: rgba(92, 184, 95, 0.15);
	}
	:global(.gutter-ref-marker a:hover) {
		background: rgba(44, 95, 45, 0.2);
		color: #4a9d4f;
	}
	:global(.dark .gutter-ref-marker a:hover) {
		background: rgba(92, 184, 95, 0.25);
		color: var(--accent-success-light);
	}
	/* Smooth scroll target highlighting */
	.overflow-group:target {
		animation: highlight-flash 1.5s ease-out;
	}
	@keyframes highlight-flash {
		0% {
			background-color: rgba(44, 95, 45, 0.2);
		}
		100% {
			background-color: transparent;
		}
	}
	:global(.dark) .overflow-group:target {
		animation: highlight-flash-dark 1.5s ease-out;
	}
	@keyframes highlight-flash-dark {
		0% {
			background-color: rgba(92, 184, 95, 0.2);
		}
		100% {
			background-color: transparent;
		}
	}
</style>
