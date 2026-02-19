<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { TerrariumScene, PlacedAsset, Point, AssetCategory } from './types';
	import PlacedAssetComponent from './PlacedAsset.svelte';

	interface Props {
		scene: TerrariumScene;
		selectedAssetId: string | null;
		animationsEnabled?: boolean;
		panOffset?: Point;
		zoom?: number;
		onAssetSelect?: (assetId: string | null) => void;
		onAssetMove?: (assetId: string, position: Point) => void;
		onAssetScale?: (assetId: string, scale: number) => void;
		onAssetRotate?: (assetId: string, rotation: number) => void;
		onCanvasClick?: () => void;
		onPan?: (offset: Point) => void;
		onZoom?: (level: number) => void;
		onAssetDrop?: (name: string, category: AssetCategory, position: Point) => void;
	}

	let {
		scene,
		selectedAssetId,
		animationsEnabled = true,
		panOffset = { x: 0, y: 0 },
		zoom = 1,
		onAssetSelect,
		onAssetMove,
		onAssetScale,
		onAssetRotate,
		onCanvasClick,
		onPan,
		onZoom,
		onAssetDrop
	}: Props = $props();

	let canvasElement: HTMLDivElement | null = $state(null);
	let isPanning = $state(false);
	let panStart: Point = $state({ x: 0, y: 0 });
	let offsetStart: Point = $state({ x: 0, y: 0 });
	let isSpacePressed = $state(false);

	// Sort assets by zIndex for proper layering
	const sortedAssets = $derived(
		[...scene.assets].sort((a, b) => a.zIndex - b.zIndex)
	);

	// Canvas transform style with zoom
	const canvasTransform = $derived(
		`translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
	);

	function handleMouseDown(event: MouseEvent) {
		// Middle mouse button or Space + left click for panning
		const shouldPan = event.button === 1 || (isSpacePressed && event.button === 0);

		if (shouldPan) {
			event.preventDefault();
			isPanning = true;
			panStart = { x: event.clientX, y: event.clientY };
			offsetStart = { ...panOffset };

			if (canvasElement) {
				canvasElement.style.cursor = 'grabbing';
			}
		} else if (event.button === 0 && !isSpacePressed) {
			// Left click on empty canvas deselects
			const target = event.target as HTMLElement;
			if (target === canvasElement || target.closest('[data-canvas-background]')) {
				onCanvasClick?.();
			}
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isPanning) return;

		const dx = event.clientX - panStart.x;
		const dy = event.clientY - panStart.y;

		const newOffset = {
			x: offsetStart.x + dx,
			y: offsetStart.y + dy
		};

		onPan?.(newOffset);
	}

	function handleMouseUp() {
		if (isPanning) {
			isPanning = false;
			if (canvasElement) {
				canvasElement.style.cursor = isSpacePressed ? 'grab' : 'default';
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.code === 'Space' && !isSpacePressed) {
			isSpacePressed = true;
			if (canvasElement && !isPanning) {
				canvasElement.style.cursor = 'grab';
			}
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.code === 'Space') {
			isSpacePressed = false;
			if (canvasElement && !isPanning) {
				canvasElement.style.cursor = 'default';
			}
		}
	}

	function handleWheel(event: WheelEvent) {
		// Zoom with Ctrl/Cmd + scroll wheel
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			const delta = event.deltaY > 0 ? 0.9 : 1.1;
			const newZoom = zoom * delta;
			onZoom?.(newZoom);
		}
	}

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length === 2) {
			// Two-finger touch for panning
			event.preventDefault();
			isPanning = true;
			const touch = event.touches[0];
			panStart = { x: touch.clientX, y: touch.clientY };
			offsetStart = { ...panOffset };
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isPanning || event.touches.length !== 2) return;

		const touch = event.touches[0];
		const dx = touch.clientX - panStart.x;
		const dy = touch.clientY - panStart.y;

		const newOffset = {
			x: offsetStart.x + dx,
			y: offsetStart.y + dy
		};

		onPan?.(newOffset);
	}

	function handleTouchEnd() {
		if (isPanning) {
			isPanning = false;
		}
	}

	function handleAssetSelect(assetId: string) {
		onAssetSelect?.(assetId);
	}

	function handleAssetMove(assetId: string, position: Point) {
		onAssetMove?.(assetId, position);
	}

	// Drag and drop handlers for adding assets from palette
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (!event.dataTransfer || !canvasElement) return;

		try {
			const data = JSON.parse(event.dataTransfer.getData('application/json'));
			if (data.name && data.category) {
				// Calculate drop position relative to canvas, accounting for pan offset and zoom
				const rect = canvasElement.getBoundingClientRect();
				const position: Point = {
					x: (event.clientX - rect.left - panOffset.x) / zoom,
					y: (event.clientY - rect.top - panOffset.y) / zoom
				};
				onAssetDrop?.(data.name, data.category, position);
			}
		} catch {
			// Invalid drop data, ignore
		}
	}

	// Set up global event listeners for mouse and keyboard
	$effect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
		const handleGlobalMouseUp = () => handleMouseUp();

		if (isPanning) {
			window.addEventListener('mousemove', handleGlobalMouseMove);
			window.addEventListener('mouseup', handleGlobalMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleGlobalMouseMove);
				window.removeEventListener('mouseup', handleGlobalMouseUp);
			};
		}
	});

	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<div
	bind:this={canvasElement}
	class="relative w-full h-full overflow-hidden select-none"
	role="application"
	tabindex="0"
	aria-label="Terrarium canvas workspace - Use arrow keys to pan, Ctrl/Cmd+scroll to zoom"
	onmousedown={handleMouseDown}
	onwheel={handleWheel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<!-- Canvas background -->
	<div
		data-canvas-background
		class="absolute inset-0"
		style="background: {scene.canvas.background}; width: {scene.canvas.width}px; height: {scene.canvas.height}px; transform: {canvasTransform};"
	>
		<!-- Grid overlay -->
		{#if scene.canvas.gridEnabled}
			<div
				class="absolute inset-0 pointer-events-none"
				style="
					background-image:
						linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
						linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
					background-size: {scene.canvas.gridSize}px {scene.canvas.gridSize}px;
				"
			></div>
		{/if}

		<!-- Placed assets -->
		<div class="relative w-full h-full">
			{#each sortedAssets as asset (asset.id)}
				<PlacedAssetComponent
					{asset}
					isSelected={asset.id === selectedAssetId}
					{animationsEnabled}
					{zoom}
					onSelect={() => handleAssetSelect(asset.id)}
					onMove={(position) => handleAssetMove(asset.id, position)}
					onScale={(scale) => onAssetScale?.(asset.id, scale)}
					onRotate={(rotation) => onAssetRotate?.(asset.id, rotation)}
				/>
			{/each}
		</div>
	</div>
</div>

<style>
	/* Custom cursor styles */
	[data-canvas-background] {
		user-select: none;
		-webkit-user-select: none;
	}
</style>
