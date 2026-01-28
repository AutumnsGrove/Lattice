<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { PlacedAsset, Point } from './types';
	import type { Component as SvelteComponent } from 'svelte';

	interface Props {
		asset: PlacedAsset;
		isSelected?: boolean;
		animationsEnabled?: boolean;
		onSelect?: () => void;
		onMove?: (position: Point) => void;
	}

	let {
		asset,
		isSelected = false,
		animationsEnabled = true,
		onSelect,
		onMove
	}: Props = $props();

	let component: SvelteComponent | null = $state(null);
	let containerElement: HTMLDivElement | null = $state(null);
	let isDragging = $state(false);
	let dragStart: Point = $state({ x: 0, y: 0 });
	let positionStart: Point = $state({ x: 0, y: 0 });

	// Dynamically import the nature component
	$effect(() => {
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
				component = module.default;
			} catch (error) {
				console.error(`Failed to load component ${asset.componentName}:`, error);
			}
		};

		loadComponent();
	});

	// Calculate transform style
	const transformStyle = $derived(
		`translate(${asset.position.x}px, ${asset.position.y}px) scale(${asset.scale}) rotate(${asset.rotation}deg)`
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
			class="absolute inset-0 -m-2 pointer-events-none rounded-lg border-2 border-blue-400 bg-blue-50/10 backdrop-blur-sm shadow-lg"
			style="z-index: -1;"
		/>
	{/if}

	<!-- Render the nature component -->
	{#if component}
		<svelte:component this={component} {...componentProps} />
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
