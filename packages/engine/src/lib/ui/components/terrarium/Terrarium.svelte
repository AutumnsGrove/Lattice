<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
	import { createTerrariumState } from './terrariumState.svelte';
	import Canvas from './Canvas.svelte';
	import AssetPalette from './AssetPalette.svelte';
	import Toolbar from './Toolbar.svelte';
	import ExportDialog from './ExportDialog.svelte';
	import { exportSceneAsPNG } from './utils/export';
	import { TERRARIUM_CONFIG } from '$lib/config/terrarium';
	import type { AssetCategory, TerrariumScene } from './types';

	/**
	 * Terrarium - Main Container Component
	 *
	 * The primary container that orchestrates the entire Terrarium creative canvas.
	 * Manages state, coordinates child components, handles keyboard shortcuts,
	 * and manages persistence with localStorage.
	 */

	const STORAGE_KEY = 'terrarium-scene';

	const terrarium = createTerrariumState();
	let showExportDialog = $state(false);
	let canvasElement: HTMLDivElement | null = $state(null);

	function handleAssetSelect(name: string, category: AssetCategory) {
		if (!terrarium.canAddAsset) {
			// Complexity budget exceeded - UI should show visual feedback
			return;
		}

		const centerX = terrarium.scene.canvas.width / 2;
		const centerY = terrarium.scene.canvas.height / 2;

		terrarium.addAsset(name, category, { x: centerX, y: centerY });
	}

	function handleToggleAnimations() {
		terrarium.toggleAnimations();
	}

	function handleToggleGrid() {
		terrarium.toggleGrid();
	}

	function handleSetGridSize(size: 16 | 32 | 64) {
		terrarium.setGridSize(size);
	}

	function handleDelete() {
		if (terrarium.selectedAssetId) {
			terrarium.deleteAsset(terrarium.selectedAssetId);
		}
	}

	function handleDuplicate() {
		if (terrarium.selectedAssetId) {
			terrarium.duplicateAsset(terrarium.selectedAssetId);
		}
	}

	function handleExport() {
		showExportDialog = true;
	}

	function handleSave(): boolean {
		try {
			const sceneJson = JSON.stringify(terrarium.scene);

			// Proactive size validation before attempting to save
			if (sceneJson.length > TERRARIUM_CONFIG.scene.maxSizeBytes) {
				// Scene too large - warn user before attempting save
				return false;
			}

			localStorage.setItem(STORAGE_KEY, sceneJson);
			return true;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Storage quota exceeded - handled silently, UI should show feedback
			}
			return false;
		}
	}

	function handleRename(name: string) {
		const trimmed = name.trim();
		if (trimmed.length > 0 && trimmed.length <= TERRARIUM_CONFIG.scene.maxNameLength) {
			terrarium.scene.name = trimmed;
			terrarium.scene.updatedAt = new Date().toISOString();
		}
	}

	async function handleExportPNG(options: { scale: number; includeBackground: boolean }) {
		if (!canvasElement) {
			throw new Error('Canvas element not found');
		}

		await exportSceneAsPNG(canvasElement, terrarium.scene.name, {
			scale: options.scale,
			backgroundColor: options.includeBackground ? terrarium.scene.canvas.background : 'transparent',
			pauseAnimations: true
		});
	}

	function handleCloseExportDialog() {
		showExportDialog = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		const isInputField =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		if (isInputField && event.key !== 'Escape') {
			return;
		}

		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

		if (event.key === 'Delete' || event.key === 'Backspace') {
			if (!isInputField && terrarium.selectedAssetId) {
				event.preventDefault();
				handleDelete();
			}
		} else if (cmdOrCtrl && event.key === 'd') {
			event.preventDefault();
			if (terrarium.selectedAssetId) {
				handleDuplicate();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			terrarium.selectAsset(null);
			showExportDialog = false;
		} else if (event.key === 'g' && !cmdOrCtrl) {
			if (!isInputField) {
				event.preventDefault();
				handleToggleGrid();
			}
		} else if (event.key === 'a' && !cmdOrCtrl) {
			if (!isInputField) {
				event.preventDefault();
				handleToggleAnimations();
			}
		} else if (cmdOrCtrl && event.key === 's') {
			event.preventDefault();
			handleSave();
		}
	}

	function isValidScene(scene: unknown): scene is TerrariumScene {
		if (typeof scene !== 'object' || scene === null) return false;
		const s = scene as Record<string, unknown>;
		return (
			typeof s.id === 'string' &&
			typeof s.name === 'string' &&
			typeof s.canvas === 'object' &&
			Array.isArray(s.assets)
		);
	}

	function loadSceneFromStorage() {
		try {
			const storedScene = localStorage.getItem(STORAGE_KEY);
			if (storedScene) {
				const parsedScene = JSON.parse(storedScene);
				if (isValidScene(parsedScene)) {
					terrarium.setScene(parsedScene);
				} else {
					// Invalid scene format - clear and use default
					localStorage.removeItem(STORAGE_KEY);
				}
			}
		} catch {
			// Clear corrupted data silently
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	$effect(() => {
		loadSceneFromStorage();
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="terrarium-container flex h-screen w-screen overflow-hidden">
	<!-- Left Sidebar: Asset Palette -->
	<div class="flex-shrink-0" style="width: 280px;">
		<AssetPalette onAssetSelect={handleAssetSelect} />
	</div>

	<!-- Main Content Area -->
	<div class="flex flex-col flex-1 min-w-0">
		<!-- Top Toolbar -->
		<Toolbar
			bind:sceneName={terrarium.scene.name}
			animationsEnabled={terrarium.animationsEnabled}
			gridEnabled={terrarium.scene.canvas.gridEnabled}
			gridSize={terrarium.scene.canvas.gridSize}
			hasSelection={terrarium.selectedAssetId !== null}
			onToggleAnimations={handleToggleAnimations}
			onToggleGrid={handleToggleGrid}
			onSetGridSize={handleSetGridSize}
			onDelete={handleDelete}
			onDuplicate={handleDuplicate}
			onExport={handleExport}
			onSave={handleSave}
			onRename={handleRename}
		/>

		<!-- Canvas Area -->
		<div bind:this={canvasElement} class="flex-1 min-h-0 overflow-hidden">
			<Canvas
				scene={terrarium.scene}
				selectedAssetId={terrarium.selectedAssetId}
				animationsEnabled={terrarium.animationsEnabled}
				panOffset={terrarium.panOffset}
				onAssetSelect={(id) => terrarium.selectAsset(id)}
				onAssetMove={(id, position) => terrarium.updateAsset(id, { position })}
				onCanvasClick={() => terrarium.selectAsset(null)}
				onPan={(offset) => terrarium.setPanOffset(offset)}
			/>
		</div>
	</div>

	<!-- Export Dialog (Modal Overlay) -->
	<ExportDialog
		bind:open={showExportDialog}
		sceneName={terrarium.scene.name}
		onClose={handleCloseExportDialog}
		onExport={handleExportPNG}
	/>
</div>

<style>
	.terrarium-container {
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	}

	:global(.dark) .terrarium-container {
		background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
	}
</style>
