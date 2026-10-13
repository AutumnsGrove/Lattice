<script lang="ts">
	import { navIcons } from "@autumnsgrove/prism/icons";
	import Lightbox from "./Lightbox.svelte";

	/**
	 * PostCarousel - swipeable carousel for a ::gallery directive in a post
	 *
	 * The server already renders a scroll-snap strip (see .grove-gallery in
	 * content.css), so swiping works before any JS runs. ContentWithGutter
	 * mounts this over that strip once the page loads; it keeps the same
	 * slide markup and adds arrow buttons, dots, arrow-key navigation, and a
	 * lightbox. Nothing moves when it takes over.
	 *
	 * @prop {GalleryImage[]} images - url, alt text, and optional caption per slide
	 * @prop {string} label - accessible name for the carousel
	 */
	interface GalleryImage {
		url: string;
		alt: string;
		caption: string;
	}

	interface Props {
		images?: GalleryImage[];
		label?: string;
	}

	let { images = [], label = "Photo gallery" }: Props = $props();

	let track: HTMLDivElement | undefined = $state();
	let current = $state(0);
	let lightboxIndex = $state<number | null>(null);
	let frame = 0;

	let lightboxImage = $derived(lightboxIndex === null ? null : (images[lightboxIndex] ?? null));

	function prefersReducedMotion(): boolean {
		return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
	}

	function scrollToSlide(index: number, behavior: ScrollBehavior) {
		if (!track) return;
		const target = Math.min(images.length - 1, Math.max(0, index));
		track.scrollTo({ left: target * track.clientWidth, behavior });
	}

	function goTo(index: number) {
		scrollToSlide(index, prefersReducedMotion() ? "instant" : "smooth");
	}

	// The scroll position is the source of truth for which slide is showing,
	// so swipes, buttons, dots, and keys all end up in the same place.
	function handleScroll() {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (!track || track.clientWidth === 0) return;
			const index = Math.round(track.scrollLeft / track.clientWidth);
			current = Math.min(images.length - 1, Math.max(0, index));
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			goTo(current - 1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			goTo(current + 1);
		}
	}

	function closeLightbox() {
		// Land the strip on whichever photo the viewer ended up on
		if (lightboxIndex !== null) scrollToSlide(lightboxIndex, "instant");
		lightboxIndex = null;
	}

	$effect(() => () => cancelAnimationFrame(frame));

	// The lightbox is position: fixed, but a post lives inside stacking contexts
	// (the content column, the page chrome) where z-index only counts locally.
	// Left in place it opens underneath the site header and hides its own close
	// button. Moving it to <body> puts it above everything.
	//
	// Reparenting blurs a focused element, and the lightbox has already moved
	// focus to its close button by the time this runs, so hand focus back.
	function portal(node: HTMLElement) {
		const focused = document.activeElement as HTMLElement | null;
		document.body.appendChild(node);
		if (focused && node.contains(focused)) focused.focus();
		return { destroy: () => node.remove() };
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="grove-carousel"
	role="region"
	aria-roledescription="carousel"
	aria-label={label}
	onkeydown={handleKeydown}
>
	<div class="grove-gallery-track" bind:this={track} onscroll={handleScroll}>
		{#each images as image, i (i)}
			<figure
				class="grove-gallery-item"
				role="group"
				aria-roledescription="slide"
				aria-label="{i + 1} of {images.length}"
			>
				<button
					type="button"
					class="grove-gallery-open"
					onclick={() => (lightboxIndex = i)}
					aria-label={image.alt
						? `View photo ${i + 1} larger: ${image.alt}`
						: `View photo ${i + 1} larger`}
				>
					<img
						src={image.url}
						alt={image.alt}
						loading={i === 0 ? "eager" : "lazy"}
						draggable="false"
					/>
				</button>
				{#if image.caption}
					<figcaption>{image.caption}</figcaption>
				{/if}
			</figure>
		{/each}
	</div>

	<button
		type="button"
		class="grove-carousel-nav grove-carousel-prev"
		aria-label="Previous photo"
		aria-disabled={current === 0}
		onclick={() => goTo(current - 1)}
	>
		<navIcons.chevronLeft />
	</button>
	<button
		type="button"
		class="grove-carousel-nav grove-carousel-next"
		aria-label="Next photo"
		aria-disabled={current === images.length - 1}
		onclick={() => goTo(current + 1)}
	>
		<navIcons.chevronRight />
	</button>

	<div class="grove-carousel-dots">
		{#each images as _, i (i)}
			<button
				type="button"
				class="grove-carousel-dot"
				aria-label="Go to photo {i + 1}"
				aria-current={i === current ? "true" : undefined}
				onclick={() => goTo(i)}
			></button>
		{/each}
	</div>

	<p class="sr-only" aria-live="polite">Photo {current + 1} of {images.length}</p>
</div>

{#if lightboxIndex !== null}
	<div use:portal>
		<Lightbox
			isOpen
			src={lightboxImage?.url ?? ""}
			alt={lightboxImage?.alt ?? ""}
			caption={lightboxImage?.caption ?? ""}
			position={`${lightboxIndex + 1} of ${images.length}`}
			onClose={closeLightbox}
			onPrevious={lightboxIndex > 0 ? () => (lightboxIndex = (lightboxIndex ?? 0) - 1) : undefined}
			onNext={lightboxIndex < images.length - 1
				? () => (lightboxIndex = (lightboxIndex ?? 0) + 1)
				: undefined}
		/>
	</div>
{/if}

<style>
	/* Slide and track styles are global (content.css) so the server-rendered
	   strip and this component look identical. Only the chrome lives here. */
	.grove-carousel {
		position: relative;
		/* Lets the arrows line up with the photo (4:3) via cqw, regardless of caption height */
		container-type: inline-size;
	}

	.grove-carousel-nav {
		position: absolute;
		top: calc(37.5cqw - 1.25rem);
		width: 2.5rem;
		height: 2.5rem;
		display: none;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		/* These sit on top of a photo, so a dark scrim with a white icon reads on
		   any image and in any theme (same treatment as the lightbox controls) */
		border: 1px solid rgba(255, 255, 255, 0.4);
		background: rgba(0, 0, 0, 0.5);
		color: white;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s,
			background 0.2s;
	}

	.grove-carousel-nav:hover {
		background: rgba(0, 0, 0, 0.7);
	}

	.grove-carousel-nav :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.grove-carousel-prev {
		left: 0.75rem;
	}

	.grove-carousel-next {
		right: 0.75rem;
	}

	.grove-carousel-nav[aria-disabled="true"] {
		cursor: default;
		opacity: 0.35 !important;
	}

	/* Arrows are for pointer devices; touch swipes */
	@media (hover: hover) {
		.grove-carousel-nav {
			display: flex;
		}

		.grove-carousel:hover .grove-carousel-nav,
		.grove-carousel:focus-within .grove-carousel-nav {
			opacity: 1;
		}
	}

	/* Dots sit in the space content.css reserves under the strip */
	.grove-carousel-dots {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
	}

	.grove-carousel-dot {
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		background: none;
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.grove-carousel-dot::before {
		content: "";
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--color-text-subtle);
		transition:
			width 0.2s,
			background 0.2s;
	}

	.grove-carousel-dot[aria-current="true"]::before {
		width: 1.25rem;
		background: var(--color-primary);
	}

	.grove-carousel-nav:focus-visible,
	.grove-carousel-dot:focus-visible,
	:global(.grove-carousel .grove-gallery-open:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.grove-carousel-nav,
		.grove-carousel-dot::before {
			transition: none;
		}
	}
</style>
