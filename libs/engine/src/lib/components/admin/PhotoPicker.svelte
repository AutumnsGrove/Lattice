<script>
	import { GlassCard } from "$lib/ui";
	import { apiRequest } from "$lib/utils/api";
	import { tick } from "svelte";
	import { X, Check, Search, Images, Link, Plus } from "lucide-svelte";

	/**
	 * @typedef {Object} PickerImage
	 * @property {string} key
	 * @property {string} url
	 * @property {number} size
	 * @property {string | null} custom_title
	 * @property {string} parsed_slug
	 */

	/** @type {{ onInsert: (urls: string[]) => void, onClose: () => void, galleryEnabled?: boolean }} */
	let { onInsert, onClose, galleryEnabled = false } = $props();

	/** @type {PickerImage[]} */
	let images = $state([]);
	let loading = $state(true);
	let error = $state(/** @type {string | null} */ (null));
	let searchQuery = $state("");

	/** @type {Set<string>} */
	let selected = $state(new Set());

	let cursor = $state(/** @type {string | null} */ (null));
	let hasMore = $state(false);
	let loadingMore = $state(false);

	// Manual URL input
	let manualUrl = $state("");
	let showManualInput = $state(false);

	// Screen reader announcement for selection changes
	let selectionAnnouncement = $state("");

	/** @type {HTMLInputElement | null} */
	let manualInputRef = $state(null);

	/** @type {HTMLDivElement | null} */
	let panelRef = $state(null);

	// Focus trap: keep Tab cycling within the dialog
	$effect(() => {
		if (!panelRef) return;
		const panel = panelRef;

		/** @param {KeyboardEvent} e */
		function trapFocus(e) {
			if (e.key !== "Tab") return;
			const focusable = panel.querySelectorAll(
				'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			if (focusable.length === 0) return;
			const first = /** @type {HTMLElement} */ (focusable[0]);
			const last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}

		panel.addEventListener("keydown", trapFocus);
		return () => panel.removeEventListener("keydown", trapFocus);
	});

	// Set initial focus on the close button when dialog opens
	$effect(() => {
		if (panelRef) {
			tick().then(() => {
				const first = /** @type {HTMLElement | null} */ (panelRef?.querySelector("button, input"));
				first?.focus();
			});
		}
	});

	// Fetch images on mount (only if gallery graft is enabled)
	$effect(() => {
		if (galleryEnabled) {
			fetchImages();
		} else {
			loading = false;
		}
	});

	// Auto-focus manual input when shown
	$effect(() => {
		if (showManualInput && manualInputRef) {
			manualInputRef.focus();
		}
	});

	async function fetchImages() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({ limit: "50", sortBy: "date-desc" });
			if (searchQuery) params.set("search", searchQuery);
			const result = await apiRequest(`/api/images/list?${params}`);
			images = result.images || [];
			cursor = result.cursor || null;
			hasMore = !!result.truncated;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load photos";
			images = [];
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (!cursor || loadingMore) return;
		loadingMore = true;
		try {
			const params = new URLSearchParams({
				limit: "50",
				sortBy: "date-desc",
				cursor,
			});
			if (searchQuery) params.set("search", searchQuery);
			const result = await apiRequest(`/api/images/list?${params}`);
			images = [...images, ...(result.images || [])];
			cursor = result.cursor || null;
			hasMore = !!result.truncated;
		} catch {
			// silently fail on load-more
		} finally {
			loadingMore = false;
		}
	}

	/** @type {ReturnType<typeof setTimeout> | null} */
	let searchTimer = null;

	function handleSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			cursor = null;
			fetchImages();
		}, 300);
	}

	/** @param {string} url */
	function toggleSelect(url) {
		const next = new Set(selected);
		if (next.has(url)) {
			next.delete(url);
			selectionAnnouncement = "Photo removed from selection";
		} else {
			next.add(url);
			selectionAnnouncement = "Photo added to selection";
		}
		selected = next;
		setTimeout(() => {
			selectionAnnouncement = "";
		}, 1500);
	}

	function addManualUrl() {
		const url = manualUrl.trim();
		if (!url) return;
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
		} catch {
			return;
		}
		const next = new Set(selected);
		next.add(url);
		selected = next;
		manualUrl = "";
		selectionAnnouncement = "URL added to selection";
		setTimeout(() => {
			selectionAnnouncement = "";
		}, 1500);
	}

	/** @param {KeyboardEvent} e */
	function handleManualKeydown(e) {
		if (e.key === "Enter") {
			e.preventDefault();
			addManualUrl();
		}
	}

	/** Arrow key navigation within the photo grid */
	/** @param {KeyboardEvent} e */
	function handleGridKeydown(e) {
		if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
		e.preventDefault();

		const current = document.activeElement;
		if (!current || !panelRef) return;

		const thumbs = /** @type {HTMLElement[]} */ (
			Array.from(panelRef.querySelectorAll(".picker-thumb"))
		);
		const idx = thumbs.indexOf(/** @type {HTMLElement} */ (current));
		if (idx === -1) return;

		// Detect column count from CSS grid
		const colCount = window.innerWidth > 640 ? 4 : window.innerWidth > 480 ? 3 : 2;
		let next = idx;

		if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
		else if (e.key === "ArrowRight") next = Math.min(thumbs.length - 1, idx + 1);
		else if (e.key === "ArrowUp") next = Math.max(0, idx - colCount);
		else if (e.key === "ArrowDown") next = Math.min(thumbs.length - 1, idx + colCount);

		if (next !== idx) thumbs[next]?.focus();
	}

	function handleInsert() {
		onInsert(Array.from(selected));
	}

	/** @param {MouseEvent} e */
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === "Escape") {
			e.stopPropagation();
			onClose();
		}
	}

	let selectedCount = $derived(selected.size);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="photo-picker-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
	<div
		class="photo-picker-panel"
		bind:this={panelRef}
		role="dialog"
		aria-modal="true"
		aria-label="Insert photo"
	>
		<GlassCard variant="frosted">
			<!-- Screen reader live region for selection feedback -->
			<div aria-live="assertive" aria-atomic="true" class="sr-only">{selectionAnnouncement}</div>

			<!-- Header -->
			<div class="picker-header">
				<div class="picker-title">
					<Images size={18} />
					<span>Insert Photo</span>
				</div>
				<button
					type="button"
					class="picker-close"
					onclick={onClose}
					aria-label="Close photo picker"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Manual URL input (always available) -->
			<div class="manual-url-section">
				{#if showManualInput}
					<div class="manual-url-row">
						<Link size={14} class="manual-url-icon" />
						<input
							bind:this={manualInputRef}
							type="url"
							placeholder="https://example.com/image.jpg"
							bind:value={manualUrl}
							onkeydown={handleManualKeydown}
							class="manual-url-input"
							aria-label="Enter image URL to insert"
						/>
						<button
							type="button"
							class="manual-url-add"
							onclick={addManualUrl}
							disabled={!manualUrl.trim()}
							aria-label="Add URL to selection"
						>
							<Plus size={16} />
						</button>
					</div>
				{:else}
					<button type="button" class="manual-url-toggle" onclick={() => (showManualInput = true)}>
						<Link size={14} />
						<span>Paste an image URL</span>
					</button>
				{/if}
			</div>

			<!-- Gallery grid (only if graft enabled) -->
			{#if galleryEnabled}
				<!-- Search -->
				<div class="picker-search">
					<Search size={14} class="search-icon" />
					<input
						type="text"
						placeholder="Search your photos..."
						bind:value={searchQuery}
						oninput={handleSearchInput}
						class="search-input"
						aria-label="Search photos"
					/>
				</div>

				<div class="picker-grid-scroll">
					{#if loading}
						<div class="picker-skeleton-grid" role="status" aria-label="Loading photos">
							<span class="sr-only">Loading photos...</span>
							{#each Array(8) as _, i}
								<div class="skeleton-thumb" aria-hidden="true"></div>
							{/each}
						</div>
					{:else if error}
						<div class="picker-empty" role="status">
							<p class="picker-error">{error}</p>
							<button type="button" class="retry-link" onclick={fetchImages}>Try again</button>
						</div>
					{:else if images.length === 0}
						<div class="picker-empty">
							<Images size={32} class="empty-icon" />
							<p>No photos uploaded yet</p>
							<p class="picker-empty-hint">
								Upload photos in the <a href="/arbor/images">image manager</a>, or paste a URL above
							</p>
						</div>
					{:else}
						<div
							class="picker-grid"
							role="listbox"
							aria-label="Photo gallery — select photos to insert"
							aria-multiselectable="true"
							tabindex="0"
							onkeydown={handleGridKeydown}
						>
							{#each images as image (image.key)}
								<button
									type="button"
									class="picker-thumb"
									class:selected={selected.has(image.url)}
									onclick={() => toggleSelect(image.url)}
									role="option"
									aria-selected={selected.has(image.url)}
									aria-label={image.custom_title || image.parsed_slug}
								>
									<img
										src="{image.url}?w=200&h=150&fit=cover"
										alt={image.custom_title || image.parsed_slug}
										loading="lazy"
									/>
									{#if selected.has(image.url)}
										<div class="thumb-check" aria-hidden="true">
											<Check size={16} />
										</div>
									{/if}
								</button>
							{/each}
						</div>
						{#if hasMore}
							<div class="picker-load-more">
								<button
									type="button"
									class="load-more-btn"
									onclick={loadMore}
									disabled={loadingMore}
								>
									{loadingMore ? "Loading..." : "Load more"}
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- No gallery graft — show friendly message -->
				<div class="picker-empty picker-no-gallery">
					<Images size={28} class="empty-icon" />
					<p>Paste an image URL above to insert it into your post</p>
					<p class="picker-empty-hint">Photo library browsing is available on upgraded plans</p>
				</div>
			{/if}

			<!-- Selected URLs preview -->
			{#if selectedCount > 0}
				<div class="picker-selected-preview" role="status" aria-live="polite">
					{#each Array.from(selected) as url}
						<div class="selected-pill">
							<span class="selected-pill-url" title={url}>{url.split("/").pop()}</span>
							<button
								type="button"
								class="selected-pill-remove"
								onclick={() => toggleSelect(url)}
								aria-label="Remove {url.split('/').pop()} from selection"
							>
								<X size={12} />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Footer -->
			<div class="picker-footer">
				<span class="picker-count">
					{#if selectedCount > 0}
						{selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected
						{#if selectedCount > 1}
							<span class="picker-hint">(will insert as gallery)</span>
						{/if}
					{:else}
						Select or paste photos to insert
					{/if}
				</span>
				<div class="picker-actions">
					<button type="button" class="picker-cancel" onclick={onClose}>Cancel</button>
					<button
						type="button"
						class="picker-insert"
						onclick={handleInsert}
						disabled={selectedCount === 0}
					>
						Insert{#if selectedCount > 0}
							({selectedCount}){/if}
					</button>
				</div>
			</div>
		</GlassCard>
	</div>
</div>

<style>
	/* Screen-reader only utility */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.photo-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.15s ease;
	}
	.photo-picker-panel {
		width: 90%;
		max-width: 680px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.2s ease;
		outline: none;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.photo-picker-backdrop,
		.photo-picker-panel {
			animation: none;
		}
		.skeleton-thumb {
			animation: none;
		}
		.picker-thumb {
			transition: none;
		}
		.picker-thumb img {
			transition: none;
		}
	}

	/* Header */
	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		margin-bottom: 0.75rem;
	}
	.picker-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-foreground, #1a1a1a);
	}
	:global(.dark) .picker-title {
		color: var(--color-foreground-dark, #e0e0e0);
	}
	.picker-close {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem;
		background: transparent;
		border: none;
		color: var(--color-foreground-muted, #666);
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.picker-close:hover {
		background: rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .picker-close:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Manual URL input */
	.manual-url-section {
		margin-bottom: 0.75rem;
	}
	.manual-url-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background: transparent;
		border: 1px dashed rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		color: var(--color-foreground-muted, #666);
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.manual-url-toggle:hover {
		border-color: var(--grove-500, #22c55e);
		color: var(--grove-600, #16a34a);
	}
	:global(.dark) .manual-url-toggle {
		border-color: rgba(255, 255, 255, 0.15);
		color: var(--color-foreground-subtle-dark, #999);
	}
	:global(.dark) .manual-url-toggle:hover {
		border-color: var(--grove-500, #22c55e);
		color: var(--grove-400, #4ade80);
	}
	.manual-url-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	:global(.manual-url-icon) {
		color: var(--color-foreground-subtle, #999);
		flex-shrink: 0;
	}
	.manual-url-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
		color: var(--color-foreground, #1a1a1a);
		outline: none;
		min-width: 0;
		transition: border-color 0.15s ease;
	}
	.manual-url-input:focus {
		border-color: var(--grove-500, #22c55e);
	}
	:global(.dark) .manual-url-input {
		background: rgba(0, 0, 0, 0.2);
		border-color: rgba(255, 255, 255, 0.15);
		color: var(--color-foreground-dark, #e0e0e0);
	}
	.manual-url-add {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem;
		background: var(--grove-500, #22c55e);
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}
	.manual-url-add:hover {
		background: var(--grove-600, #16a34a);
	}
	.manual-url-add:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Search */
	.picker-search {
		position: relative;
		margin-bottom: 0.75rem;
	}
	:global(.search-icon) {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-foreground-subtle, #999);
		pointer-events: none;
	}
	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2rem;
		min-height: 44px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
		color: var(--color-foreground, #1a1a1a);
		outline: none;
		transition: border-color 0.15s ease;
	}
	.search-input:focus {
		border-color: var(--grove-500, #22c55e);
	}
	:global(.dark) .search-input {
		background: rgba(0, 0, 0, 0.2);
		border-color: rgba(255, 255, 255, 0.15);
		color: var(--color-foreground-dark, #e0e0e0);
	}

	/* Grid scroll area */
	.picker-grid-scroll {
		overflow-y: auto;
		max-height: 40vh;
		min-height: 150px;
		margin-bottom: 0.75rem;
	}
	.picker-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	@media (max-width: 480px) {
		.picker-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 481px) and (max-width: 640px) {
		.picker-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Thumbnails */
	.picker-thumb {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 6px;
		overflow: hidden;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		background: rgba(0, 0, 0, 0.05);
		transition:
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	.picker-thumb:hover {
		transform: scale(1.02);
	}
	.picker-thumb:focus-visible {
		outline: 2px solid var(--grove-500, #22c55e);
		outline-offset: 2px;
	}
	.picker-thumb.selected {
		border-color: var(--grove-500, #22c55e);
		box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
	}
	.picker-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.thumb-check {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 24px;
		height: 24px;
		background: var(--grove-500, #22c55e);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	/* Skeleton */
	.picker-skeleton-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.skeleton-thumb {
		aspect-ratio: 4 / 3;
		border-radius: 6px;
		background: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0.06) 25%,
			rgba(0, 0, 0, 0.1) 50%,
			rgba(0, 0, 0, 0.06) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease infinite;
	}
	:global(.dark) .skeleton-thumb {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.04) 25%,
			rgba(255, 255, 255, 0.08) 50%,
			rgba(255, 255, 255, 0.04) 75%
		);
		background-size: 200% 100%;
	}
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Empty states */
	.picker-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		color: var(--color-foreground-muted, #666);
		text-align: center;
	}
	.picker-no-gallery {
		padding: 2rem 1rem;
	}
	:global(.empty-icon) {
		opacity: 0.4;
	}
	.picker-empty-hint {
		font-size: 0.8rem;
		color: var(--color-foreground-subtle, #999);
	}
	.picker-empty-hint a {
		color: var(--grove-500, #22c55e);
		text-decoration: underline;
	}
	.picker-error {
		color: var(--grove-error, #ef4444);
	}
	.retry-link {
		background: transparent;
		border: none;
		color: var(--grove-500, #22c55e);
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.25rem;
		min-height: 44px;
		display: flex;
		align-items: center;
	}

	/* Selected pills */
	.picker-selected-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.5rem 0;
	}
	.selected-pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 12px;
		font-size: 0.75rem;
		color: var(--grove-700, #15803d);
		max-width: 200px;
	}
	:global(.dark) .selected-pill {
		background: rgba(34, 197, 94, 0.15);
		color: var(--grove-400, #4ade80);
	}
	.selected-pill-url {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.selected-pill-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		min-width: 28px;
		min-height: 28px;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.15s ease;
	}
	.selected-pill-remove:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	/* Load more */
	.picker-load-more {
		text-align: center;
		padding: 0.75rem;
	}
	.load-more-btn {
		padding: 0.6rem 1rem;
		min-height: 44px;
		background: transparent;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.load-more-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	.load-more-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Footer */
	.picker-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.picker-count {
		font-size: 0.8rem;
		color: var(--color-foreground-muted, #666);
	}
	.picker-hint {
		font-size: 0.75rem;
		color: var(--color-foreground-subtle, #999);
		font-style: italic;
	}
	.picker-actions {
		display: flex;
		gap: 0.5rem;
	}
	.picker-cancel {
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background: transparent;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.picker-cancel:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	.picker-insert {
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background: var(--grove-500, #22c55e);
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}
	.picker-insert:hover {
		background: var(--grove-600, #16a34a);
	}
	.picker-insert:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Focus-visible for all interactive elements */
	.picker-insert:focus-visible,
	.picker-cancel:focus-visible,
	.picker-close:focus-visible,
	.load-more-btn:focus-visible,
	.manual-url-toggle:focus-visible,
	.manual-url-add:focus-visible,
	.manual-url-input:focus-visible,
	.search-input:focus-visible,
	.retry-link:focus-visible,
	.selected-pill-remove:focus-visible {
		outline: 2px solid var(--grove-500, #22c55e);
		outline-offset: 2px;
	}
</style>
