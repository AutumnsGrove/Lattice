<script>
	import { ImageGallery } from '@autumnsgrove/groveengine';

	// Transform gallery items to match ImageGallery's expected format
	const galleryImages = [
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=The+Corner+Table',
			alt: 'The Corner Table',
			caption: 'Where the novelist sits every Thursday'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Jasmine+Pearls',
			alt: 'Jasmine Pearls Unfurling',
			caption: 'Watch the magic happen'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Candlelight',
			alt: 'Candlelight',
			caption: 'Our only source of light after midnight'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Copper+Kettles',
			alt: 'The Copper Kettles',
			caption: 'Three temperatures, three purposes'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Hourglasses',
			alt: 'Hourglasses',
			caption: 'Time moves differently here'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Bulletin+Board',
			alt: 'The Bulletin Board',
			caption: 'Messages between night owls'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Empty+Cups',
			alt: 'Empty Cups',
			caption: 'Each one tells a story'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Rain+Window',
			alt: 'Rain on the Window',
			caption: 'The café sounds different on wet nights'
		},
		{
			url: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Moon+Door',
			alt: 'The Moon Door Handle',
			caption: 'You found us'
		}
	];
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

	<ImageGallery images={galleryImages} />
</div>

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
</style>
