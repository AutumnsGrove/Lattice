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
	import { Play, Pause, Grid3X3, Trash2, Copy, Download, Save } from 'lucide-svelte';
	import { cn } from '$lib/ui/utils';

	/**
	 * Terrarium Toolbar
	 *
	 * Top toolbar for Terrarium canvas actions and settings.
	 * Features scene naming, animation/grid controls, and action buttons.
	 */

	interface Props {
		sceneName: string;
		animationsEnabled: boolean;
		gridEnabled: boolean;
		gridSize: 16 | 32 | 64;
		hasSelection: boolean;
		onToggleAnimations: () => void;
		onToggleGrid: () => void;
		onSetGridSize: (size: 16 | 32 | 64) => void;
		onDelete: () => void;
		onDuplicate: () => void;
		onExport: () => void;
		onSave: () => void;
		onRename: (name: string) => void;
	}

	let {
		sceneName = $bindable(),
		animationsEnabled,
		gridEnabled,
		gridSize,
		hasSelection,
		onToggleAnimations,
		onToggleGrid,
		onSetGridSize,
		onDelete,
		onDuplicate,
		onExport,
		onSave,
		onRename
	}: Props = $props();

	let isEditingName = $state(false);
	let nameInput: HTMLInputElement | null = $state(null);
	let editedName = $state(sceneName);

	// Grid size options
	const gridSizes: Array<16 | 32 | 64> = [16, 32, 64];

	// Start editing scene name
	function startEditingName() {
		isEditingName = true;
		editedName = sceneName;
		setTimeout(() => {
			nameInput?.focus();
			nameInput?.select();
		}, 0);
	}

	// Finish editing scene name
	function finishEditingName() {
		if (isEditingName) {
			const trimmed = editedName.trim();
			if (trimmed && trimmed !== sceneName) {
				onRename(trimmed);
			} else {
				editedName = sceneName;
			}
			isEditingName = false;
		}
	}

	// Handle name input keydown
	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			finishEditingName();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			editedName = sceneName;
			isEditingName = false;
		}
	}

	// Glass button styles
	const buttonClass = cn(
		'inline-flex items-center justify-center',
		'h-9 px-3 rounded-lg',
		'bg-white/60 dark:bg-emerald-950/25',
		'border border-white/40 dark:border-emerald-800/25',
		'text-foreground text-sm font-medium',
		'hover:bg-white/75 dark:hover:bg-emerald-950/35',
		'hover:border-white/50 dark:hover:border-emerald-700/30',
		'transition-all duration-200',
		'backdrop-blur-md shadow-sm hover:shadow-md',
		'disabled:opacity-50 disabled:pointer-events-none',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
		'[&_svg]:w-4 [&_svg]:h-4'
	);

	const iconButtonClass = cn(
		'inline-flex items-center justify-center',
		'h-9 w-9 rounded-lg',
		'bg-white/60 dark:bg-emerald-950/25',
		'border border-white/40 dark:border-emerald-800/25',
		'text-foreground',
		'hover:bg-white/75 dark:hover:bg-emerald-950/35',
		'hover:border-white/50 dark:hover:border-emerald-700/30',
		'transition-all duration-200',
		'backdrop-blur-md shadow-sm hover:shadow-md',
		'disabled:opacity-50 disabled:pointer-events-none',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
		'[&_svg]:w-4 [&_svg]:h-4'
	);

	const activeButtonClass = cn(
		iconButtonClass,
		'bg-accent/70 dark:bg-accent/60',
		'border-accent/40 dark:border-accent/30',
		'text-white',
		'hover:bg-accent/85 dark:hover:bg-accent/75',
		'hover:border-accent/60 dark:hover:border-accent/50'
	);
</script>

<nav
	class={cn(
		'flex items-center gap-3 px-4 py-3',
		'bg-white/60 dark:bg-emerald-950/25',
		'border-b border-white/40 dark:border-emerald-800/25',
		'backdrop-blur-md shadow-sm'
	)}
>
	<!-- Scene Name -->
	<div class="flex items-center gap-2 min-w-0">
		{#if isEditingName}
			<input
				bind:this={nameInput}
				bind:value={editedName}
				onblur={finishEditingName}
				onkeydown={handleNameKeydown}
				class={cn(
					'px-2 py-1 rounded text-lg font-semibold',
					'bg-white/80 dark:bg-emerald-950/40',
					'border border-accent/40 dark:border-accent/30',
					'focus:outline-none focus:ring-2 focus:ring-accent/50',
					'min-w-[200px] max-w-[400px]'
				)}
				maxlength="100"
			/>
		{:else}
			<button
				onclick={startEditingName}
				class={cn(
					'px-2 py-1 rounded text-lg font-semibold truncate',
					'hover:bg-white/40 dark:hover:bg-emerald-950/20',
					'transition-colors duration-200',
					'text-left max-w-[400px]'
				)}
				title="Click to rename scene"
			>
				{sceneName}
			</button>
		{/if}
	</div>

	<div class="flex-1"></div>

	<!-- Controls Section -->
	<div class="flex items-center gap-2">
		<!-- Animation Toggle -->
		<button
			onclick={onToggleAnimations}
			class={animationsEnabled ? activeButtonClass : iconButtonClass}
			title={animationsEnabled ? 'Pause animations (Space)' : 'Play animations (Space)'}
			aria-label={animationsEnabled ? 'Pause animations' : 'Play animations'}
		>
			{#if animationsEnabled}
				<Pause />
			{:else}
				<Play />
			{/if}
		</button>

		<!-- Grid Toggle -->
		<button
			onclick={onToggleGrid}
			class={gridEnabled ? activeButtonClass : iconButtonClass}
			title={gridEnabled ? 'Hide grid (G)' : 'Show grid (G)'}
			aria-label={gridEnabled ? 'Hide grid' : 'Show grid'}
		>
			<Grid3X3 />
		</button>

		<!-- Grid Size Dropdown -->
		{#if gridEnabled}
			<select
				value={gridSize}
				onchange={(e) => onSetGridSize(Number(e.currentTarget.value) as 16 | 32 | 64)}
				class={cn(
					'h-9 px-3 rounded-lg',
					'bg-white/60 dark:bg-emerald-950/25',
					'border border-white/40 dark:border-emerald-800/25',
					'text-foreground text-sm font-medium',
					'hover:bg-white/75 dark:hover:bg-emerald-950/35',
					'transition-all duration-200',
					'backdrop-blur-md shadow-sm',
					'focus:outline-none focus:ring-2 focus:ring-accent/50',
					'cursor-pointer'
				)}
				title="Grid size"
				aria-label="Select grid size"
			>
				{#each gridSizes as size}
					<option value={size}>{size}px</option>
				{/each}
			</select>
		{/if}
	</div>

	<!-- Divider -->
	<div class="w-px h-6 bg-white/40 dark:bg-emerald-800/25"></div>

	<!-- Action Buttons Section -->
	<div class="flex items-center gap-2">
		<!-- Delete -->
		<button
			onclick={onDelete}
			disabled={!hasSelection}
			class={iconButtonClass}
			title="Delete selected (⌫)"
			aria-label="Delete selected asset"
		>
			<Trash2 />
		</button>

		<!-- Duplicate -->
		<button
			onclick={onDuplicate}
			disabled={!hasSelection}
			class={iconButtonClass}
			title="Duplicate selected (⌘D)"
			aria-label="Duplicate selected asset"
		>
			<Copy />
		</button>

		<!-- Export PNG -->
		<button
			onclick={onExport}
			class={buttonClass}
			title="Export as PNG (⌘E)"
			aria-label="Export scene as PNG"
		>
			<Download />
			<span>Export PNG</span>
		</button>
	</div>

	<!-- Divider -->
	<div class="w-px h-6 bg-white/40 dark:bg-emerald-800/25"></div>

	<!-- Save Button -->
	<button
		onclick={onSave}
		class={cn(
			buttonClass,
			'bg-accent/70 dark:bg-accent/60',
			'border-accent/40 dark:border-accent/30',
			'text-white',
			'hover:bg-accent/85 dark:hover:bg-accent/75',
			'hover:border-accent/60 dark:hover:border-accent/50'
		)}
		title="Save scene (⌘S)"
		aria-label="Save scene"
	>
		<Save />
		<span>Save</span>
	</button>
</nav>
