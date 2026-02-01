<script>
	import Lightbox from '$lib/ui/components/gallery/Lightbox.svelte';
	import GlassCarousel from '$lib/ui/components/ui/GlassCarousel.svelte';
	import { sanitizeHTML } from '$lib/utils/sanitize';

	let { item = {} } = $props();

	let lightboxOpen = $state(false);
	let lightboxSrc = $state('');
	let lightboxAlt = $state('');
	let lightboxCaption = $state('');

	/**
	 * @param {string} src
	 * @param {string} alt
	 * @param {string} [caption]
	 */
	function openLightbox(src, alt, caption = '') {
		lightboxSrc = src;
		lightboxAlt = alt;
		lightboxCaption = caption;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	// Handle clicks or keyboard activation on images within markdown content
	/** @param {Event} event */
	function handleContentClick(event) {
		const target = /** @type {HTMLElement} */ (event.target);
		if (target.tagName === 'IMG') {
			const img = /** @type {HTMLImageElement} */ (target);
			openLightbox(img.src, img.alt);
		}
	}
</script>

<div class="gutter-item" data-anchor={item.anchor || ''}>
	{#if item.type === 'comment' || item.type === 'markdown'}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="gutter-comment"
			onclick={handleContentClick}
			onkeydown={(e) => e.key === 'Enter' && handleContentClick(e)}
			role="group"
			aria-label="Gutter annotation - click images to enlarge"
		>
			{@html sanitizeHTML(item.content)}
		</div>
	{:else if item.type === 'photo' || item.type === 'image'}
		{@const imageSrc = item.src || item.url || item.file}
		<figure class="gutter-photo">
			<button class="image-button" onclick={() => openLightbox(imageSrc, item.caption || 'Gutter image', item.caption || '')}>
				<img src={imageSrc} alt={item.caption || 'Gutter image'} loading="lazy" decoding="async" />
			</button>
			{#if item.caption}
				<figcaption>{item.caption}</figcaption>
			{/if}
		</figure>
	{:else if item.type === 'gallery'}
		{#if item.images?.length > 0}
			<div class="gutter-gallery">
				<GlassCarousel
					images={item.images.map((/** @type {{url?: string, alt?: string, caption?: string}} */ img) => ({ url: img.url || '', alt: img.alt || 'Gallery image', caption: img.caption || '' }))}
					variant="frosted"
					showArrows={false}
					class="gutter-carousel"
				/>
			</div>
		{:else}
			<div class="gutter-gallery-empty">
				<span>No images in gallery</span>
			</div>
		{/if}
	{:else if item.type === 'emoji'}
		<div class="gutter-emoji">
			<img src={item.src} alt={item.alt || 'Emoji'} title={item.alt || ''} loading="lazy" decoding="async" />
		</div>
	{/if}
</div>

<Lightbox
	src={lightboxSrc}
	alt={lightboxAlt}
	caption={lightboxCaption}
	isOpen={lightboxOpen}
	onClose={closeLightbox}
/>

<style>
	.gutter-item {
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.gutter-comment {
		padding: 0.875rem 1rem;
		/* Glass effect */
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.5);
		border-left: 3px solid #2c5f2d;
		border-radius: 0 10px 10px 0;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
		color: var(--light-text-secondary);
		transition: all 0.3s ease;
	}
	.gutter-comment:hover {
		background: rgba(255, 255, 255, 0.8);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
		border-left-color: #3a7e3c;
	}
	:global(.dark) .gutter-comment {
		background: rgba(16, 50, 37, 0.5);
		border-color: rgba(74, 222, 128, 0.15);
		border-left-color: var(--accent-success);
		color: var(--light-text-tertiary);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .gutter-comment:hover {
		background: rgba(16, 50, 37, 0.6);
		border-left-color: #5cb85f;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
	}
	.gutter-comment :global(p) {
		margin: 0 0 0.5rem 0;
	}
	.gutter-comment :global(p:last-child) {
		margin-bottom: 0;
	}
	.gutter-comment :global(a) {
		color: #2c5f2d;
		text-decoration: underline;
	}
	:global(.dark) .gutter-comment :global(a) {
		color: var(--accent-success);
	}
	.gutter-photo {
		margin: 0;
		/* Glass container for photos */
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 12px;
		padding: 0.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}
	.gutter-photo:hover {
		background: rgba(255, 255, 255, 0.75);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}
	:global(.dark) .gutter-photo {
		background: rgba(16, 50, 37, 0.4);
		border-color: rgba(74, 222, 128, 0.15);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .gutter-photo:hover {
		background: rgba(16, 50, 37, 0.55);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}
	.image-button {
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: block;
		width: 100%;
	}
	.image-button:hover img {
		opacity: 0.95;
	}
	.gutter-photo img {
		width: 100%;
		max-width: 160px;
		height: auto;
		border-radius: 8px;
		display: block;
		transition: opacity 0.2s, transform 0.2s;
	}
	/* Also constrain images in markdown comments */
	.gutter-comment :global(img) {
		max-width: 160px;
		height: auto;
		border-radius: 6px;
		display: block;
		margin-bottom: 0.5rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.gutter-comment :global(img:hover) {
		opacity: 0.9;
	}
	.gutter-photo figcaption {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #666;
		font-style: italic;
		text-align: center;
		transition: color 0.3s ease;
	}
	/* Gallery styles for gutter - using GlassCarousel */
	.gutter-gallery {
		width: 100%;
		max-width: 180px;
	}
	/* Compact carousel for gutter */
	.gutter-gallery :global(.gutter-carousel) {
		padding: 0.5rem;
	}
	.gutter-gallery :global([role="region"]) {
		padding: 0.5rem;
	}
	/* Adjust aspect ratio for compact view */
	.gutter-gallery :global(.relative.w-full) {
		aspect-ratio: 1/1;
	}
	/* Smaller navigation dots */
	.gutter-gallery :global(.flex.items-center.gap-2) {
		gap: 0.25rem;
	}
	.gutter-gallery :global(.h-2) {
		height: 6px;
	}
	.gutter-gallery :global(.w-6) {
		width: 16px;
	}
	.gutter-gallery :global(.w-2) {
		width: 6px;
	}
	/* Empty gallery state */
	.gutter-gallery-empty {
		padding: 1rem;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px dashed rgba(0, 0, 0, 0.15);
		border-radius: 10px;
		text-align: center;
		max-width: 180px;
	}
	.gutter-gallery-empty span {
		font-size: 0.75rem;
		color: var(--color-text-subtle, #999);
		font-style: italic;
	}
	:global(.dark) .gutter-gallery-empty {
		background: rgba(16, 50, 37, 0.3);
		border-color: rgba(74, 222, 128, 0.2);
	}
	/* Emoji styles - with glass background */
	.gutter-emoji {
		display: flex;
		justify-content: center;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 12px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		transition: all 0.3s ease;
	}
	.gutter-emoji:hover {
		background: rgba(255, 255, 255, 0.65);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .gutter-emoji {
		background: rgba(16, 50, 37, 0.35);
		border-color: rgba(74, 222, 128, 0.12);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
	}
	:global(.dark) .gutter-emoji:hover {
		background: rgba(16, 50, 37, 0.5);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
	}
	.gutter-emoji img {
		width: 48px;
		height: 48px;
		transition: transform 0.2s;
	}
	.gutter-emoji img:hover {
		transform: scale(1.15);
	}
</style>
