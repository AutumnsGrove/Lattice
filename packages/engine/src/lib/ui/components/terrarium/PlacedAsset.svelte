<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { PlacedAsset, Point } from './types';
	import type { Component as SvelteComponent } from 'svelte';

	// Module-level cache for dynamically imported components
	// Prevents redundant imports when multiple PlacedAssets use the same component
	const componentCache = new Map<string, SvelteComponent>();

	interface Props {
		asset: PlacedAsset;
		isSelected?: boolean;
		animationsEnabled?: boolean;
		zoom?: number;
		onSelect?: () => void;
		onMove?: (position: Point) => void;
		onScale?: (scale: number) => void;
		onRotate?: (rotation: number) => void;
	}

	let {
		asset,
		isSelected = false,
		animationsEnabled = true,
		zoom = 1,
		onSelect,
		onMove,
		onScale,
		onRotate
	}: Props = $props();

	let component: SvelteComponent | null = $state(null);
	let containerElement: HTMLDivElement | null = $state(null);
	let isDragging = $state(false);
	let isResizing = $state(false);
	let isRotating = $state(false);
	let dragStart: Point = $state({ x: 0, y: 0 });
	let positionStart: Point = $state({ x: 0, y: 0 });
	let scaleStart = $state(1);
	let rotationStart = $state(0);
	let assetCenter: Point = $state({ x: 0, y: 0 });

	// Dynamically import the nature component (with module-level caching)
	$effect(() => {
		const cacheKey = `${asset.category}/${asset.componentName}`;

		// Check cache first
		const cached = componentCache.get(cacheKey);
		if (cached) {
			component = cached;
			return;
		}

		const loadComponent = async () => {
			try {
				let module;
				switch (asset.category) {
					case 'trees':
						module = await import(`../nature/trees/${asset.componentName}.svelte`);
						break;
					case 'creatures':
						module = await import(`../nature/creatures/${asset.componentName}.svelte`);
						break;
					case 'botanical':
						module = await import(`../nature/botanical/${asset.componentName}.svelte`);
						break;
					case 'ground':
						module = await import(`../nature/ground/${asset.componentName}.svelte`);
						break;
					case 'sky':
						module = await import(`../nature/sky/${asset.componentName}.svelte`);
						break;
					case 'structural':
						module = await import(`../nature/structural/${asset.componentName}.svelte`);
						break;
					case 'water':
						module = await import(`../nature/water/${asset.componentName}.svelte`);
						break;
					case 'weather':
						module = await import(`../nature/weather/${asset.componentName}.svelte`);
						break;
					default:
						throw new Error(`Unknown category: ${asset.category}`);
				}
				// Cache the component for future use
				componentCache.set(cacheKey, module.default);
				component = module.default;
			} catch (error) {
				console.error(`Failed to load component ${asset.componentName}:`, error);
			}
		};

		loadComponent();
	});

	// Calculate transform style with flip support
	const scaleX = $derived(asset.flipX ? -asset.scale : asset.scale);
	const scaleY = $derived(asset.flipY ? -asset.scale : asset.scale);
	const transformStyle = $derived(
		`translate(${asset.position.x}px, ${asset.position.y}px) scale(${scaleX}, ${scaleY}) rotate(${asset.rotation}deg)`
	);

	// Component props including animation state
	const componentProps = $derived({
		...asset.props,
		animate: animationsEnabled && asset.animationEnabled
	});

	function handleMouseDown(event: MouseEvent) {
		if (event.button !== 0) return; // Only left click

		event.stopPropagation();

		// Select this asset
		onSelect?.();

		// Start dragging
		isDragging = true;
		dragStart = { x: event.clientX, y: event.clientY };
		positionStart = { ...asset.position };

		if (containerElement) {
			containerElement.style.cursor = 'grabbing';
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;

		const dx = event.clientX - dragStart.x;
		const dy = event.clientY - dragStart.y;

		const newPosition = {
			x: positionStart.x + dx,
			y: positionStart.y + dy
		};

		onMove?.(newPosition);
	}

	function handleMouseUp() {
		if (isDragging) {
			isDragging = false;
			if (containerElement) {
				containerElement.style.cursor = isSelected ? 'grab' : 'pointer';
			}
		}
	}

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;

		event.stopPropagation();

		// Select this asset
		onSelect?.();

		// Start dragging
		const touch = event.touches[0];
		isDragging = true;
		dragStart = { x: touch.clientX, y: touch.clientY };
		positionStart = { ...asset.position };
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging || event.touches.length !== 1) return;

		event.preventDefault();

		const touch = event.touches[0];
		const dx = touch.clientX - dragStart.x;
		const dy = touch.clientY - dragStart.y;

		const newPosition = {
			x: positionStart.x + dx,
			y: positionStart.y + dy
		};

		onMove?.(newPosition);
	}

	function handleTouchEnd() {
		if (isDragging) {
			isDragging = false;
		}
	}

	// Get center position of the asset for resize/rotate calculations
	function getAssetCenter(): Point {
		if (!containerElement) return { x: 0, y: 0 };
		const rect = containerElement.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		};
	}

	// Resize handlers
	function handleResizeStart(event: MouseEvent) {
		event.stopPropagation();
		event.preventDefault();

		isResizing = true;
		assetCenter = getAssetCenter();
		scaleStart = asset.scale;

		// Calculate initial distance from center to mouse
		const dx = event.clientX - assetCenter.x;
		const dy = event.clientY - assetCenter.y;
		dragStart = { x: Math.sqrt(dx * dx + dy * dy), y: 0 };
	}

	function handleResizeMove(event: MouseEvent) {
		if (!isResizing) return;

		// Calculate new distance from center to mouse
		const dx = event.clientX - assetCenter.x;
		const dy = event.clientY - assetCenter.y;
		const currentDistance = Math.sqrt(dx * dx + dy * dy);

		// Scale proportionally based on distance ratio
		const ratio = currentDistance / dragStart.x;
		const newScale = Math.max(0.1, Math.min(5, scaleStart * ratio));
		onScale?.(newScale);
	}

	function handleResizeEnd() {
		isResizing = false;
	}

	// Rotation handlers
	function handleRotateStart(event: MouseEvent) {
		event.stopPropagation();
		event.preventDefault();

		isRotating = true;
		assetCenter = getAssetCenter();
		rotationStart = asset.rotation;

		// Calculate initial angle
		const dx = event.clientX - assetCenter.x;
		const dy = event.clientY - assetCenter.y;
		dragStart = { x: Math.atan2(dy, dx), y: 0 };
	}

	function handleRotateMove(event: MouseEvent) {
		if (!isRotating) return;

		// Calculate current angle
		const dx = event.clientX - assetCenter.x;
		const dy = event.clientY - assetCenter.y;
		const currentAngle = Math.atan2(dy, dx);

		// Convert radians to degrees and apply rotation
		const angleDiff = (currentAngle - dragStart.x) * (180 / Math.PI);
		let newRotation = rotationStart + angleDiff;

		// Normalize to 0-360
		while (newRotation < 0) newRotation += 360;
		while (newRotation >= 360) newRotation -= 360;

		onRotate?.(newRotation);
	}

	function handleRotateEnd() {
		isRotating = false;
	}

	// Set up global event listeners for dragging
	$effect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
		const handleGlobalMouseUp = () => handleMouseUp();

		if (isDragging) {
			window.addEventListener('mousemove', handleGlobalMouseMove);
			window.addEventListener('mouseup', handleGlobalMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleGlobalMouseMove);
				window.removeEventListener('mouseup', handleGlobalMouseUp);
			};
		}
	});

	// Set up global event listeners for resizing
	$effect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => handleResizeMove(e);
		const handleGlobalMouseUp = () => handleResizeEnd();

		if (isResizing) {
			window.addEventListener('mousemove', handleGlobalMouseMove);
			window.addEventListener('mouseup', handleGlobalMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleGlobalMouseMove);
				window.removeEventListener('mouseup', handleGlobalMouseUp);
			};
		}
	});

	// Set up global event listeners for rotating
	$effect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => handleRotateMove(e);
		const handleGlobalMouseUp = () => handleRotateEnd();

		if (isRotating) {
			window.addEventListener('mousemove', handleGlobalMouseMove);
			window.addEventListener('mouseup', handleGlobalMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleGlobalMouseMove);
				window.removeEventListener('mouseup', handleGlobalMouseUp);
			};
		}
	});
</script>

<div
	bind:this={containerElement}
	class="absolute top-0 left-0 transition-none {isSelected ? 'selected' : ''}"
	class:cursor-grab={isSelected && !isDragging}
	class:cursor-grabbing={isDragging}
	class:cursor-pointer={!isSelected && !isDragging}
	style="
		transform: {transformStyle};
		transform-origin: center center;
		z-index: {asset.zIndex};
	"
	role="button"
	tabindex="0"
	aria-label="{asset.componentName} at position {asset.position.x}, {asset.position.y}"
	aria-pressed={isSelected}
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<!-- Selection border with glass effect -->
	{#if isSelected}
		<div
			class="absolute inset-0 -m-1 pointer-events-none rounded border-2 border-blue-400/70"
			style="z-index: -1;"
		></div>

		<!-- Rotation handle (above the asset) -->
		<div
			class="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
			style="bottom: calc(100% + 4px);"
		>
			<!-- Connecting line -->
			<div class="w-px h-3 bg-blue-400/70"></div>
			<!-- Rotation circle -->
			<button
				class="w-3 h-3 rounded-full bg-white border-2 border-blue-400 cursor-grab hover:bg-blue-50 hover:border-blue-500 active:cursor-grabbing shadow-sm"
				onmousedown={handleRotateStart}
				aria-label="Rotate asset"
			></button>
		</div>

		<!-- Resize handles (corners only for proportional scaling) -->
		<!-- Top-left -->
		<button
			class="resize-handle absolute w-2 h-2 bg-white border border-blue-400 rounded-sm cursor-nwse-resize hover:bg-blue-50 hover:border-blue-500"
			style="top: -4px; left: -4px;"
			onmousedown={handleResizeStart}
			aria-label="Resize from top-left corner"
		></button>

		<!-- Top-right -->
		<button
			class="resize-handle absolute w-2 h-2 bg-white border border-blue-400 rounded-sm cursor-nesw-resize hover:bg-blue-50 hover:border-blue-500"
			style="top: -4px; right: -4px;"
			onmousedown={handleResizeStart}
			aria-label="Resize from top-right corner"
		></button>

		<!-- Bottom-left -->
		<button
			class="resize-handle absolute w-2 h-2 bg-white border border-blue-400 rounded-sm cursor-nesw-resize hover:bg-blue-50 hover:border-blue-500"
			style="bottom: -4px; left: -4px;"
			onmousedown={handleResizeStart}
			aria-label="Resize from bottom-left corner"
		></button>

		<!-- Bottom-right -->
		<button
			class="resize-handle absolute w-2 h-2 bg-white border border-blue-400 rounded-sm cursor-nwse-resize hover:bg-blue-50 hover:border-blue-500"
			style="bottom: -4px; right: -4px;"
			onmousedown={handleResizeStart}
			aria-label="Resize from bottom-right corner"
		></button>
	{/if}

	<!-- Render the nature component -->
	{#if component}
		{@const Component = component}
		<Component {...componentProps} />
	{:else}
		<!-- Loading placeholder -->
		<div class="w-16 h-16 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
			<div class="text-xs text-gray-500">Loading...</div>
		</div>
	{/if}
</div>

<style>
	.selected {
		/* Ensure selected assets are interactive */
		pointer-events: auto;
	}

	/* Prevent text selection during drag */
	div {
		user-select: none;
		-webkit-user-select: none;
	}

	/* Smooth hover effect for non-selected assets */
	div:not(.selected):hover {
		filter: brightness(1.05);
	}
</style>
