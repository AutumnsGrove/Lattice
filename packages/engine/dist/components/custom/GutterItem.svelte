<script>
	import Lightbox from '../../ui/components/gallery/Lightbox.svelte';
	import ImageGallery from '../../ui/components/gallery/ImageGallery.svelte';
	import { sanitizeHTML } from '../../utils/sanitize';

	let { item = {} } = $props();

	let lightboxOpen = $state(false);
	let lightboxSrc = $state('');
	let lightboxAlt = $state('');
	let lightboxCaption = $state('');

	function openLightbox(src, alt, caption = '') {
		lightboxSrc = src;
		lightboxAlt = alt;
		lightboxCaption = caption;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	// Handle clicks on images within markdown content
	function handleContentClick(event) {
		if (event.target.tagName === 'IMG') {
			openLightbox(event.target.src, event.target.alt);
		}
	}
</script>

<div class="gutter-item" data-anchor={item.anchor || ''}>
	{#if item.type === 'comment' || item.type === 'markdown'}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="gutter-comment" onclick={handleContentClick}>
			{@html sanitizeHTML(item.content)}
		</div>
	{:else if item.type === 'photo' || item.type === 'image'}
		{@const imageSrc = item.src || item.url || item.file}
		<figure class="gutter-photo">
			<button class="image-button" onclick={() => openLightbox(imageSrc, item.caption || 'Gutter image', item.caption || '')}>
				<img src={imageSrc} alt={item.caption || 'Gutter image'} />
			</button>
			{#if item.caption}
				<figcaption>{item.caption}</figcaption>
			{/if}
		</figure>
	{:else if item.type === 'gallery'}
		<div class="gutter-gallery">
			<ImageGallery images={item.images} />
		</div>
	{:else if item.type === 'emoji'}
		<div class="gutter-emoji">
			<img src={item.src} alt={item.alt || 'Emoji'} title={item.alt || ''} />
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
		padding: 0.75rem;
		background: #f8f8f8;
		border-left: 3px solid #2c5f2d;
		border-radius: 0 6px 6px 0;
		color: var(--light-text-secondary);
		transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
	}
	:global(.dark) .gutter-comment {
		background: var(--light-bg-primary);
		border-left-color: var(--accent-success);
		color: var(--light-text-tertiary);
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
	}
	.image-button {
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: block;
	}
	.image-button:hover img {
		opacity: 0.9;
	}
	.gutter-photo img {
		width: 100%;
		max-width: 160px;
		height: auto;
		border-radius: 6px;
		display: block;
		transition: opacity 0.2s;
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
	/* Gallery styles for gutter - compact version */
	.gutter-gallery {
		width: 100%;
		max-width: 160px;
	}
	.gutter-gallery :global(.gallery-container) {
		margin: 0;
	}
	.gutter-gallery :global(.gallery-image) {
		max-height: 120px;
	}
	.gutter-gallery :global(.nav-button) {
		width: 24px;
		height: 24px;
	}
	.gutter-gallery :global(.nav-button svg) {
		width: 12px;
		height: 12px;
	}
	.gutter-gallery :global(.nav-prev) {
		left: 4px;
	}
	.gutter-gallery :global(.nav-next) {
		right: 4px;
	}
	.gutter-gallery :global(.gallery-info) {
		padding: 4px;
	}
	.gutter-gallery :global(.gallery-progress) {
		padding: 6px 0 4px;
	}
	.gutter-gallery :global(.progress-dot) {
		width: 8px;
		height: 8px;
	}
	.gutter-gallery :global(.progress-dot.active) {
		width: 16px;
	}
	.gutter-gallery :global(.gallery-counter) {
		font-size: 0.7rem;
		padding-bottom: 4px;
	}
	.gutter-gallery :global(.gallery-caption) {
		font-size: 0.75rem;
		padding: 6px 8px;
	}
	/* Emoji styles */
	.gutter-emoji {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0;
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
