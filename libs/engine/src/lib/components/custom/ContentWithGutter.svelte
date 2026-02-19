<script lang="ts">
	import { untrack, mount, unmount } from "svelte";
	import { browser } from "$app/environment";
	import TableOfContents from "./TableOfContents.svelte";
	import MobileTOC from "./MobileTOC.svelte";
	import GutterItem from "./GutterItem.svelte";
	import {
		getAnchorKey,
		getUniqueAnchors,
		getItemsForAnchor,
		getOrphanItems,
		findAnchorElement,
		type GutterItem as GutterItemType,
		type Header,
	} from "$lib/utils/gutter";
	import type { HumProvider } from "$lib/ui/components/content/hum/types";
	import "$lib/styles/content.css";

	let {
		content = "",
		gutterContent = [] as GutterItemType[],
		headers = [] as Header[],
		showTableOfContents = true,
		children,
	} = $props();

	// References to inline gutter containers for each anchor
	let mobileGutterRefs = $state<Record<string, HTMLElement>>({});

	// Reference to the content body for DOM insertion
	let contentBodyElement = $state<HTMLElement | undefined>();

	// Compute unique anchors once as a derived value (performance optimization)
	let uniqueAnchors = $derived(getUniqueAnchors(gutterContent));
	let orphanItems = $derived(getOrphanItems(gutterContent, headers));

	// Check if we have content for gutters
	let hasLeftGutter = $derived(gutterContent && gutterContent.length > 0);
	let hasRightGutter = $derived(showTableOfContents && headers && headers.length > 0);

	/**
	 * Helper to get anchor key with headers context
	 */
	function getKey(anchor: string) {
		return getAnchorKey(anchor, headers);
	}

	/**
	 * Get items for a specific anchor
	 */
	function getItems(anchor: string) {
		return getItemsForAnchor(gutterContent, anchor);
	}

	/**
	 * Generate unique key for a gutter item
	 */
	function getItemKey(item: GutterItemType, index: number): string {
		const parts = [
			item.type || "unknown",
			item.file || item.src || item.url || "",
			item.anchor || "",
			index.toString(),
		];
		return parts.join("-");
	}

	// Setup copy button functionality for code blocks
	$effect(() => {
		const handleCopyClick = async (event: Event) => {
			const button = event.currentTarget as HTMLElement;
			const codeText = button.getAttribute("data-code");

			if (!codeText) return;

			try {
				// Decode HTML entities back to original text
				const textarea = document.createElement("textarea");
				textarea.innerHTML = codeText;
				const decodedText = textarea.value;

				await navigator.clipboard.writeText(decodedText);

				// Update button text and style to show success
				const copyText = button.querySelector(".copy-text");
				const originalText = copyText?.textContent || "Copy";
				if (copyText) copyText.textContent = "Copied!";
				button.classList.add("copied");

				// Reset after 2 seconds
				setTimeout(() => {
					if (copyText) copyText.textContent = originalText;
					button.classList.remove("copied");
				}, 2000);
			} catch (err) {
				console.error("Failed to copy code:", err);
				const copyText = button.querySelector(".copy-text");
				if (copyText) copyText.textContent = "Failed";
				setTimeout(() => {
					if (copyText) copyText.textContent = "Copy";
				}, 2000);
			}
		};

		// Attach event listeners to all copy buttons
		const copyButtons = document.querySelectorAll(".code-block-copy");
		copyButtons.forEach((button) => {
			button.addEventListener("click", handleCopyClick);
		});

		// Cleanup
		return () => {
			copyButtons.forEach((button) => {
				button.removeEventListener("click", handleCopyClick);
			});
		};
	});

	// Hum: Hydrate music link preview placeholders
	$effect(() => {
		if (!browser) return;

		// Wait for content to render
		const contentEl = contentBodyElement;
		if (!contentEl) return;

		const humCards = contentEl.querySelectorAll(".hum-card[data-hum-url]");
		if (humCards.length === 0) return;

		const cleanups: Array<() => void> = [];

		humCards.forEach((card) => {
			const url = card.getAttribute("data-hum-url");
			const provider = (card.getAttribute("data-hum-provider") || "unknown") as HumProvider;
			if (!url || card.hasAttribute("data-hum-mounted")) return;

			// Mark as mounted to avoid double-hydration
			card.setAttribute("data-hum-mounted", "true");

			// Dynamically import and mount the HumCard component
			import("$lib/ui/components/content/hum/HumCard.svelte")
				.then((module) => {
					// Clear the fallback link
					card.innerHTML = "";

					const component = mount(module.default, {
						target: card as HTMLElement,
						props: { url, provider },
					});

					cleanups.push(() => {
						unmount(component);
					});
				})
				.catch((err) => {
					console.warn("[Hum] Failed to mount card:", err);
				});
		});

		return () => {
			cleanups.forEach((fn) => fn());
		};
	});

	// Curios: Hydrate ::curio:: directive placeholders into Svelte components
	$effect(() => {
		if (!browser) return;

		const contentEl = contentBodyElement;
		if (!contentEl) return;

		const curioEls = contentEl.querySelectorAll(".grove-curio[data-grove-curio]");
		if (curioEls.length === 0) return;

		const cleanups: Array<() => void> = [];

		// Allowlist of valid curio names — prevents arbitrary component loading
		const VALID_CURIOS = new Set([
			"guestbook",
			"hitcounter",
			"poll",
			"nowplaying",
			"moodring",
			"badges",
			"blogroll",
			"webring",
			"linkgarden",
			"activitystatus",
			"statusbadges",
			"artifacts",
			"bookmarkshelf",
		]);

		curioEls.forEach((el) => {
			const curioName = el.getAttribute("data-grove-curio");
			const curioArg = el.getAttribute("data-curio-arg") || "";
			if (!curioName || el.hasAttribute("data-curio-mounted")) return;

			// Validate curio name against allowlist (security: prevents path traversal)
			if (!VALID_CURIOS.has(curioName)) {
				console.warn(`[Curio] Unknown curio: ${curioName}`);
				return;
			}

			el.setAttribute("data-curio-mounted", "true");

			// Capitalize for component filename: hitcounter → Hitcounter
			const componentName = curioName.charAt(0).toUpperCase() + curioName.slice(1);

			// Dynamic import of the curio component
			import(`$lib/ui/components/content/curios/Curio${componentName}.svelte`)
				.then((module) => {
					el.innerHTML = "";
					const component = mount(module.default, {
						target: el as HTMLElement,
						props: { arg: curioArg },
					});
					cleanups.push(() => unmount(component));
				})
				.catch((err) => {
					console.warn(`[Curio] Failed to mount ${curioName}:`, err);
					el.innerHTML = '<span class="grove-curio-error">Curio unavailable</span>';
				});
		});

		return () => {
			cleanups.forEach((fn) => fn());
		};
	});

	// Add IDs to headers and position inline gutter items via DOM insertion
	$effect(() => {
		// Track contentBodyElement outside untrack() so effect re-runs when element becomes available
		const contentEl = contentBodyElement;
		if (!contentEl) return;

		// Track dependencies that should trigger re-positioning of inline gutter items.
		// These are read here (outside untrack) so changes cause the effect to re-run,
		// but the actual DOM manipulation happens inside untrack() to avoid loops.

		uniqueAnchors;

		headers;

		sanitizedContent;

		// Track moved elements for cleanup
		const movedElements: Array<{
			element: HTMLElement;
			originalParent: HTMLElement | null;
			originalNextSibling: Node | null;
		}> = [];

		untrack(() => {
			// First, add IDs to headers
			if (headers && headers.length > 0) {
				const headerElements = (contentEl as HTMLElement).querySelectorAll(
					"h1, h2, h3, h4, h5, h6",
				);
				headerElements.forEach((el: Element) => {
					const text = (el as HTMLElement).textContent?.trim() || "";
					const matchingHeader = headers.find((h: Header) => h.text === text);
					if (matchingHeader) {
						(el as HTMLElement).id = matchingHeader.id;
					}
				});
			}

			// Position inline gutter items for all anchor types
			for (const anchor of uniqueAnchors) {
				const anchorKey = getKey(anchor);
				const mobileGutterEl = mobileGutterRefs[anchorKey];
				if (!mobileGutterEl || mobileGutterEl.children.length === 0) continue;

				// Track original parent for cleanup
				const originalParent = mobileGutterEl.parentElement;
				const originalNextSibling = mobileGutterEl.nextSibling;

				const targetEl = findAnchorElement(anchor, contentEl as HTMLElement, headers);

				if (targetEl) {
					targetEl.insertAdjacentElement("afterend", mobileGutterEl);
					movedElements.push({ element: mobileGutterEl, originalParent, originalNextSibling });
				} else {
					// Fallback: anchor not found - log warning and position after first heading or at end
					if (import.meta.env.DEV) {
						const availableAnchors = Array.from(contentEl.querySelectorAll("[id]")).map(
							(el) => el.id,
						);
						console.warn(`[ContentWithGutter] Inline gutter anchor not found: ${anchor}`, {
							anchorKey,
							availableAnchors: availableAnchors.length > 0 ? availableAnchors : "none",
						});
					}

					// Fallback positioning: after first heading or at end of content
					const fallbackAnchor =
						contentEl.querySelector("h1, h2, h3, h4, h5, h6") || contentEl.lastElementChild;
					if (fallbackAnchor && fallbackAnchor instanceof HTMLElement) {
						fallbackAnchor.insertAdjacentElement("afterend", mobileGutterEl);
						movedElements.push({ element: mobileGutterEl, originalParent, originalNextSibling });
					}
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

	// Sanitize HTML content to prevent XSS attacks (browser-only for SSR compatibility)

	let DOMPurify = $state<any>(null);
	let isPurifyReady = $state(true);

	// Load DOMPurify only in browser (avoids jsdom dependency for SSR)
	// Content is already sanitized server-side, so we mark ready immediately
	// and re-sanitize once DOMPurify loads (defensive, usually a no-op)
	$effect(() => {
		if (browser) {
			// Mark ready immediately so we don't block rendering
			// Content was already sanitized on the server
			isPurifyReady = true;

			// Load DOMPurify in the background for additional client-side sanitization
			(async () => {
				try {
					const module = await import("dompurify");
					DOMPurify = module.default;
				} catch (err) {
					console.warn("DOMPurify failed to load, using server-sanitized content:", err);
				}
			})();
		}
	});

	let sanitizedContent = $derived(
		DOMPurify && typeof DOMPurify.sanitize === "function"
			? DOMPurify.sanitize(content, {
					ALLOWED_TAGS: [
						// Headings
						"h1",
						"h2",
						"h3",
						"h4",
						"h5",
						"h6",
						// Block elements
						"p",
						"blockquote",
						"pre",
						"hr",
						"br",
						"div",
						// Lists
						"ul",
						"ol",
						"li",
						"dl",
						"dt",
						"dd",
						// Inline elements
						"a",
						"span",
						"code",
						"strong",
						"em",
						"b",
						"i",
						"u",
						"sup",
						"sub",
						"del",
						"ins",
						"mark",
						"small",
						"abbr",
						"kbd",
						"samp",
						"var",
						"q",
						"s",
						// Tables
						"table",
						"thead",
						"tbody",
						"tfoot",
						"tr",
						"th",
						"td",
						"caption",
						// Media
						"img",
						"figure",
						"figcaption",
						"picture",
						"source",
						// Forms (for task lists)
						"input",
						"label",
						// Code block copy buttons
						"button",
						"svg",
						"path",
						"rect",
						"g",
						"line",
						"circle",
						"polyline",
					],
					ALLOWED_ATTR: [
						// Links and media
						"href",
						"src",
						"alt",
						"title",
						"target",
						"rel",
						// Styling and identification
						"class",
						"id",
						"style",
						// ONLY allow specific safe data attributes
						"data-anchor",
						"data-language",
						"data-line-numbers",
						"data-code",
						// Hum: music link preview placeholders
						"data-hum-url",
						"data-hum-provider",
						// Curios: ::curio-name[]:: directive placeholders
						"data-grove-curio",
						"data-curio-arg",
						// Accessibility
						"aria-label",
						"aria-hidden",
						"role",
						// Form elements (for task lists)
						"type",
						"checked",
						"disabled",
						// SVG attributes
						"viewBox",
						"fill",
						"stroke",
						"stroke-width",
						"stroke-linecap",
						"stroke-linejoin",
						"d",
						"width",
						"height",
						"x",
						"y",
						"x1",
						"y1",
						"x2",
						"y2",
						"r",
						"cx",
						"cy",
						"points",
						"xmlns",
						// Tables
						"colspan",
						"rowspan",
						"scope",
					],
					// SECURITY FIX: Disable blanket data attributes to prevent attribute-based XSS
					// We explicitly allow only safe data attributes in ALLOWED_ATTR above
					ALLOW_DATA_ATTR: false,
				})
			: content,
	);
</script>

<div
	class="content-layout"
	class:has-gutters={hasRightGutter}
	class:has-right-gutter={hasRightGutter}
>
	<!-- Main Content -->
	<article class="content-article">
		<!-- Custom header content via children/slot -->
		{#if children}
			{@render children()}
		{/if}

		<!-- Orphan items at top (no matching anchor) -->
		{#if hasLeftGutter && orphanItems.length > 0}
			<div class="mobile-gutter-content">
				{#each orphanItems as item, index (getItemKey(item, index))}
					<GutterItem {item} />
				{/each}
			</div>
		{/if}

		<!-- Inline gutter containers for each anchor (will be moved into position via DOM insertion) -->
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

		<div
			class="prose prose-lg dark:prose-invert max-w-none content-body"
			bind:this={contentBodyElement}
		>
			{#if browser && !isPurifyReady}
				<!-- Loading state: show placeholder while DOMPurify loads (prevents race condition) -->
				<div style="opacity: 0.5;">Loading content...</div>
			{:else}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitized HTML content -->
				{@html sanitizedContent}
			{/if}
		</div>
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
