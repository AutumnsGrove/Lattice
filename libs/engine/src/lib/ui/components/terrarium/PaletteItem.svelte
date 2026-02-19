<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { AssetCategory } from './types';
	import type { Component as SvelteComponent } from 'svelte';

	interface Props {
		name: string;
		category: AssetCategory;
		onSelect: (name: string, category: AssetCategory) => void;
	}

	let { name, category, onSelect }: Props = $props();

	// Convert component name to display name (e.g., "TreePine" -> "Pine Tree")
	const displayName = $derived(() => {
		// Handle special cases
		const specialCases: Record<string, string> = {
			LatticeWithVine: 'Lattice with Vine'
		};

		if (specialCases[name]) {
			return specialCases[name];
		}

		// Split on capital letters and reverse tree names
		const words = name.split(/(?=[A-Z])/).filter(Boolean);

		// For trees, put the type first (e.g., TreePine -> Pine Tree)
		if (words[0] === 'Tree' && words.length > 1) {
			return `${words.slice(1).join(' ')} Tree`;
		}

		// For everything else, just join with spaces
		return words.join(' ');
	});

	// Dynamically import the component for preview
	let ComponentPreview: SvelteComponent | null = $state(null);
	let isLoading = $state(true);
	let loadError = $state(false);

	// Load the component based on category
	async function loadComponent() {
		try {
			isLoading = true;
			loadError = false;

			let module;
			switch (category) {
				case 'trees':
					module = await import(`../nature/trees/${name}.svelte`);
					break;
				case 'creatures':
					module = await import(`../nature/creatures/${name}.svelte`);
					break;
				case 'botanical':
					module = await import(`../nature/botanical/${name}.svelte`);
					break;
				case 'ground':
					module = await import(`../nature/ground/${name}.svelte`);
					break;
				case 'sky':
					module = await import(`../nature/sky/${name}.svelte`);
					break;
				case 'structural':
					module = await import(`../nature/structural/${name}.svelte`);
					break;
				case 'water':
					module = await import(`../nature/water/${name}.svelte`);
					break;
				case 'weather':
					module = await import(`../nature/weather/${name}.svelte`);
					break;
				default:
					throw new Error(`Unknown category: ${category}`);
			}

			ComponentPreview = module.default;
		} catch (err) {
			console.error(`Failed to load component ${name}:`, err);
			loadError = true;
		} finally {
			isLoading = false;
		}
	}

	// Load component on mount
	$effect(() => {
		loadComponent();
	});

	// Handle selection
	function handleClick() {
		onSelect(name, category);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect(name, category);
		}
	}

	// Handle drag start for drag-to-canvas
	function handleDragStart(e: DragEvent) {
		if (!e.dataTransfer) return;

		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData(
			'application/json',
			JSON.stringify({
				name,
				category
			})
		);
	}
</script>

<button
	class="palette-item group relative flex flex-col items-center gap-2 p-3 rounded-lg
		bg-white/60 dark:bg-grove-950/20 backdrop-blur-sm
		border border-white/30 dark:border-grove-800/20
		hover:bg-white/80 dark:hover:bg-grove-950/30
		hover:border-white/50 dark:hover:border-grove-700/30
		hover:shadow-md
		focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
		transition-all duration-200
		cursor-pointer"
	draggable="true"
	tabindex="0"
	onclick={handleClick}
	onkeydown={handleKeydown}
	ondragstart={handleDragStart}
	aria-label={`Add ${displayName()} to canvas`}
>
	<!-- Preview container -->
	<div
		class="w-16 h-16 flex items-center justify-center rounded-md
			bg-gradient-to-b from-sky-100/50 to-emerald-50/50
			dark:from-sky-950/30 dark:to-grove-950/30
			group-hover:from-sky-100/70 group-hover:to-emerald-50/70
			dark:group-hover:from-sky-950/40 dark:group-hover:to-grove-950/40
			transition-colors duration-200"
	>
		{#if isLoading}
			<div class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
		{:else if loadError}
			<span class="text-xs text-red-500">Error</span>
		{:else if ComponentPreview}
			{@const Preview = ComponentPreview}
			<Preview class="w-12 h-12" color="#2D5F3F" />
		{/if}
	</div>

	<!-- Display name -->
	<span
		class="text-xs font-medium text-bark-700 dark:text-cream-300
			group-hover:text-bark-900 dark:group-hover:text-cream-100
			text-center leading-tight"
	>
		{displayName()}
	</span>
</button>

<style>
	.palette-item {
		user-select: none;
		-webkit-user-select: none;
	}

	.palette-item:active {
		transform: scale(0.98);
	}
</style>
