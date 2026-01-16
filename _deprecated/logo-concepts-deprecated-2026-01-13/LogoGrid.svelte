<!--
  Logo Grid Preview
  A dynamic grid for comparing and arranging logo concepts
-->
<script lang="ts">
	import type { Component } from 'svelte';

	/**
	 * Logo Grid - Dynamic logo preview and comparison tool
	 */
	interface Props {
		/** Array of logo components to display */
		logos: Array<{
			component: Component;
			name: string;
			props?: Record<string, unknown>;
		}>;
		/** Initial size in pixels */
		initialSize?: number;
		/** Grid columns (auto-fit by default) */
		columns?: number | 'auto';
		/** Background color options */
		backgrounds?: Array<{ name: string; class: string }>;
		/** Show size controls */
		showControls?: boolean;
		/** Color to apply to all logos */
		color?: string;
	}

	let {
		logos,
		initialSize = 48,
		columns = 'auto',
		backgrounds = [
			{ name: 'Dark', class: 'bg-slate-800' },
			{ name: 'Light', class: 'bg-white' },
			{ name: 'Grove', class: 'bg-green-900' },
			{ name: 'Autumn', class: 'bg-amber-900' }
		],
		showControls = true,
		color = 'currentColor'
	}: Props = $props();

	let size = $state(initialSize);
	let gap = $state(16);
	let selectedBg = $state(0);
	let showLabels = $state(true);
	let selectedLogo = $state<number | null>(null);

	const gridStyle = $derived(
		columns === 'auto'
			? `display: grid; grid-template-columns: repeat(auto-fit, minmax(${size + 40}px, 1fr)); gap: ${gap}px;`
			: `display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap}px;`
	);

	const sizePresets = [16, 24, 32, 48, 64, 96, 128];
</script>

<div class="logo-grid-container">
	{#if showControls}
		<div class="controls mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
			<div class="flex flex-wrap gap-6 items-center">
				<!-- Size control -->
				<div class="flex items-center gap-3">
					<label for="logo-grid-size" class="text-sm text-slate-400">Size:</label>
					<input
						id="logo-grid-size"
						type="range"
						min="16"
						max="128"
						bind:value={size}
						class="w-32 accent-green-500"
					/>
					<span class="text-sm text-slate-300 w-12">{size}px</span>
				</div>

				<!-- Size presets -->
				<div class="flex gap-1">
					{#each sizePresets as preset}
						<button
							class="px-2 py-1 text-xs rounded transition-colors
								{size === preset ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
							onclick={() => (size = preset)}
						>
							{preset}
						</button>
					{/each}
				</div>

				<!-- Gap control -->
				<div class="flex items-center gap-3">
					<label for="logo-grid-gap" class="text-sm text-slate-400">Gap:</label>
					<input
						id="logo-grid-gap"
						type="range"
						min="4"
						max="48"
						bind:value={gap}
						class="w-24 accent-green-500"
					/>
					<span class="text-sm text-slate-300 w-12">{gap}px</span>
				</div>

				<!-- Labels toggle -->
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" bind:checked={showLabels} class="accent-green-500" />
					<span class="text-sm text-slate-300">Labels</span>
				</label>
			</div>

			<!-- Background selector -->
			<div class="flex gap-2 mt-4">
				<span class="text-sm text-slate-400">Background:</span>
				{#each backgrounds as bg, i}
					<button
						class="px-3 py-1 text-xs rounded border transition-colors
							{selectedBg === i
							? 'border-green-500 bg-green-500/20 text-green-300'
							: 'border-slate-600 text-slate-400 hover:border-slate-500'}"
						onclick={() => (selectedBg = i)}
					>
						{bg.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Grid -->
	<div
		class="logo-grid p-6 rounded-xl transition-colors duration-300 {backgrounds[selectedBg].class}"
		style={gridStyle}
	>
		{#each logos as logo, i}
			<button
				class="logo-item flex flex-col items-center justify-center p-3 rounded-lg transition-all
					{selectedLogo === i
					? 'ring-2 ring-green-500 bg-green-500/10'
					: 'hover:bg-white/5'}"
				onclick={() => (selectedLogo = selectedLogo === i ? null : i)}
			>
				<div
					class="logo-wrapper flex items-center justify-center"
					style="width: {size}px; height: {size}px;"
				>
					<logo.component
						class="w-full h-full"
						{color}
						{...logo.props}
					/>
				</div>
				{#if showLabels}
					<span
						class="mt-2 text-xs text-center opacity-60 transition-opacity
							{selectedBg < 2 ? 'text-slate-600' : 'text-slate-300'}"
					>
						{logo.name}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Selected logo detail -->
	{#if selectedLogo !== null}
		{@const selectedLogoData = logos[selectedLogo]}
		<div class="mt-6 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
			<div class="flex items-start gap-6">
				<div class="flex-shrink-0 p-4 bg-slate-900 rounded-lg">
					<selectedLogoData.component class="w-24 h-24" {color} {...selectedLogoData.props} />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-white">{selectedLogoData.name}</h3>
					<p class="text-sm text-slate-400 mt-1">
						Click to deselect. Use controls above to adjust grid display.
					</p>
					<!-- Size comparison -->
					<div class="flex items-end gap-4 mt-4">
						{#each [16, 24, 32, 48] as previewSize}
							<div class="flex flex-col items-center">
								<selectedLogoData.component
									class="text-green-500"
									style="width: {previewSize}px; height: {previewSize}px;"
									{...selectedLogoData.props}
								/>
								<span class="text-xs text-slate-500 mt-1">{previewSize}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.logo-grid-container {
		--grid-color: currentColor;
	}
</style>
