<script lang="ts">
	// LayoutPanel.svelte
	// Layout customization panel for theme customizer

	import type { ThemeLayout } from "../types.js";

	interface Props {
		layout: ThemeLayout;
		onChange?: (layout: Partial<ThemeLayout>) => void;
	}

	let { layout, onChange }: Props = $props();

	// Layout type definitions with metadata
	const layoutTypes = [
		{
			type: "sidebar" as const,
			name: "Sidebar",
			description: "Traditional blog with sidebar",
			icon: "▦",
		},
		{
			type: "no-sidebar" as const,
			name: "No Sidebar",
			description: "Clean single column",
			icon: "▭",
		},
		{
			type: "centered" as const,
			name: "Centered",
			description: "Centered content (like Medium)",
			icon: "▢",
		},
		{
			type: "full-width" as const,
			name: "Full Width",
			description: "Edge-to-edge content",
			icon: "▬",
		},
		{
			type: "grid" as const,
			name: "Grid",
			description: "Grid-based layout",
			icon: "▦",
		},
		{
			type: "masonry" as const,
			name: "Masonry",
			description: "Pinterest-style masonry",
			icon: "▦",
		},
	];

	// Spacing modes with metadata
	const spacingModes = [
		{
			value: "compact" as const,
			name: "Compact",
			description: "Dense, information-rich",
			spacing: "0.5rem",
		},
		{
			value: "comfortable" as const,
			name: "Comfortable",
			description: "Balanced spacing",
			spacing: "1rem",
		},
		{
			value: "spacious" as const,
			name: "Spacious",
			description: "Generous whitespace",
			spacing: "1.5rem",
		},
	];

	// Max width presets
	const maxWidthPresets = ["1000px", "1200px", "1400px", "1600px"];

	// Local state
	let localLayout = $state({ ...layout });
	let maxWidthInput = $state(layout.maxWidth);
	let isValidMaxWidth = $state(true);

	// Derived: check if max width is relevant for current layout
	let isMaxWidthRelevant = $derived(
		localLayout.type === "centered" || localLayout.type === "no-sidebar",
	);

	// Validate CSS width value
	function isValidCSSWidth(value: string): boolean {
		// Allow common CSS width units
		const validPattern = /^(\d+(\.\d+)?(px|em|rem|%|vw|ch)|auto|none)$/i;
		return validPattern.test(value.trim());
	}

	// Handle layout type change
	function handleLayoutTypeChange(type: ThemeLayout["type"]) {
		localLayout.type = type;
		onChange?.({ type });
	}

	// Handle spacing mode change
	function handleSpacingChange(spacing: ThemeLayout["spacing"]) {
		localLayout.spacing = spacing;
		onChange?.({ spacing });
	}

	// Handle max width input
	function handleMaxWidthInput(value: string) {
		maxWidthInput = value;

		if (isValidCSSWidth(value)) {
			isValidMaxWidth = true;
			localLayout.maxWidth = value;
			onChange?.({ maxWidth: value });
		} else {
			isValidMaxWidth = value === "";
		}
	}

	// Apply max width preset
	function applyMaxWidthPreset(preset: string) {
		maxWidthInput = preset;
		isValidMaxWidth = true;
		localLayout.maxWidth = preset;
		onChange?.({ maxWidth: preset });
	}

	// Reset to defaults
	function resetAll() {
		localLayout = { ...layout };
		maxWidthInput = layout.maxWidth;
		isValidMaxWidth = true;
		onChange?.(layout);
	}

	// Reset individual property
	function resetLayoutType() {
		localLayout.type = layout.type;
		onChange?.({ type: layout.type });
	}

	function resetMaxWidth() {
		maxWidthInput = layout.maxWidth;
		isValidMaxWidth = true;
		localLayout.maxWidth = layout.maxWidth;
		onChange?.({ maxWidth: layout.maxWidth });
	}

	function resetSpacing() {
		localLayout.spacing = layout.spacing;
		onChange?.({ spacing: layout.spacing });
	}

	// Sync with external changes
	$effect(() => {
		localLayout = { ...layout };
		maxWidthInput = layout.maxWidth;
	});

	// Keyboard navigation for layout type cards
	function handleLayoutTypeKeydown(event: KeyboardEvent, type: ThemeLayout["type"]) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleLayoutTypeChange(type);
		}
	}

	// Keyboard navigation for spacing mode cards
	function handleSpacingKeydown(event: KeyboardEvent, spacing: ThemeLayout["spacing"]) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleSpacingChange(spacing);
		}
	}
</script>

<div class="layout-panel">
	<div class="panel-header">
		<h3>Layout</h3>
		<button
			type="button"
			class="reset-all-button"
			onclick={resetAll}
			aria-label="Reset all layout settings"
		>
			Reset All
		</button>
	</div>

	<!-- Layout Type Section -->
	<section class="layout-section">
		<div class="section-header">
			<h4>Layout Type</h4>
			<button
				type="button"
				class="reset-button-small"
				onclick={resetLayoutType}
				aria-label="Reset layout type"
			>
				Reset
			</button>
		</div>
		<p class="section-hint">Choose the overall structure for your content</p>

		<div class="layout-types-grid" role="radiogroup" aria-label="Layout type">
			{#each layoutTypes as layoutType}
				<button
					type="button"
					class="layout-type-card"
					class:selected={localLayout.type === layoutType.type}
					onclick={() => handleLayoutTypeChange(layoutType.type)}
					onkeydown={(e) => handleLayoutTypeKeydown(e, layoutType.type)}
					role="radio"
					aria-checked={localLayout.type === layoutType.type}
					aria-label="{layoutType.name} layout: {layoutType.description}"
				>
					<div class="layout-type-icon" aria-hidden="true">{layoutType.icon}</div>
					<div class="layout-type-info">
						<div class="layout-type-name">{layoutType.name}</div>
						<div class="layout-type-description">{layoutType.description}</div>
					</div>
					<div class="layout-type-preview" data-layout={layoutType.type}>
						{#if layoutType.type === "sidebar"}
							<div class="preview-sidebar-layout">
								<div class="preview-content"></div>
								<div class="preview-sidebar"></div>
							</div>
						{:else if layoutType.type === "no-sidebar"}
							<div class="preview-nosidebar-layout">
								<div class="preview-content-full"></div>
							</div>
						{:else if layoutType.type === "centered"}
							<div class="preview-centered-layout">
								<div class="preview-content-centered"></div>
							</div>
						{:else if layoutType.type === "full-width"}
							<div class="preview-fullwidth-layout">
								<div class="preview-content-edge"></div>
							</div>
						{:else if layoutType.type === "grid"}
							<div class="preview-grid-layout">
								<div class="preview-grid-item"></div>
								<div class="preview-grid-item"></div>
								<div class="preview-grid-item"></div>
								<div class="preview-grid-item"></div>
							</div>
						{:else if layoutType.type === "masonry"}
							<div class="preview-masonry-layout">
								<div class="preview-masonry-item tall"></div>
								<div class="preview-masonry-item short"></div>
								<div class="preview-masonry-item medium"></div>
								<div class="preview-masonry-item short"></div>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- Max Width Section -->
	<section class="layout-section">
		<div class="section-header">
			<h4>Max Width</h4>
			<button
				type="button"
				class="reset-button-small"
				onclick={resetMaxWidth}
				aria-label="Reset max width"
			>
				Reset
			</button>
		</div>
		<p class="section-hint">
			{isMaxWidthRelevant
				? "Set the maximum content width"
				: "Max width setting only applies to Centered and No Sidebar layouts"}
		</p>

		<div class="max-width-controls" class:disabled={!isMaxWidthRelevant}>
			<div class="presets-row">
				{#each maxWidthPresets as preset}
					<button
						type="button"
						class="preset-button"
						class:active={maxWidthInput === preset}
						onclick={() => applyMaxWidthPreset(preset)}
						disabled={!isMaxWidthRelevant}
						aria-label="Set max width to {preset}"
					>
						{preset}
					</button>
				{/each}
			</div>

			<div class="custom-input-wrapper">
				<label for="max-width-input" class="input-label">Custom width</label>
				<input
					id="max-width-input"
					type="text"
					class="width-input"
					class:invalid={!isValidMaxWidth}
					value={maxWidthInput}
					oninput={(e) => handleMaxWidthInput((e.target as HTMLInputElement).value)}
					placeholder="1200px"
					disabled={!isMaxWidthRelevant}
					aria-label="Custom max width value"
					aria-invalid={!isValidMaxWidth}
					aria-describedby="max-width-hint"
				/>
				<div id="max-width-hint" class="input-hint">
					{#if !isValidMaxWidth}
						<span class="error-text">Invalid CSS width (use px, em, rem, %, vw, or ch)</span>
					{:else}
						Enter a valid CSS width value
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Spacing Mode Section -->
	<section class="layout-section">
		<div class="section-header">
			<h4>Spacing</h4>
			<button
				type="button"
				class="reset-button-small"
				onclick={resetSpacing}
				aria-label="Reset spacing mode"
			>
				Reset
			</button>
		</div>
		<p class="section-hint">Adjust the density of your layout</p>

		<div class="spacing-modes-grid" role="radiogroup" aria-label="Spacing mode">
			{#each spacingModes as mode}
				<button
					type="button"
					class="spacing-mode-card"
					class:selected={localLayout.spacing === mode.value}
					onclick={() => handleSpacingChange(mode.value)}
					onkeydown={(e) => handleSpacingKeydown(e, mode.value)}
					role="radio"
					aria-checked={localLayout.spacing === mode.value}
					aria-label="{mode.name} spacing: {mode.description}"
				>
					<div class="spacing-mode-name">{mode.name}</div>
					<div class="spacing-mode-description">{mode.description}</div>
					<div class="spacing-preview" data-spacing={mode.value}>
						<div class="spacing-bar" style="margin-bottom: {mode.spacing}"></div>
						<div class="spacing-bar" style="margin-bottom: {mode.spacing}"></div>
						<div class="spacing-bar"></div>
					</div>
				</button>
			{/each}
		</div>
	</section>
</div>

<style>
	.layout-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.panel-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.reset-all-button {
		padding: 0.5rem 1rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.reset-all-button:hover {
		background: var(--color-background, #fefdfb);
		border-color: var(--color-foreground-muted, #666);
	}

	.reset-all-button:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.layout-section {
		padding: 1.25rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.section-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.reset-button-small {
		padding: 0.25rem 0.625rem;
		background: transparent;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.reset-button-small:hover {
		background: var(--color-surface, #fff);
		border-color: var(--color-foreground-muted, #666);
	}

	.reset-button-small:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.section-hint {
		margin: 0 0 1rem;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Layout Type Cards */
	.layout-types-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.layout-type-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-background, #fefdfb);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.layout-type-card:hover {
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}

	.layout-type-card:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.layout-type-card.selected {
		border-color: var(--color-accent, #16a34a);
		background: color-mix(
			in srgb,
			var(--color-accent, #16a34a) 5%,
			var(--color-background, #fefdfb)
		);
	}

	.layout-type-icon {
		font-size: 2rem;
		color: var(--color-accent, #16a34a);
		line-height: 1;
	}

	.layout-type-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.layout-type-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.layout-type-description {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.layout-type-preview {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		min-height: 4rem;
	}

	/* Layout Preview Styles */
	.preview-sidebar-layout {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0.375rem;
		height: 3rem;
	}

	.preview-content,
	.preview-sidebar {
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.25rem;
	}

	.preview-nosidebar-layout,
	.preview-centered-layout,
	.preview-fullwidth-layout {
		display: flex;
		justify-content: center;
		height: 3rem;
	}

	.preview-content-full {
		width: 100%;
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.25rem;
	}

	.preview-content-centered {
		width: 70%;
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.25rem;
	}

	.preview-content-edge {
		width: 100%;
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0;
	}

	.preview-grid-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.375rem;
		height: 3rem;
	}

	.preview-grid-item {
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.25rem;
	}

	.preview-masonry-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.375rem;
		height: 4rem;
	}

	.preview-masonry-item {
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.25rem;
	}

	.preview-masonry-item.tall {
		grid-row: span 2;
	}

	.preview-masonry-item.short {
		height: 1.5rem;
	}

	.preview-masonry-item.medium {
		height: 2.5rem;
	}

	/* Max Width Controls */
	.max-width-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.max-width-controls.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.presets-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.preset-button {
		padding: 0.5rem 1rem;
		background: var(--color-background, #fefdfb);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: var(--font-mono, ui-monospace, monospace);
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-button:hover {
		border-color: var(--color-accent, #16a34a);
		background: var(--color-surface, #fff);
	}

	.preset-button:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.preset-button.active {
		border-color: var(--color-accent, #16a34a);
		background: color-mix(in srgb, var(--color-accent, #16a34a) 10%, var(--color-surface, #fff));
		color: var(--color-accent, #16a34a);
		font-weight: 600;
	}

	.preset-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.custom-input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.input-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-foreground-muted, #666);
	}

	.width-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.875rem;
		background: var(--color-background, #fefdfb);
		color: var(--color-foreground, #111);
		transition: border-color 0.15s ease;
		max-width: 12rem;
	}

	.width-input:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.width-input.invalid {
		border-color: #dc2626;
	}

	.width-input:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.input-hint {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.error-text {
		color: #dc2626;
		font-weight: 500;
	}

	/* Spacing Mode Cards */
	.spacing-modes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 0.75rem;
	}

	.spacing-mode-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-background, #fefdfb);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.spacing-mode-card:hover {
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}

	.spacing-mode-card:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.spacing-mode-card.selected {
		border-color: var(--color-accent, #16a34a);
		background: color-mix(
			in srgb,
			var(--color-accent, #16a34a) 5%,
			var(--color-background, #fefdfb)
		);
	}

	.spacing-mode-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.spacing-mode-description {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.spacing-preview {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		min-height: 3.5rem;
		display: flex;
		flex-direction: column;
	}

	.spacing-bar {
		height: 0.375rem;
		background: var(--color-accent, #16a34a);
		opacity: 0.3;
		border-radius: 0.125rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.layout-types-grid {
			grid-template-columns: 1fr;
		}

		.spacing-modes-grid {
			grid-template-columns: 1fr;
		}

		.presets-row {
			flex-direction: column;
		}

		.preset-button {
			width: 100%;
		}
	}
</style>
