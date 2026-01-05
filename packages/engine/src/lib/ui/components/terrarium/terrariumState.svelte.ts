/**
 * Grove — A place to Be
 * Copyright (c) 2025 Autumn Brown
 * Licensed under AGPL-3.0
 */

/**
 * Terrarium State Management
 *
 * Centralized state management for the Terrarium creative canvas using Svelte 5 runes.
 * Manages scene, assets, selection, and canvas interaction state.
 */

import type {
	TerrariumScene,
	PlacedAsset,
	Point,
	AssetCategory,
	ToolMode
} from './types';
import { DEFAULT_SCENE } from './types';
import { TERRARIUM_CONFIG } from '$lib/config/terrarium';

/**
 * Calculate complexity cost of a placed asset
 */
function calculateAssetComplexity(asset: PlacedAsset): number {
	let cost: number = TERRARIUM_CONFIG.complexity.weights.normal;

	if (asset.animationEnabled) {
		cost = TERRARIUM_CONFIG.complexity.weights.animated;
	} else if (asset.scale > 1.5 || asset.scale < 0.5) {
		cost = TERRARIUM_CONFIG.complexity.weights.scaled;
	}

	return cost;
}

/**
 * Calculate total scene complexity
 */
function calculateSceneComplexity(assets: PlacedAsset[]): number {
	return assets.reduce((total, asset) => total + calculateAssetComplexity(asset), 0);
}

/**
 * Create a new empty scene
 */
function createEmptyScene(): TerrariumScene {
	const now = new Date().toISOString();
	return {
		...DEFAULT_SCENE,
		id: crypto.randomUUID(),
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Get the highest z-index in the scene
 */
function getMaxZIndex(assets: PlacedAsset[]): number {
	if (assets.length === 0) return 0;
	return Math.max(...assets.map((a) => a.zIndex));
}

/**
 * Create the Terrarium state manager
 */
export function createTerrariumState() {
	let scene = $state<TerrariumScene>(createEmptyScene());
	let selectedAssetId = $state<string | null>(null);
	let isDragging = $state<boolean>(false);
	let animationsEnabled = $state<boolean>(true);
	let panOffset = $state<Point>({ x: 0, y: 0 });
	let toolMode = $state<ToolMode>('select');

	const selectedAsset = $derived<PlacedAsset | null>(
		scene.assets.find((a) => a.id === selectedAssetId) ?? null
	);

	const assetCount = $derived<number>(scene.assets.length);

	const complexityUsage = $derived<number>(
		Math.min(
			calculateSceneComplexity(scene.assets) / TERRARIUM_CONFIG.complexity.maxComplexity,
			1
		)
	);

	const canAddAsset = $derived<boolean>(
		calculateSceneComplexity(scene.assets) < TERRARIUM_CONFIG.complexity.maxComplexity
	);

	function addAsset(componentName: string, category: AssetCategory, position: Point): string {
		const id = crypto.randomUUID();
		const maxZ = getMaxZIndex(scene.assets);

		const newAsset: PlacedAsset = {
			id,
			componentName,
			category,
			position: { ...position },
			scale: TERRARIUM_CONFIG.asset.defaultScale,
			rotation: 0,
			zIndex: maxZ + 1,
			props: {},
			animationEnabled: animationsEnabled
		};

		scene.assets.push(newAsset);
		scene.updatedAt = new Date().toISOString();
		selectedAssetId = id;

		return id;
	}

	function updateAsset(id: string, updates: Partial<PlacedAsset>): void {
		const index = scene.assets.findIndex((a) => a.id === id);
		if (index === -1) return;

		scene.assets[index] = {
			...scene.assets[index],
			...updates,
			id,
			position: updates.position
				? { ...updates.position }
				: scene.assets[index].position,
			props: updates.props ? { ...updates.props } : scene.assets[index].props
		};

		scene.updatedAt = new Date().toISOString();
	}

	function deleteAsset(id: string): void {
		const index = scene.assets.findIndex((a) => a.id === id);
		if (index === -1) return;

		scene.assets.splice(index, 1);
		scene.updatedAt = new Date().toISOString();

		if (selectedAssetId === id) {
			selectedAssetId = null;
		}
	}

	function duplicateAsset(id: string): string {
		const asset = scene.assets.find((a) => a.id === id);
		if (!asset) return '';

		const newId = crypto.randomUUID();
		const maxZ = getMaxZIndex(scene.assets);

		const duplicatedAsset: PlacedAsset = {
			...asset,
			id: newId,
			position: {
				x: asset.position.x + 20,
				y: asset.position.y + 20
			},
			zIndex: maxZ + 1,
			props: { ...asset.props }
		};

		scene.assets.push(duplicatedAsset);
		scene.updatedAt = new Date().toISOString();
		selectedAssetId = newId;

		return newId;
	}

	function selectAsset(id: string | null): void {
		selectedAssetId = id;
	}

	function moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
		const index = scene.assets.findIndex((a) => a.id === id);
		if (index === -1) return;

		const asset = scene.assets[index];
		const currentZ = asset.zIndex;

		if (direction === 'top') {
			const maxZ = getMaxZIndex(scene.assets);
			if (currentZ === maxZ) return;
			asset.zIndex = maxZ + 1;
		} else if (direction === 'bottom') {
			const minZ = Math.min(...scene.assets.map((a) => a.zIndex));
			if (currentZ === minZ) return;
			asset.zIndex = minZ - 1;
		} else if (direction === 'up') {
			const higherAssets = scene.assets.filter((a) => a.zIndex > currentZ);
			if (higherAssets.length === 0) return;

			const nextZ = Math.min(...higherAssets.map((a) => a.zIndex));
			const swapAsset = scene.assets.find((a) => a.zIndex === nextZ);

			if (swapAsset) {
				swapAsset.zIndex = currentZ;
				asset.zIndex = nextZ;
			}
		} else if (direction === 'down') {
			const lowerAssets = scene.assets.filter((a) => a.zIndex < currentZ);
			if (lowerAssets.length === 0) return;

			const prevZ = Math.max(...lowerAssets.map((a) => a.zIndex));
			const swapAsset = scene.assets.find((a) => a.zIndex === prevZ);

			if (swapAsset) {
				swapAsset.zIndex = currentZ;
				asset.zIndex = prevZ;
			}
		}

		scene.updatedAt = new Date().toISOString();
	}

	function setScene(newScene: TerrariumScene): void {
		scene = {
			...newScene,
			canvas: { ...newScene.canvas },
			assets: newScene.assets.map((asset) => ({
				...asset,
				position: { ...asset.position },
				props: { ...asset.props }
			}))
		};
		selectedAssetId = null;
		panOffset = { x: 0, y: 0 };
	}

	function resetScene(): void {
		scene = createEmptyScene();
		selectedAssetId = null;
		panOffset = { x: 0, y: 0 };
	}

	function toggleAnimations(): void {
		animationsEnabled = !animationsEnabled;

		for (const asset of scene.assets) {
			asset.animationEnabled = animationsEnabled;
		}

		scene.updatedAt = new Date().toISOString();
	}

	function toggleGrid(): void {
		scene.canvas.gridEnabled = !scene.canvas.gridEnabled;
		scene.updatedAt = new Date().toISOString();
	}

	function setGridSize(size: 16 | 32 | 64): void {
		scene.canvas.gridSize = size;
		scene.updatedAt = new Date().toISOString();
	}

	function setPanOffset(offset: Point): void {
		panOffset = { ...offset };
	}

	function setToolMode(mode: ToolMode): void {
		toolMode = mode;
		if (mode === 'pan') {
			selectedAssetId = null;
		}
	}

	return {
		get scene() {
			return scene;
		},
		get selectedAssetId() {
			return selectedAssetId;
		},
		get isDragging() {
			return isDragging;
		},
		set isDragging(value: boolean) {
			isDragging = value;
		},
		get animationsEnabled() {
			return animationsEnabled;
		},
		get panOffset() {
			return panOffset;
		},
		get toolMode() {
			return toolMode;
		},
		get selectedAsset() {
			return selectedAsset;
		},
		get assetCount() {
			return assetCount;
		},
		get canAddAsset() {
			return canAddAsset;
		},
		get complexityUsage() {
			return complexityUsage;
		},
		addAsset,
		updateAsset,
		deleteAsset,
		duplicateAsset,
		selectAsset,
		moveLayer,
		setScene,
		resetScene,
		toggleAnimations,
		toggleGrid,
		setGridSize,
		setPanOffset,
		setToolMode
	};
}

export type TerrariumState = ReturnType<typeof createTerrariumState>;
