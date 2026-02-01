<script>
	import ZoomableImage from './ZoomableImage.svelte';
	import LightboxCaption from './LightboxCaption.svelte';

	/**
	 * ImageGallery - Multi-image gallery with navigation
	 * Similar to The Verge's implementation
	 *
	 * @prop {Array} images - Array of image objects with url, alt, and optional caption
	 * @example
	 * <ImageGallery images={[
	 *   { url: 'https://...', alt: 'Description', caption: 'Photo caption' }
	 * ]} />
	 */
	let { images = /** @type {Array<{url: string, alt: string, caption?: string}>} */ ([]) } = $props();

	let currentIndex = $state(0);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let galleryElement = $state(/** @type {HTMLDivElement | undefined} */ (undefined));

	// Lightbox state
	let lightboxOpen = $state(false);

	/**
	 * Safely get the current image, handling race conditions when images prop changes
	 * Returns a fallback object if the current index is invalid to prevent undefined access
	 */
	let currentImage = $derived.by(() => {
		if (!images || images.length === 0) {
			return { url: '', alt: '', caption: '' };
		}
		const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
		return images[safeIndex] || { url: '', alt: '', caption: '' };
	});

	// Navigation cooldown to prevent double-tap
	let isNavigating = $state(false);
	const NAVIGATION_COOLDOWN_MS = 300;

	// Image loading states
	let imageLoading = $state(true);
	let imageError = $state(false);

	function openLightbox() {
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	// Navigation functions with cooldown to prevent double-tap
	function goToNext() {
		if (isNavigating || currentIndex >= images.length - 1) return;

		isNavigating = true;
		imageLoading = true;
		imageError = false;
		currentIndex++;

		setTimeout(() => {
			isNavigating = false;
		}, NAVIGATION_COOLDOWN_MS);
	}

	function goToPrevious() {
		if (isNavigating || currentIndex <= 0) return;

		isNavigating = true;
		imageLoading = true;
		imageError = false;
		currentIndex--;

		setTimeout(() => {
			isNavigating = false;
		}, NAVIGATION_COOLDOWN_MS);
	}

	function goToIndex(/** @type {number} */ index) {
		if (isNavigating || index < 0 || index >= images.length || index === currentIndex) return;

		isNavigating = true;
		imageLoading = true;
		imageError = false;
		currentIndex = index;

		setTimeout(() => {
			isNavigating = false;
		}, NAVIGATION_COOLDOWN_MS);
	}

	// Image loading handlers
	function handleImageLoad() {
		imageLoading = false;
		imageError = false;
	}

	function handleImageError() {
		imageLoading = false;
		imageError = true;
	}

	// Keyboard navigation
	function handleKeydown(/** @type {KeyboardEvent} */ event) {
		// Handle Escape to close lightbox
		if (event.key === 'Escape' && lightboxOpen) {
			closeLightbox();
			return;
		}

		if (event.key === 'ArrowRight') {
			goToNext();
		} else if (event.key === 'ArrowLeft') {
			goToPrevious();
		}
	}

	// Touch/swipe support
	function handleTouchStart(/** @type {TouchEvent} */ event) {
		touchStartX = event.touches[0].clientX;
	}

	function handleTouchMove(/** @type {TouchEvent} */ event) {
		touchEndX = event.touches[0].clientX;
	}

	function handleTouchEnd() {
		const swipeThreshold = 50;
		const diff = touchStartX - touchEndX;

		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				goToNext();
			} else {
				goToPrevious();
			}
		}
		touchStartX = 0;
		touchEndX = 0;
	}

	// Get current image
	$effect(() => {
		// Reset index if images array changes and current index is out of bounds
		if (currentIndex >= images.length && images.length > 0) {
			currentIndex = images.length - 1;
		}
	});

	// Reset loading state when images prop changes
	$effect(() => {
		if (images && images.length > 0) {
			imageLoading = true;
			imageError = false;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if images && images.length > 0}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="gallery-container"
		bind:this={galleryElement}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="region"
		aria-label="Image gallery"
		tabindex="0"
	>
		<!-- Main image display -->
		<div class="gallery-image-wrapper">
			<button class="image-expand-button" onclick={openLightbox} aria-label="View full size">
				{#if imageLoading}
					<div class="image-loading">
						<div class="loading-spinner"></div>
					</div>
				{/if}

				{#if imageError}
					<div class="image-error">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="8" x2="12" y2="12"></line>
							<line x1="12" y1="16" x2="12.01" y2="16"></line>
						</svg>
						<span>Failed to load image</span>
					</div>
				{/if}

				<img
					src={currentImage.url}
					alt={currentImage.alt || `Image ${currentIndex + 1}`}
					class="gallery-image"
					class:hidden={imageError}
					onload={handleImageLoad}
					onerror={handleImageError}
					loading="lazy"
					decoding="async"
				/>
			</button>

			<!-- Navigation arrows -->
			{#if images.length > 1}
				<button
					class="nav-button nav-prev"
					onclick={goToPrevious}
					disabled={currentIndex === 0}
					aria-label="Previous image"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>

				<button
					class="nav-button nav-next"
					onclick={goToNext}
					disabled={currentIndex === images.length - 1}
					aria-label="Next image"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Info panel (progress, counter, caption) -->
		{#if images.length > 1 || currentImage.caption}
			<div class="gallery-info">
				{#if images.length > 1}
					<!-- Progress dots -->
					<div class="gallery-progress">
						<div class="progress-dots">
							{#each images as _, index (index)}
								<button
									class="progress-dot"
									class:active={index === currentIndex}
									onclick={() => goToIndex(index)}
									aria-label={`Go to image ${index + 1}`}
								></button>
							{/each}
						</div>
					</div>

					<!-- Counter -->
					<div class="gallery-counter">
						{currentIndex + 1}/{images.length}
					</div>
				{/if}

				<!-- Caption -->
				{#if currentImage.caption}
					<div class="gallery-caption">
						{currentImage.caption}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Lightbox modal -->
	{#if lightboxOpen}
		<div
			class="lightbox-backdrop"
			onclick={(/** @type {MouseEvent} */ e) => e.target === e.currentTarget && closeLightbox()}
			onkeydown={(/** @type {KeyboardEvent} */ e) => {
				if (e.key === 'Escape') closeLightbox();
				if (e.key === 'Enter' || e.key === ' ') closeLightbox();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Image viewer"
			tabindex="-1"
		>
			<button class="lightbox-close" onclick={closeLightbox} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			<div
				class="lightbox-content"
				onclick={(/** @type {MouseEvent} */ e) => e.target === e.currentTarget && closeLightbox()}
				onkeydown={(/** @type {KeyboardEvent} */ e) => {
					if (e.key === 'Escape') closeLightbox();
					if (e.key === 'Enter' || e.key === ' ') closeLightbox();
				}}
				role="presentation"
			>
				<ZoomableImage
					src={currentImage.url}
					alt={currentImage.alt || `Image ${currentIndex + 1}`}
					isActive={lightboxOpen}
					class="lightbox-image"
				/>

				<!-- Navigation arrows in lightbox -->
				{#if images.length > 1}
					<button
						class="lightbox-nav lightbox-prev"
						onclick={goToPrevious}
						disabled={currentIndex === 0}
						aria-label="Previous image"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="15 18 9 12 15 6"></polyline>
						</svg>
					</button>

					<button
						class="lightbox-nav lightbox-next"
						onclick={goToNext}
						disabled={currentIndex === images.length - 1}
						aria-label="Next image"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
					</button>
				{/if}
			</div>

			<!-- Caption in lightbox -->
		<LightboxCaption caption={currentImage.caption} />

			<!-- Thumbnail strip -->
			{#if images.length > 1}
				<div class="lightbox-thumbnails">
					{#each images as image, index (index)}
						<button
							class="thumbnail-button"
							class:active={index === currentIndex}
							onclick={() => goToIndex(index)}
							aria-label={`View image ${index + 1}`}
						>
							<img src={image.url} alt={image.alt || `Thumbnail ${index + 1}`} loading="lazy" decoding="async" />
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.gallery-container {
		position: relative;
		width: 100%;
		margin: 1.5rem 0;
		outline: none;
	}
	.gallery-container:focus {
		outline: 2px solid #5865f2;
		outline-offset: 4px;
		border-radius: 8px;
	}
	.gallery-image-wrapper {
		position: relative;
		width: 100%;
		background: #000;
		border-radius: 8px;
		overflow: hidden;
	}
	.gallery-image {
		width: 100%;
		height: auto;
		display: block;
		max-height: 70vh;
		object-fit: contain;
	}
	.gallery-image.hidden {
		visibility: hidden;
	}
	/* Loading spinner */
	.image-loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
	}
	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top-color: #5865f2;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	/* Error state */
	.image-error {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: #9ca3af;
		z-index: 5;
	}
	.image-error svg {
		width: 48px;
		height: 48px;
	}
	.image-error span {
		font-size: 0.875rem;
	}
	/* Navigation buttons */
	.nav-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #5865f2;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: all 0.2s ease;
		z-index: 10;
		opacity: 0.9;
	}
	.nav-button:hover:not(:disabled) {
		background: #4752c4;
		transform: translateY(-50%) scale(1.05);
		opacity: 1;
	}
	.nav-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.nav-button svg {
		width: 24px;
		height: 24px;
	}
	.nav-prev {
		left: 16px;
	}
	.nav-next {
		right: 16px;
	}
	/* Info panel - unified background for progress, counter, caption */
	.gallery-info {
		background: #f9fafb;
		border-radius: 0 0 8px 8px;
	}
	:global(.dark) .gallery-info {
		background: #1f2937;
	}
	/* Progress indicators */
	.gallery-progress {
		display: flex;
		justify-content: center;
		padding: 12px 0 8px;
	}
	.progress-dots {
		display: flex;
		gap: 6px;
	}
	.progress-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #d1d5db;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.progress-dot:hover {
		background: #9ca3af;
		transform: scale(1.2);
	}
	.progress-dot.active {
		background: #5865f2;
		width: 28px;
		border-radius: 6px;
		box-shadow: 0 2px 4px rgba(88, 101, 242, 0.3);
	}
	:global(.dark) .progress-dot {
		background: #4b5563;
	}
	:global(.dark) .progress-dot:hover {
		background: #6b7280;
	}
	:global(.dark) .progress-dot.active {
		background: #5865f2;
	}
	/* Counter */
	.gallery-counter {
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		padding-bottom: 8px;
	}
	:global(.dark) .gallery-counter {
		color: #9ca3af;
	}
	/* Caption */
	.gallery-caption {
		padding: 12px 16px;
		font-size: 0.9rem;
		color: #374151;
		line-height: 1.5;
		font-style: italic;
	}
	:global(.dark) .gallery-caption {
		color: #d1d5db;
	}
	/* Image expand button */
	.image-expand-button {
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: block;
		width: 100%;
	}
	.image-expand-button:hover .gallery-image {
		opacity: 0.95;
	}
	/* Lightbox styles */
	.lightbox-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		padding: 1rem;
	}
	.lightbox-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: background 0.2s;
		z-index: 10;
	}
	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}
	.lightbox-close svg {
		width: 24px;
		height: 24px;
	}
	.lightbox-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		width: 100%;
		max-height: calc(100vh - 140px);
		overflow: auto;
	}
	:global(.lightbox-content .lightbox-image) {
		max-width: 90vw;
		max-height: calc(100vh - 140px);
		object-fit: contain;
		border-radius: 4px;
	}
	.lightbox-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: background 0.2s;
	}
	.lightbox-nav:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}
	.lightbox-nav:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.lightbox-nav svg {
		width: 24px;
		height: 24px;
	}
	.lightbox-prev {
		left: 1rem;
	}
	.lightbox-next {
		right: 1rem;
	}
	/* Thumbnail strip */
	.lightbox-thumbnails {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		max-width: 100%;
		justify-content: center;
	}
	.thumbnail-button {
		flex-shrink: 0;
		width: 60px;
		height: 60px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 6px;
		overflow: hidden;
		cursor: pointer;
		background: none;
		transition: border-color 0.2s, opacity 0.2s;
		opacity: 0.6;
	}
	.thumbnail-button:hover {
		opacity: 0.9;
	}
	.thumbnail-button.active {
		border-color: white;
		opacity: 1;
	}
	.thumbnail-button img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* Responsive */
	@media (max-width: 640px) {
		.nav-button {
			width: 40px;
			height: 40px;
		}
		.nav-button svg {
			width: 20px;
			height: 20px;
		}
		.nav-prev {
			left: 8px;
		}
		.nav-next {
			right: 8px;
		}
		.gallery-caption {
			font-size: 0.85rem;
			padding: 10px 12px;
		}
		.lightbox-nav {
			width: 40px;
			height: 40px;
		}
		.lightbox-nav svg {
			width: 20px;
			height: 20px;
		}
		.thumbnail-button {
			width: 50px;
			height: 50px;
		}
	}
</style>
