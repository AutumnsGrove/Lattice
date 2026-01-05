/**
 * Terrarium Type Definitions
 *
 * Core types for the Terrarium creative canvas system.
 */

import type { Component as SvelteComponent } from 'svelte';

// Asset categories matching nature component structure
export type AssetCategory =
	| 'trees'
	| 'creatures'
	| 'botanical'
	| 'ground'
	| 'sky'
	| 'structural'
	| 'water'
	| 'weather';

// Position on canvas
export interface Point {
	x: number;
	y: number;
}

// Size dimensions
export interface Size {
	width: number;
	height: number;
}

// Canvas settings
export interface CanvasSettings {
	width: number;
	height: number;
	background: string;
	gridEnabled: boolean;
	gridSize: 16 | 32 | 64;
}

// Asset metadata exported from each nature component
export interface AssetMeta {
	displayName: string;
	category: AssetCategory;
	isAnimated: boolean;
	defaultSize: Size;
	props: PropDefinition[];
}

// Property definition for configurable props
export interface PropDefinition {
	key: string;
	label: string;
	type: 'number' | 'boolean' | 'string' | 'select' | 'color';
	min?: number;
	max?: number;
	step?: number;
	options?: { value: string; label: string }[];
	default: unknown;
}

// Asset definition in registry
export interface AssetDefinition extends AssetMeta {
	name: string;
	load: () => Promise<{ default: SvelteComponent }>;
}

// Placed asset on canvas
export interface PlacedAsset {
	id: string;
	componentName: string;
	category: AssetCategory;
	position: Point;
	scale: number;
	rotation: number;
	zIndex: number;
	props: Record<string, unknown>;
	animationEnabled: boolean;
}

// Complete scene structure
export interface TerrariumScene {
	id: string;
	name: string;
	version: 1;
	canvas: CanvasSettings;
	assets: PlacedAsset[];
	createdAt: string;
	updatedAt: string;
}

// Decoration zones for Foliage integration
export type DecorationZone = 'header' | 'sidebar' | 'footer' | 'background';

// Decoration options
export interface DecorationOptions {
	opacity: number;
}

// Saved decoration
export interface Decoration {
	id: string;
	name: string;
	zone: DecorationZone;
	scene: TerrariumScene;
	options: DecorationOptions;
	thumbnail?: string;
	authorId?: string;
	isPublic: boolean;
	createdAt: string;
}

// Export options
export interface ExportOptions {
	scale?: number;
	backgroundColor?: string;
	pauseAnimations?: boolean;
	width?: number;
	height?: number;
}

// Drag state for asset manipulation
export interface DragState {
	isDragging: boolean;
	startPosition: Point;
	currentPosition: Point;
	assetId: string | null;
}

// Pan state for canvas navigation
export interface PanState {
	isPanning: boolean;
	offset: Point;
	startOffset: Point;
	startMouse: Point;
}

// Selection state
export interface SelectionState {
	selectedId: string | null;
	isMultiSelect: boolean;
	selectedIds: string[];
}

// Tool modes
export type ToolMode = 'select' | 'pan' | 'place';

// Toolbar action
export interface ToolbarAction {
	id: string;
	label: string;
	icon: string;
	shortcut?: string;
	action: () => void;
	disabled?: boolean;
}

// Default scene for initialization
export const DEFAULT_SCENE: TerrariumScene = {
	id: '',
	name: 'Untitled Scene',
	version: 1,
	canvas: {
		width: 1200,
		height: 800,
		background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 50%, #A8E6CF 100%)',
		gridEnabled: false,
		gridSize: 32
	},
	assets: [],
	createdAt: '',
	updatedAt: ''
};

// Default canvas backgrounds
export const CANVAS_BACKGROUNDS = [
	{
		name: 'Sky Gradient',
		value: 'linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 50%, #A8E6CF 100%)'
	},
	{
		name: 'Forest Dawn',
		value: 'linear-gradient(to bottom, #FEF3C7 0%, #FDE68A 30%, #34D399 100%)'
	},
	{
		name: 'Night Sky',
		value: 'linear-gradient(to bottom, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)'
	},
	{
		name: 'Sunset',
		value: 'linear-gradient(to bottom, #FDE68A 0%, #FB923C 40%, #EC4899 100%)'
	},
	{ name: 'Transparent', value: 'transparent' },
	{ name: 'White', value: '#FFFFFF' },
	{ name: 'Cream', value: '#FFFBEB' }
] as const;
