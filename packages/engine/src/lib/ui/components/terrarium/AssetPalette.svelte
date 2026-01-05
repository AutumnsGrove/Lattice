<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { TERRARIUM_CONFIG } from '$lib/config/terrarium';
	import type { AssetCategory } from './types';
	import PaletteItem from './PaletteItem.svelte';
	import { Trees, Bug, Leaf, Mountain, Landmark, ChevronDown } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		onAssetSelect: (name: string, category: AssetCategory) => void;
	}

	let { onAssetSelect }: Props = $props();

	// Define category metadata
	interface CategoryMeta {
		name: string;
		icon: ComponentType;
		assets: readonly string[];
	}

	// Map starter assets to their categories
	const categoriesMap: Record<AssetCategory, CategoryMeta> = {
		trees: {
			name: 'Trees',
			icon: Trees,
			assets: ['TreePine', 'TreeBirch']
		},
		creatures: {
			name: 'Creatures',
			icon: Bug,
			assets: ['Butterfly', 'Firefly']
		},
		botanical: {
			name: 'Botanical',
			icon: Leaf,
			assets: ['Vine']
		},
		ground: {
			name: 'Ground',
			icon: Mountain,
			assets: ['Mushroom', 'Rock']
		},
		structural: {
			name: 'Structural',
			icon: Landmark,
			assets: ['Lattice', 'LatticeWithVine', 'Lantern']
		},
		sky: {
			name: 'Sky',
			icon: Landmark,
			assets: []
		},
		water: {
			name: 'Water',
			icon: Landmark,
			assets: []
		},
		weather: {
			name: 'Weather',
			icon: Landmark,
			assets: []
		}
	};

	// Filter to only categories that have starter assets
	const categories = $derived(
		(Object.entries(categoriesMap) as [AssetCategory, CategoryMeta][])
			.filter(([_, meta]) => meta.assets.length > 0)
			.map(([key, meta]) => ({ key, ...meta }))
	);

	// Track which categories are expanded (all start expanded)
	let expandedCategories = $state<Set<AssetCategory>>(
		new Set(categories.map((c) => c.key))
	);

	function toggleCategory(category: AssetCategory) {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(category)) {
			newExpanded.delete(category);
		} else {
			newExpanded.add(category);
		}
		expandedCategories = newExpanded;
	}

	function handleCategoryKeydown(e: KeyboardEvent, category: AssetCategory) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleCategory(category);
		}
	}
</script>

<aside
	class="asset-palette flex flex-col h-full w-full
		bg-white/50 dark:bg-emerald-950/25
		backdrop-blur-md
		border-r border-white/40 dark:border-emerald-800/25
		shadow-lg"
	aria-label="Asset palette"
>
	<!-- Header -->
	<div class="flex-shrink-0 px-4 py-4 border-b border-white/40 dark:border-emerald-800/25">
		<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Assets</h2>
		<p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
			Drag or click to add to canvas
		</p>
	</div>

	<!-- Scrollable categories -->
	<div class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
		<nav aria-label="Asset categories">
			{#each categories as { key, name, icon: Icon, assets }}
				<section class="mb-3" aria-labelledby={`category-${key}`}>
					<!-- Category header -->
					<button
						id={`category-${key}`}
						class="w-full flex items-center justify-between px-3 py-2 rounded-lg
							text-sm font-medium text-slate-700 dark:text-slate-300
							hover:bg-white/40 dark:hover:bg-emerald-950/30
							focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1
							transition-colors duration-150"
						onclick={() => toggleCategory(key)}
						onkeydown={(e) => handleCategoryKeydown(e, key)}
						aria-expanded={expandedCategories.has(key)}
						aria-controls={`category-content-${key}`}
					>
						<span class="flex items-center gap-2">
							<Icon class="w-4 h-4" />
							<span>{name}</span>
							<span class="text-xs text-slate-500 dark:text-slate-500">
								({assets.length})
							</span>
						</span>
						<ChevronDown
							class="w-4 h-4 transition-transform duration-200 {expandedCategories.has(key)
								? 'rotate-180'
								: ''}"
						/>
					</button>

					<!-- Category content -->
					{#if expandedCategories.has(key)}
						<div
							id={`category-content-${key}`}
							class="grid grid-cols-2 gap-2 px-2 py-2"
							role="group"
							aria-label={`${name} assets`}
						>
							{#each assets as assetName}
								<PaletteItem name={assetName} category={key} onSelect={onAssetSelect} />
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</nav>
	</div>

	<!-- Footer hint -->
	<div
		class="flex-shrink-0 px-4 py-3 border-t border-white/40 dark:border-emerald-800/25
			bg-white/30 dark:bg-emerald-950/20"
	>
		<p class="text-xs text-slate-600 dark:text-slate-400 text-center">
			Use Tab and Arrow keys to navigate
		</p>
	</div>
</aside>

<style>
	.asset-palette {
		/* Ensure the palette is always visible and scrollable */
		min-width: 280px;
		max-width: 320px;
	}

	/* Custom scrollbar styling */
	.asset-palette ::-webkit-scrollbar {
		width: 8px;
	}

	.asset-palette ::-webkit-scrollbar-track {
		background: transparent;
	}

	.asset-palette ::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.3);
		border-radius: 4px;
	}

	.asset-palette ::-webkit-scrollbar-thumb:hover {
		background: rgba(148, 163, 184, 0.5);
	}

	/* Firefox scrollbar */
	.asset-palette {
		scrollbar-width: thin;
		scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
	}
</style>
