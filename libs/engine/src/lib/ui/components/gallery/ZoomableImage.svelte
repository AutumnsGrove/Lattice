<script>
	/**
	 * ZoomableImage - Image with zoom and pan functionality
	 * Click to cycle through zoom levels, drag to pan when zoomed
	 *
	 * @prop {string} src - Image source URL
	 * @prop {string} alt - Alt text for accessibility
	 * @prop {boolean} isActive - When false, resets zoom/pan state
	 * @prop {string} class - Additional CSS classes
	 */
	let { src = '', alt = '', isActive = true, class: className = '' } = $props();

	// Zoom state: 0 = normal, 1 = medium zoom (1.5x), 2 = max zoom (2.5x)
	let zoomLevel = $state(0);

	// Pan/drag state for zoomed images
	let isDragging = $state(false);
	let panX = $state(0);
	let panY = $state(0);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragStartPanX = $state(0);
	let dragStartPanY = $state(0);
	let totalDragDistance = $state(0);

	// Derived scale value based on zoom level
	let scaleValue = $derived(zoomLevel === 0 ? 1 : zoomLevel === 1 ? 1.5 : 2.5);

	// Reset zoom and pan when isActive becomes false or src changes
	$effect(() => {
		if (!isActive) {
			zoomLevel = 0;
			panX = 0;
			panY = 0;
			isDragging = false;
		}
	});

	// Reset when image source changes
	$effect(() => {
		// Track src to trigger reset
		src;
		zoomLevel = 0;
		panX = 0;
		panY = 0;
		isDragging = false;
	});

	function cycleZoom() {
		zoomLevel = (zoomLevel + 1) % 3;
		// Reset pan when zooming out to level 0
		if (zoomLevel === 0) {
			panX = 0;
			panY = 0;
		}
	}

	// Mouse event handlers for drag/pan
	function handleMouseDown(/** @type {MouseEvent} */ event) {
		if (zoomLevel === 0) return;

		isDragging = true;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragStartPanX = panX;
		dragStartPanY = panY;
		totalDragDistance = 0;
		event.preventDefault();
	}

	function handleMouseMove(/** @type {MouseEvent} */ event) {
		if (!isDragging) return;

		const deltaX = event.clientX - dragStartX;
		const deltaY = event.clientY - dragStartY;

		panX = dragStartPanX + deltaX;
		panY = dragStartPanY + deltaY;
		totalDragDistance += Math.abs(deltaX) + Math.abs(deltaY);
	}

	function handleMouseUp() {
		isDragging = false;
	}

	// Touch event handlers for drag/pan on mobile
	function handleTouchStart(/** @type {TouchEvent} */ event) {
		if (zoomLevel === 0) return;

		// Only handle single touch for panning
		if (event.touches.length === 1) {
			isDragging = true;
			dragStartX = event.touches[0].clientX;
			dragStartY = event.touches[0].clientY;
			dragStartPanX = panX;
			dragStartPanY = panY;
			totalDragDistance = 0;
			event.preventDefault();
		}
	}

	function handleTouchMove(/** @type {TouchEvent} */ event) {
		if (!isDragging || event.touches.length !== 1) return;

		const deltaX = event.touches[0].clientX - dragStartX;
		const deltaY = event.touches[0].clientY - dragStartY;

		panX = dragStartPanX + deltaX;
		panY = dragStartPanY + deltaY;
		totalDragDistance += Math.abs(deltaX) + Math.abs(deltaY);
		event.preventDefault();
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	// Click handler that distinguishes between click and drag
	function handleClick(/** @type {MouseEvent} */ event) {
		// If we dragged more than 5px, don't treat as click
		if (totalDragDistance > 5) {
			totalDragDistance = 0;
			return;
		}
		cycleZoom();
	}

	// Keyboard handler for accessibility
	function handleKeydown(/** @type {KeyboardEvent} */ event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			cycleZoom();
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<button
	class="zoomable-image-wrapper"
	onclick={handleClick}
	onkeydown={handleKeydown}
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	aria-label="Click to zoom image"
>
	<img
		{src}
		{alt}
		class="zoomable-image {className}"
		class:zoomed={zoomLevel > 0}
		class:dragging={isDragging}
		style="transform: translate({panX}px, {panY}px) scale({scaleValue})"
		loading="lazy"
		decoding="async"
	/>
</button>

<style>
	.zoomable-image-wrapper {
		border: none;
		background: none;
		padding: 0;
		margin: 0;
		display: inline-block;
		cursor: zoom-in;
	}

	.zoomable-image-wrapper:has(.zoomable-image.zoomed) {
		cursor: grab;
	}

	.zoomable-image-wrapper:has(.zoomable-image.dragging) {
		cursor: grabbing;
	}

	.zoomable-image {
		display: block;
		transition: transform 0.3s ease;
		user-select: none;
		-webkit-user-drag: none;
	}

	.zoomable-image.dragging {
		transition: none;
	}
</style>
