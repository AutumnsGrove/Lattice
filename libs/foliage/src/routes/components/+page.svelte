<script lang="ts">
	import { themes, themeList } from "../../lib/themes/registry.js";
	import ThemePreview from "../../lib/components/ThemePreview.svelte";
	import ThemeRating from "../../lib/components/ThemeRating.svelte";
	import ThemeSelector from "../../lib/components/ThemeSelector.svelte";
	import AccentColorPicker from "../../lib/components/AccentColorPicker.svelte";
	import type { Theme, UserTier } from "../../lib/types.js";

	let selectedThemeId = $state<string>(themeList[0].id);
	let selectedTheme = $derived(themes[selectedThemeId] ?? themeList[0]);
	let rating = $state(3);
	let accentColor = $state("#16a34a");

	// For demo purposes, simulate an Oak tier user (can access all themes)
	const demoUserTier: UserTier = "oak";

	function handleThemeSelect(themeId: string) {
		selectedThemeId = themeId;
	}
</script>

<div class="components-page">
	<div class="intro">
		<h2>Component Showcase</h2>
		<p>Interactive demos of Foliage UI components.</p>
	</div>

	<section class="component-section">
		<h3>ThemeSelector</h3>
		<p class="description">Dropdown for selecting themes, respects tier restrictions.</p>
		<div class="demo">
			<ThemeSelector
				themes={themeList}
				{selectedThemeId}
				userTier={demoUserTier}
				onSelect={handleThemeSelect}
			/>
		</div>
		<div class="selected-info">
			Selected: <strong>{selectedTheme.name}</strong>
		</div>
	</section>

	<section class="component-section">
		<h3>ThemeRating</h3>
		<p class="description">Star rating component with interactive and read-only modes.</p>
		<div class="demo rating-demo">
			<div class="rating-row">
				<span class="label">Interactive:</span>
				<ThemeRating {rating} onChange={(r) => (rating = r)} />
				<span class="value">{rating}/5</span>
			</div>
			<div class="rating-row">
				<span class="label">Read-only:</span>
				<ThemeRating rating={4.5} readonly />
			</div>
		</div>
	</section>

	<section class="component-section">
		<h3>AccentColorPicker</h3>
		<p class="description">Color picker for theme accent customization.</p>
		<div class="demo">
			<AccentColorPicker color={accentColor} onChange={(c) => (accentColor = c)} />
		</div>
		<div class="selected-info">
			Selected: <code>{accentColor}</code>
			<span class="color-swatch" style="background: {accentColor}"></span>
		</div>
	</section>

	<section class="component-section">
		<h3>ThemePreview</h3>
		<p class="description">Renders a complete theme preview with all visual elements.</p>
		<div class="demo preview-demo">
			<ThemePreview theme={selectedTheme} />
		</div>
	</section>
</div>

<style>
	.components-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.intro {
		margin-bottom: 2rem;
	}

	.intro h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
	}

	.intro p {
		margin: 0;
		color: #666;
	}

	.component-section {
		margin-bottom: 3rem;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e5e5;
		border-radius: 0.75rem;
	}

	:global(.dark) .component-section {
		background: #1a1a1a;
		border-color: #333;
	}

	.component-section h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #16a34a;
	}

	.description {
		margin: 0 0 1.5rem 0;
		color: #666;
		font-size: 0.875rem;
	}

	.demo {
		padding: 1.5rem;
		background: #f5f5f5;
		border-radius: 0.5rem;
	}

	:global(.dark) .demo {
		background: #222;
	}

	.rating-demo {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.rating-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.label {
		min-width: 80px;
		font-size: 0.875rem;
		color: #666;
	}

	.value {
		font-size: 0.875rem;
		color: #666;
	}

	.selected-info {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: #666;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.selected-info code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	:global(.dark) .selected-info code {
		background: #333;
	}

	.color-swatch {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.25rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.preview-demo {
		padding: 1rem;
	}
</style>
