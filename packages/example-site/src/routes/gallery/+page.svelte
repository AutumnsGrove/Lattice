<script>
	// Example gallery items (placeholders for now)
	const galleryItems = [
		{ id: 1, title: 'The Corner Table', description: 'Where the novelist sits every Thursday' },
		{ id: 2, title: 'Jasmine Pearls Unfurling', description: 'Watch the magic happen' },
		{ id: 3, title: 'Candlelight', description: 'Our only source of light after midnight' },
		{ id: 4, title: 'The Copper Kettles', description: 'Three temperatures, three purposes' },
		{ id: 5, title: 'Hourglasses', description: 'Time moves differently here' },
		{ id: 6, title: 'The Bulletin Board', description: 'Messages between night owls' },
		{ id: 7, title: 'Empty Cups', description: 'Each one tells a story' },
		{ id: 8, title: 'Rain on the Window', description: 'The café sounds different on wet nights' },
		{ id: 9, title: 'The Moon Door Handle', description: 'You found us' }
	];

	let selectedImage = $state(null);

	function openLightbox(item) {
		selectedImage = item;
	}

	function closeLightbox() {
		selectedImage = null;
	}
</script>

<svelte:head>
	<title>Gallery - The Midnight Bloom</title>
	<meta name="description" content="A visual tour of The Midnight Bloom tea café." />
</svelte:head>

<div class="gallery-page">
	<header class="page-header">
		<h1>Gallery</h1>
		<p class="subtitle">Moments from the quiet hours</p>
	</header>

	<div class="gallery-grid">
		{#each galleryItems as item}
			<button class="gallery-item" onclick={() => openLightbox(item)}>
				<div class="image-placeholder">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<circle cx="9" cy="9" r="2"></circle>
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
					</svg>
				</div>
				<div class="item-info">
					<h3>{item.title}</h3>
				</div>
			</button>
		{/each}
	</div>
</div>

<!-- Lightbox -->
{#if selectedImage}
	<div class="lightbox-overlay" onclick={closeLightbox}>
		<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
			<button class="close-btn" onclick={closeLightbox}>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"></path>
					<path d="m6 6 12 12"></path>
				</svg>
			</button>
			<div class="lightbox-image">
				<div class="image-placeholder large">
					<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<circle cx="9" cy="9" r="2"></circle>
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
					</svg>
				</div>
			</div>
			<div class="lightbox-info">
				<h2>{selectedImage.title}</h2>
				<p>{selectedImage.description}</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.gallery-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.page-header h1 {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin: 0;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.gallery-item {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
		cursor: pointer;
		transition: border-color 0.2s, transform 0.2s;
		text-align: left;
		padding: 0;
	}

	.gallery-item:hover {
		border-color: hsl(var(--primary));
		transform: translateY(-2px);
	}

	.image-placeholder {
		background: hsl(var(--muted));
		height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.image-placeholder.large {
		height: 400px;
	}

	.item-info {
		padding: 1rem;
	}

	.item-info h3 {
		margin: 0;
		font-size: 1rem;
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	/* Lightbox styles */
	.lightbox-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.lightbox-content {
		background: hsl(var(--card));
		border-radius: 12px;
		max-width: 800px;
		width: 100%;
		overflow: hidden;
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: hsl(var(--background));
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: hsl(var(--foreground));
		z-index: 10;
	}

	.close-btn:hover {
		background: hsl(var(--muted));
	}

	.lightbox-image {
		width: 100%;
	}

	.lightbox-info {
		padding: 1.5rem;
	}

	.lightbox-info h2 {
		margin: 0 0 0.5rem 0;
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.lightbox-info p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	@media (max-width: 600px) {
		.gallery-grid {
			grid-template-columns: 1fr;
		}

		.lightbox-overlay {
			padding: 1rem;
		}

		.image-placeholder.large {
			height: 250px;
		}
	}
</style>
