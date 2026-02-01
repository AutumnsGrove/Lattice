<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * GlassCarousel - A stack-style carousel with glassmorphism styling
	 *
	 * Mobile-first carousel where cards stack on top of each other.
	 * Supports images out of the box, or custom content via children snippet.
	 *
	 * Navigation: touch/swipe, mouse drag, click (arrows/dots), keyboard (arrow keys).
	 *
	 * @example Image carousel
	 * ```svelte
	 * <GlassCarousel images={[
	 *   { url: '/photo1.jpg', alt: 'Beach sunset', caption: 'Summer vibes' },
	 *   { url: '/photo2.jpg', alt: 'Mountain view' }
	 * ]} />
	 * ```
	 *
	 * @example Custom content carousel
	 * ```svelte
	 * <GlassCarousel itemCount={3} let:index>
	 *   {#snippet item(index)}
	 *     <TestimonialCard data={testimonials[index]} />
	 *   {/snippet}
	 * </GlassCarousel>
	 * ```
	 */

	interface CarouselImage {
		url: string;
		alt: string;
		caption?: string;
	}

	/** Custom content renderer type - receives slide index */
	type ItemRenderer = Snippet<[number]>;

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
		/** Array of images to display */
		images?: CarouselImage[];
		/** Number of items when using custom content (ignored if images provided) */
		itemCount?: number;
		/** Show navigation dots */
		showDots?: boolean;
		/** Show arrow buttons */
		showArrows?: boolean;
		/** Enable autoplay (disabled by default) */
		autoplay?: boolean;
		/** Autoplay interval in milliseconds */
		autoplayInterval?: number;
		/** Visual variant */
		variant?: "default" | "frosted" | "minimal";
		/** Custom class name */
		class?: string;
		/** Custom content renderer - receives index */
		item?: ItemRenderer;
	}

	let {
		images = [],
		itemCount = 0,
		showDots = true,
		showArrows = true,
		autoplay = false,
		autoplayInterval = 5000,
		variant = "default",
		class: className,
		item,
		...restProps
	}: Props = $props();

	// Determine total count from images or itemCount
	let totalItems = $derived(images.length > 0 ? images.length : itemCount);

	// Current slide state
	let currentIndex = $state(0);
	let isAnimating = $state(false);

	// Touch/drag state
	let touchStartX = $state(0);
	let touchCurrentX = $state(0);
	let isDragging = $state(false);
	let dragOffset = $state(0);

	// Autoplay interval reference
	let autoplayTimer: ReturnType<typeof setInterval> | null = null;

	// Configuration constants
	const ANIMATION_DURATION_MS = 400;
	const SWIPE_THRESHOLD_PX = 50;
	const DRAG_INFLUENCE_FACTOR = 0.3;
	const MIN_CARD_SCALE = 0.85;
	const SCALE_STEP = 0.05;
	const CARD_OFFSET_X = 20;
	const CARD_OFFSET_Y = 8;
	const MIN_OPACITY = 0.4;
	const OPACITY_STEP = 0.3;

	function goTo(index: number) {
		if (isAnimating || index < 0 || index >= totalItems || index === currentIndex) return;

		isAnimating = true;
		currentIndex = index;

		setTimeout(() => {
			isAnimating = false;
		}, ANIMATION_DURATION_MS);
	}

	function goNext() {
		if (currentIndex < totalItems - 1) {
			goTo(currentIndex + 1);
		} else {
			// Loop back to start
			goTo(0);
		}
	}

	function goPrev() {
		if (currentIndex > 0) {
			goTo(currentIndex - 1);
		} else {
			// Loop to end
			goTo(totalItems - 1);
		}
	}

	// Touch handlers
	function handleTouchStart(event: TouchEvent) {
		if (isAnimating) return;
		touchStartX = event.touches[0].clientX;
		touchCurrentX = touchStartX;
		isDragging = true;
		stopAutoplay();
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging) return;
		touchCurrentX = event.touches[0].clientX;
		dragOffset = touchCurrentX - touchStartX;
	}

	function handleTouchEnd() {
		if (!isDragging) return;

		const diff = touchStartX - touchCurrentX;

		if (Math.abs(diff) > SWIPE_THRESHOLD_PX) {
			if (diff > 0) {
				goNext();
			} else {
				goPrev();
			}
		}

		isDragging = false;
		dragOffset = 0;
		touchStartX = 0;
		touchCurrentX = 0;

		if (autoplay) startAutoplay();
	}

	// Mouse drag handlers (for desktop)
	function handleMouseDown(event: MouseEvent) {
		if (isAnimating) return;
		touchStartX = event.clientX;
		touchCurrentX = touchStartX;
		isDragging = true;
		stopAutoplay();
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;
		touchCurrentX = event.clientX;
		dragOffset = touchCurrentX - touchStartX;
	}

	function handleMouseUp() {
		handleTouchEnd();
	}

	function handleMouseLeave() {
		if (isDragging) {
			handleTouchEnd();
		}
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				goPrev();
				break;
			case 'ArrowRight':
				event.preventDefault();
				goNext();
				break;
			case 'Home':
				event.preventDefault();
				goTo(0);
				break;
			case 'End':
				event.preventDefault();
				goTo(totalItems - 1);
				break;
		}
	}

	// Autoplay controls
	function startAutoplay() {
		if (!autoplay || totalItems <= 1) return;
		stopAutoplay();
		autoplayTimer = setInterval(goNext, autoplayInterval);
	}

	function stopAutoplay() {
		if (autoplayTimer) {
			clearInterval(autoplayTimer);
			autoplayTimer = null;
		}
	}

	// Reset drag state helper
	function resetDragState() {
		isDragging = false;
		dragOffset = 0;
		touchStartX = 0;
		touchCurrentX = 0;
	}

	// Start/stop autoplay based on prop, with cleanup for drag state
	$effect(() => {
		if (autoplay && totalItems > 1) {
			startAutoplay();
		} else {
			stopAutoplay();
		}

		return () => {
			stopAutoplay();
			// Clean up drag state if component unmounts during drag
			if (isDragging) {
				resetDragState();
			}
		};
	});

	// Handle window-level mouseup for edge case: drag starts, mouse leaves window, released outside
	$effect(() => {
		if (!isDragging) return;

		const handleWindowMouseUp = () => handleMouseUp();
		window.addEventListener('mouseup', handleWindowMouseUp);

		return () => window.removeEventListener('mouseup', handleWindowMouseUp);
	});

	// Reset currentIndex if totalItems changes and current index is out of bounds
	$effect(() => {
		if (totalItems > 0 && currentIndex >= totalItems) {
			currentIndex = totalItems - 1;
		}
	});

	// Calculate card transforms for stack effect
	function getCardStyle(index: number): string {
		const offset = index - currentIndex;
		const dragInfluence = isDragging ? dragOffset * DRAG_INFLUENCE_FACTOR : 0;

		// Current card - special case
		if (offset === 0) {
			const translateX = isDragging ? dragOffset : 0;
			return `
				transform: translateX(${translateX}px) scale(1);
				opacity: 1;
				z-index: ${totalItems + 1};
			`;
		}

		// Cards behind or ahead - shared transform logic
		const depth = Math.abs(offset);
		const direction = offset < 0 ? -1 : 1;
		const scale = Math.max(MIN_CARD_SCALE, 1 - depth * SCALE_STEP);
		const translateX = direction * CARD_OFFSET_X * depth + dragInfluence;
		const translateY = CARD_OFFSET_Y * depth;
		const opacity = Math.max(MIN_OPACITY, 1 - depth * OPACITY_STEP);
		const zIndex = totalItems - depth;

		return `
			transform: translateX(${translateX}px) translateY(${translateY}px) scale(${scale});
			opacity: ${opacity};
			z-index: ${zIndex};
		`;
	}

	// Variant styles
	const variantClasses = {
		default: "bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md border-white/40 dark:border-emerald-800/25",
		frosted: "bg-white/70 dark:bg-emerald-950/35 backdrop-blur-lg border-white/50 dark:border-emerald-800/30",
		minimal: "bg-transparent border-transparent"
	};

	const containerClass = $derived(
		cn(
			"relative overflow-hidden rounded-2xl border p-4 outline-none",
			"focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
			variant !== "minimal" && variantClasses[variant],
			variant === "minimal" && "p-0",
			className
		)
	);
</script>

{#if totalItems > 0}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class={containerClass}
	role="region"
	aria-label="Image carousel"
	aria-roledescription="carousel"
	tabindex="0"
	onkeydown={handleKeydown}
	{...restProps}
>
	<!-- Cards stack -->
	<div
		class="relative w-full aspect-[4/3] select-none"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseLeave}
		role="presentation"
	>
		{#each { length: totalItems } as _, index (index)}
			<div
				class={cn(
					"absolute inset-0 rounded-xl overflow-hidden shadow-lg transition-all duration-[400ms] ease-out",
					"bg-white dark:bg-slate-900",
					isDragging && "transition-none"
				)}
				style={getCardStyle(index)}
				aria-hidden={index !== currentIndex}
			>
				{#if images.length > 0}
					<!-- Image mode -->
					<img
						src={images[index].url}
						alt={images[index].alt}
						class="w-full h-full object-cover"
						draggable="false"
						loading="lazy"
						decoding="async"
					/>
					{#if images[index].caption}
						<div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
							<p class="text-white text-sm font-medium">{images[index].caption}</p>
						</div>
					{/if}
				{:else if item}
					<!-- Custom content mode -->
					{@render item(index)}
				{/if}
			</div>
		{/each}
	</div>

	<!-- Navigation -->
	{#if totalItems > 1}
		<div class="flex items-center justify-between mt-4 px-2">
			<!-- Previous arrow -->
			{#if showArrows}
				<button
					type="button"
					class={cn(
						"w-10 h-10 rounded-full flex items-center justify-center",
						"bg-white/60 dark:bg-emerald-950/40 backdrop-blur-sm",
						"border border-white/40 dark:border-emerald-800/30",
						"text-slate-700 dark:text-slate-200",
						"hover:bg-white/80 dark:hover:bg-emerald-950/60",
						"transition-all duration-200",
						"disabled:opacity-40 disabled:cursor-not-allowed"
					)}
					onclick={goPrev}
					aria-label="Previous slide"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>
			{:else}
				<div></div>
			{/if}

			<!-- Dots -->
			{#if showDots}
				<div class="flex items-center gap-2">
					{#each { length: totalItems } as _, index (index)}
						<button
							type="button"
							class={cn(
								"h-2 rounded-full transition-all duration-300",
								index === currentIndex
									? "w-6 bg-emerald-600 dark:bg-emerald-400"
									: "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
							)}
							onclick={() => goTo(index)}
							aria-label={`Go to slide ${index + 1}`}
							aria-current={index === currentIndex ? "true" : undefined}
						></button>
					{/each}
				</div>
			{/if}

			<!-- Next arrow -->
			{#if showArrows}
				<button
					type="button"
					class={cn(
						"w-10 h-10 rounded-full flex items-center justify-center",
						"bg-white/60 dark:bg-emerald-950/40 backdrop-blur-sm",
						"border border-white/40 dark:border-emerald-800/30",
						"text-slate-700 dark:text-slate-200",
						"hover:bg-white/80 dark:hover:bg-emerald-950/60",
						"transition-all duration-200",
						"disabled:opacity-40 disabled:cursor-not-allowed"
					)}
					onclick={goNext}
					aria-label="Next slide"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			{:else}
				<div></div>
			{/if}
		</div>
	{/if}
</div>
{/if}
