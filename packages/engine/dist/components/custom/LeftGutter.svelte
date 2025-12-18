<script>
	import { tick } from 'svelte';
	import GutterItem from './GutterItem.svelte';

	/**
	 * @typedef {{ type?: string; file?: string; src?: string; url?: string; anchor?: string; content?: string; [key: string]: unknown }} GutterItemType
	 * @typedef {{ id: string; text: string; level?: number }} HeaderType
	 */

	let {
		items = /** @type {GutterItemType[]} */ ([]),
		headers = /** @type {HeaderType[]} */ ([]),
		contentHeight = 0,
		onOverflowChange = /** @type {(anchors: string[]) => void} */ (() => {})
	} = $props();

	/** @type {HTMLElement | undefined} */
	let gutterElement = $state();
	/** @type {Record<string, number>} */
	let itemPositions = $state({});
	/** @type {Record<string, HTMLElement>} */
	let anchorGroupElements = $state({});
	/** @type {string[]} */
	let overflowingAnchors = $state([]);

	/**
	 * Parse anchor string to determine anchor type and value
	 * @param {string | undefined} anchor
	 * @returns {{ type: string; value: string | number | null }}
	 */
	function parseAnchor(anchor) {
		if (!anchor) {
			return { type: 'none', value: null };
		}

		// Check for paragraph anchor: "paragraph:N"
		const paragraphMatch = anchor.match(/^paragraph:(\d+)$/);
		if (paragraphMatch) {
			return { type: 'paragraph', value: parseInt(paragraphMatch[1], 10) };
		}

		// Check for tag anchor: "anchor:tagname"
		const tagMatch = anchor.match(/^anchor:(\w+)$/);
		if (tagMatch) {
			return { type: 'tag', value: tagMatch[1] };
		}

		// Check for header anchor: "## Header Text"
		const headerMatch = anchor.match(/^(#{1,6})\s+(.+)$/);
		if (headerMatch) {
			return { type: 'header', value: anchor };
		}

		// Unknown format - treat as header for backwards compatibility
		return { type: 'header', value: anchor };
	}

	/**
	 * Generate a unique key for an anchor (used for grouping and positioning)
	 * @param {string} anchor
	 * @returns {string}
	 */
	function getAnchorKey(anchor) {
		const parsed = parseAnchor(anchor);
		switch (parsed.type) {
			case 'header':
				// For headers, use the header ID
				const headerText = anchor.replace(/^#+\s*/, '');
				const header = headers.find((/** @type {HeaderType} */ h) => h.text === headerText);
				return header ? `header:${header.id}` : `header:${anchor}`;
			case 'paragraph':
				return `paragraph:${parsed.value}`;
			case 'tag':
				return `tag:${parsed.value}`;
			default:
				return `unknown:${anchor}`;
		}
	}

	/**
	 * Get all unique anchors from items (preserving order)
	 * @returns {string[]}
	 */
	function getUniqueAnchors() {
		const seen = new Set();
		const anchors = [];
		for (const item of items) {
			if (item.anchor && !seen.has(item.anchor)) {
				seen.add(item.anchor);
				anchors.push(item.anchor);
			}
		}
		return anchors;
	}

	/**
	 * Group items by their anchor
	 * @param {string} anchor
	 * @returns {GutterItemType[]}
	 */
	function getItemsForAnchor(anchor) {
		return items.filter((/** @type {GutterItemType} */ item) => item.anchor === anchor);
	}

	/**
	 * Get items that don't have a valid anchor (show at top)
	 * @returns {GutterItemType[]}
	 */
	function getOrphanItems() {
		return items.filter((/** @type {GutterItemType} */ item) => {
			if (!item.anchor) return true;
			const parsed = parseAnchor(item.anchor);
			if (parsed.type === 'header') {
				const headerText = item.anchor.replace(/^#+\s*/, '');
				return !headers.find((/** @type {HeaderType} */ h) => h.text === headerText);
			}
			// Paragraph and tag anchors are valid if they have values
			return parsed.type === 'none';
		});
	}

	/**
	 * Find the DOM element for an anchor
	 * @param {string} anchor
	 * @returns {HTMLElement | null}
	 */
	function findAnchorElement(anchor) {
		const parsed = parseAnchor(anchor);
		const contentEl = document.querySelector('.content-body');
		if (!contentEl) return null;

		switch (parsed.type) {
			case 'header': {
				const headerText = anchor.replace(/^#+\s*/, '');
				const header = headers.find((/** @type {HeaderType} */ h) => h.text === headerText);
				if (header) {
					return document.getElementById(header.id);
				}
				return null;
			}
			case 'paragraph': {
				const paragraphs = contentEl.querySelectorAll('p');
				if (typeof parsed.value !== 'number') return null;
				const index = parsed.value - 1; // Convert to 0-based index
				if (index >= 0 && index < paragraphs.length) {
					return /** @type {HTMLElement} */ (paragraphs[index]);
				}
				return null;
			}
			case 'tag': {
				return /** @type {HTMLElement | null} */ (contentEl.querySelector(`[data-anchor="${parsed.value}"]`));
			}
			default:
				return null;
		}
	}

	// Calculate positions based on anchor locations, with collision detection
	async function updatePositions() {
		if (!gutterElement) return;

		await tick(); // Wait for DOM to update

		const gutterTop = gutterElement.offsetTop;
		const minGap = 16; // Minimum gap between items in pixels
		const bottomPadding = 32; // Padding from bottom of content

		let lastBottom = 0; // Track the bottom edge of the last positioned item
		/** @type {string[]} */
		const newOverflowingAnchors = [];

		// Get all unique anchors that have items
		const anchors = getUniqueAnchors();

		// Sort anchors by their position in the document
		const anchorPositions = anchors.map((/** @type {string} */ anchor) => {
			const el = findAnchorElement(anchor);
			return {
				anchor,
				key: getAnchorKey(anchor),
				element: el,
				top: el ? el.offsetTop : Infinity
			};
		}).sort((/** @type {{ top: number }} */ a, /** @type {{ top: number }} */ b) => a.top - b.top);

		anchorPositions.forEach((/** @type {{ anchor: string; key: string; element: HTMLElement | null; top: number }} */ { anchor, key, element }) => {
			const groupEl = anchorGroupElements[key];

			if (element && groupEl) {
				// Desired position (aligned with anchor element)
				let desiredTop = element.offsetTop - gutterTop;

				// Get the height of this gutter group
				const groupHeight = groupEl.offsetHeight;

				// Check for collision with previous item
				if (desiredTop < lastBottom + minGap) {
					// Push down to avoid overlap
					desiredTop = lastBottom + minGap;
				}

				// Check if this item would overflow past the content
				const effectiveContentHeight = contentHeight > 0 ? contentHeight : Infinity;
				if (desiredTop + groupHeight > effectiveContentHeight - bottomPadding) {
					// This item overflows - mark it and hide it in the gutter
					newOverflowingAnchors.push(key);
					itemPositions[key] = -9999; // Hide off-screen
				} else {
					itemPositions[key] = desiredTop;
					// Update lastBottom for next iteration
					lastBottom = desiredTop + groupHeight;
				}
			} else if (groupEl) {
				// Element not found - hide this group
				itemPositions[key] = -9999;
			}
		});

		// Update overflowing anchors and notify parent
		overflowingAnchors = newOverflowingAnchors;
		onOverflowChange(newOverflowingAnchors);
	}

	$effect(() => {
		// Update on resize
		window.addEventListener('resize', updatePositions);
		return () => {
			window.removeEventListener('resize', updatePositions);
		};
	});

	// Handle initial positioning and re-calculate when items, headers, or contentHeight change
	$effect(() => {
		// Explicitly reference dependencies to track changes
		items;
		headers;
		contentHeight;
		// Delay slightly to allow DOM updates
		const timeout = setTimeout(updatePositions, 150);
		return () => clearTimeout(timeout);
	});
</script>

<aside class="left-gutter" bind:this={gutterElement}>
	{#if items.length > 0}
		<!-- Show orphan items at the top -->
		{#each getOrphanItems() as item, index (index)}
			<div class="gutter-item-wrapper">
				<GutterItem {item} />
			</div>
		{/each}

		<!-- Show items positioned by anchor -->
		{#each getUniqueAnchors() as anchor (anchor)}
			{@const anchorKey = getAnchorKey(anchor)}
			{@const anchorItems = getItemsForAnchor(anchor)}
			{#if anchorItems.length > 0}
				<div
					class="anchor-group"
					data-for-anchor={anchorKey}
					style="top: {itemPositions[anchorKey] || 0}px"
					bind:this={anchorGroupElements[anchorKey]}
				>
					{#each anchorItems as item, index (index)}
						<GutterItem {item} />
					{/each}
				</div>
			{/if}
		{/each}
	{/if}
</aside>

<style>
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
</style>
