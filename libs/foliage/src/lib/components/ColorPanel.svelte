<script lang="ts">
	// ColorPanel.svelte
	// Color customization panel for theme customizer

	import type { ThemeColors } from "../types.js";
	import { getContrastRatio, meetsWCAGAA, suggestReadableColor } from "../utils/contrast.js";
	import { grove, cream, bark } from "../tokens/colors.js";

	interface Props {
		colors: ThemeColors;
		onChange?: (colors: Partial<ThemeColors>) => void;
	}

	let { colors, onChange }: Props = $props();

	// Local state for each color with hex validation
	let localColors = $state({ ...colors });
	let hexInputs = $state({
		background: colors.background,
		surface: colors.surface,
		foreground: colors.foreground,
		foregroundMuted: colors.foregroundMuted,
		accent: colors.accent,
		border: colors.border,
	});

	let validationState = $state({
		background: true,
		surface: true,
		foreground: true,
		foregroundMuted: true,
		accent: true,
		border: true,
	});

	// Preset color palettes
	const presets = [
		{
			name: "Light",
			colors: {
				background: cream.DEFAULT,
				surface: "#ffffff",
				foreground: bark.DEFAULT,
				foregroundMuted: bark[700],
				accent: grove[600],
				border: cream[200],
			},
		},
		{
			name: "Dark",
			colors: {
				background: "#0f172a",
				surface: "#1e293b",
				foreground: "#f1f5f9",
				foregroundMuted: "#cbd5e1",
				accent: grove[400],
				border: "#334155",
			},
		},
		{
			name: "Sepia",
			colors: {
				background: "#f4f1ea",
				surface: "#ffffff",
				foreground: "#3d2914",
				foregroundMuted: "#6f4d39",
				accent: "#8a6347",
				border: "#e0d2c2",
			},
		},
		{
			name: "Forest",
			colors: {
				background: "#f0fdf4",
				surface: "#ffffff",
				foreground: "#14532d",
				foregroundMuted: "#166534",
				accent: grove[600],
				border: grove[200],
			},
		},
		{
			name: "Ocean",
			colors: {
				background: "#f0f9ff",
				surface: "#ffffff",
				foreground: "#0c4a6e",
				foregroundMuted: "#075985",
				accent: "#0ea5e9",
				border: "#bae6fd",
			},
		},
		{
			name: "Sunset",
			colors: {
				background: "#fff7ed",
				surface: "#ffffff",
				foreground: "#7c2d12",
				foregroundMuted: "#9a3412",
				accent: "#f97316",
				border: "#fed7aa",
			},
		},
	];

	// Contrast calculations
	let fgBgContrast = $derived(getContrastRatio(localColors.foreground, localColors.background));
	let fgBgMeetsAA = $derived(meetsWCAGAA(localColors.foreground, localColors.background));

	let mutedBgContrast = $derived(
		getContrastRatio(localColors.foregroundMuted, localColors.background),
	);
	let mutedBgMeetsAA = $derived(meetsWCAGAA(localColors.foregroundMuted, localColors.background));

	// Validate hex color
	function isValidHexColor(hex: string): boolean {
		return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
	}

	// Normalize hex to 6-digit format
	function normalizeHex(hex: string): string {
		hex = hex.replace(/^#/, "");
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		return "#" + hex.toLowerCase();
	}

	// Handle color picker change
	function handleColorChange(property: keyof ThemeColors, value: string) {
		localColors[property] = value;
		hexInputs[property] = value;
		validationState[property] = true;
		onChange?.({ [property]: value });
	}

	// Handle hex input
	function handleHexInput(property: keyof ThemeColors, value: string) {
		// Add # if missing
		if (value && !value.startsWith("#")) {
			value = "#" + value;
		}

		hexInputs[property] = value;

		if (isValidHexColor(value)) {
			validationState[property] = true;
			const normalized = normalizeHex(value);
			localColors[property] = normalized;
			onChange?.({ [property]: normalized });
		} else {
			validationState[property] = value === "" || value === "#";
		}
	}

	// Apply preset palette
	function applyPreset(preset: (typeof presets)[0]) {
		localColors = { ...preset.colors };
		hexInputs = { ...preset.colors };
		validationState = {
			background: true,
			surface: true,
			foreground: true,
			foregroundMuted: true,
			accent: true,
			border: true,
		};
		onChange?.(preset.colors);
	}

	// Reset individual color
	function resetColor(property: keyof ThemeColors) {
		const defaultValue = colors[property];
		localColors[property] = defaultValue;
		hexInputs[property] = defaultValue;
		validationState[property] = true;
		onChange?.({ [property]: defaultValue });
	}

	// Reset all colors
	function resetAll() {
		localColors = { ...colors };
		hexInputs = { ...colors };
		validationState = {
			background: true,
			surface: true,
			foreground: true,
			foregroundMuted: true,
			accent: true,
			border: true,
		};
		onChange?.(colors);
	}

	// Sync with external changes
	$effect(() => {
		localColors = { ...colors };
		hexInputs = { ...colors };
	});
</script>

<div class="color-panel">
	<div class="panel-header">
		<h3>Colors</h3>
		<button type="button" class="reset-all-button" onclick={resetAll} aria-label="Reset all colors">
			Reset All
		</button>
	</div>

	<!-- Background Colors Section -->
	<section class="color-section">
		<h4>Background</h4>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Background</span>
				<span class="label-hint">Main page background</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.background}
						onchange={(e) => handleColorChange("background", (e.target as HTMLInputElement).value)}
						aria-label="Background color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.background}">
						<span style="color: {suggestReadableColor(localColors.background)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.background}
						value={hexInputs.background}
						oninput={(e) => handleHexInput("background", (e.target as HTMLInputElement).value)}
						placeholder="#fefdfb"
						maxlength="7"
						aria-label="Background hex value"
						aria-invalid={!validationState.background}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("background")}
					aria-label="Reset background color"
				>
					Reset
				</button>
			</div>
		</div>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Surface</span>
				<span class="label-hint">Cards and panels</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.surface}
						onchange={(e) => handleColorChange("surface", (e.target as HTMLInputElement).value)}
						aria-label="Surface color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.surface}">
						<span style="color: {suggestReadableColor(localColors.surface)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.surface}
						value={hexInputs.surface}
						oninput={(e) => handleHexInput("surface", (e.target as HTMLInputElement).value)}
						placeholder="#ffffff"
						maxlength="7"
						aria-label="Surface hex value"
						aria-invalid={!validationState.surface}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("surface")}
					aria-label="Reset surface color"
				>
					Reset
				</button>
			</div>
		</div>
	</section>

	<!-- Text Colors Section -->
	<section class="color-section">
		<h4>Text</h4>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Foreground</span>
				<span class="label-hint">Primary text color</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.foreground}
						onchange={(e) => handleColorChange("foreground", (e.target as HTMLInputElement).value)}
						aria-label="Foreground color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.foreground}">
						<span style="color: {suggestReadableColor(localColors.foreground)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.foreground}
						value={hexInputs.foreground}
						oninput={(e) => handleHexInput("foreground", (e.target as HTMLInputElement).value)}
						placeholder="#111111"
						maxlength="7"
						aria-label="Foreground hex value"
						aria-invalid={!validationState.foreground}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("foreground")}
					aria-label="Reset foreground color"
				>
					Reset
				</button>
			</div>
			<div class="contrast-info" aria-live="polite">
				<span class="contrast-label">Contrast on background:</span>
				<span class="contrast-value" class:pass={fgBgMeetsAA} class:fail={!fgBgMeetsAA}>
					{fgBgContrast.toFixed(2)}:1
				</span>
				{#if fgBgMeetsAA}
					<span class="wcag-badge pass">AA</span>
				{:else}
					<span class="wcag-badge fail">Fails AA</span>
				{/if}
			</div>
		</div>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Foreground Muted</span>
				<span class="label-hint">Secondary text color</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.foregroundMuted}
						onchange={(e) =>
							handleColorChange("foregroundMuted", (e.target as HTMLInputElement).value)}
						aria-label="Foreground muted color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.foregroundMuted}">
						<span style="color: {suggestReadableColor(localColors.foregroundMuted)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.foregroundMuted}
						value={hexInputs.foregroundMuted}
						oninput={(e) => handleHexInput("foregroundMuted", (e.target as HTMLInputElement).value)}
						placeholder="#666666"
						maxlength="7"
						aria-label="Foreground muted hex value"
						aria-invalid={!validationState.foregroundMuted}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("foregroundMuted")}
					aria-label="Reset foreground muted color"
				>
					Reset
				</button>
			</div>
			<div class="contrast-info" aria-live="polite">
				<span class="contrast-label">Contrast on background:</span>
				<span class="contrast-value" class:pass={mutedBgMeetsAA} class:fail={!mutedBgMeetsAA}>
					{mutedBgContrast.toFixed(2)}:1
				</span>
				{#if mutedBgMeetsAA}
					<span class="wcag-badge pass">AA</span>
				{:else}
					<span class="wcag-badge fail">Fails AA</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- Accent & Border Section -->
	<section class="color-section">
		<h4>Accent & Border</h4>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Accent</span>
				<span class="label-hint">Links and highlights</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.accent}
						onchange={(e) => handleColorChange("accent", (e.target as HTMLInputElement).value)}
						aria-label="Accent color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.accent}">
						<span style="color: {suggestReadableColor(localColors.accent)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.accent}
						value={hexInputs.accent}
						oninput={(e) => handleHexInput("accent", (e.target as HTMLInputElement).value)}
						placeholder="#16a34a"
						maxlength="7"
						aria-label="Accent hex value"
						aria-invalid={!validationState.accent}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("accent")}
					aria-label="Reset accent color"
				>
					Reset
				</button>
			</div>
		</div>

		<div class="color-input-group">
			<label class="color-label">
				<span class="label-text">Border</span>
				<span class="label-hint">Dividers and outlines</span>
			</label>
			<div class="picker-row">
				<div class="color-input-wrapper">
					<input
						type="color"
						value={localColors.border}
						onchange={(e) => handleColorChange("border", (e.target as HTMLInputElement).value)}
						aria-label="Border color picker"
					/>
					<div class="color-preview" style="background-color: {localColors.border}">
						<span style="color: {suggestReadableColor(localColors.border)}">Aa</span>
					</div>
				</div>
				<div class="hex-input-wrapper">
					<input
						type="text"
						class="hex-input"
						class:invalid={!validationState.border}
						value={hexInputs.border}
						oninput={(e) => handleHexInput("border", (e.target as HTMLInputElement).value)}
						placeholder="#e5e5e5"
						maxlength="7"
						aria-label="Border hex value"
						aria-invalid={!validationState.border}
					/>
				</div>
				<button
					type="button"
					class="reset-button"
					onclick={() => resetColor("border")}
					aria-label="Reset border color"
				>
					Reset
				</button>
			</div>
		</div>
	</section>

	<!-- Presets Section -->
	<section class="presets-section">
		<h4>Color Presets</h4>
		<p class="presets-hint">Quick access to popular color schemes</p>
		<div class="presets-grid" role="list">
			{#each presets as preset}
				<button
					type="button"
					class="preset-card"
					onclick={() => applyPreset(preset)}
					aria-label="Apply {preset.name} color preset"
					role="listitem"
				>
					<div class="preset-name">{preset.name}</div>
					<div class="preset-preview">
						<div class="preset-color" style="background-color: {preset.colors.background}"></div>
						<div class="preset-color" style="background-color: {preset.colors.surface}"></div>
						<div class="preset-color" style="background-color: {preset.colors.foreground}"></div>
						<div class="preset-color" style="background-color: {preset.colors.accent}"></div>
					</div>
				</button>
			{/each}
		</div>
	</section>
</div>

<style>
	.color-panel {
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

	.color-section {
		padding: 1.25rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
	}

	.color-section h4 {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.color-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.color-input-group:last-child {
		margin-bottom: 0;
	}

	.color-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.label-text {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.label-hint {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.picker-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.color-input-wrapper {
		position: relative;
		width: 3.5rem;
		height: 3.5rem;
		flex-shrink: 0;
	}

	.color-input-wrapper input[type="color"] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.color-preview {
		width: 100%;
		height: 100%;
		border-radius: 0.5rem;
		border: 2px solid var(--color-border, #e5e5e5);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1rem;
		pointer-events: none;
		transition: border-color 0.15s ease;
	}

	.color-input-wrapper:focus-within .color-preview {
		border-color: var(--color-accent, #16a34a);
		outline: 2px solid var(--color-accent, #16a34a);
		outline-offset: 2px;
	}

	.hex-input-wrapper {
		flex: 1;
		max-width: 8rem;
	}

	.hex-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.875rem;
		background: var(--color-background, #fefdfb);
		color: var(--color-foreground, #111);
		text-transform: uppercase;
		transition: border-color 0.15s ease;
	}

	.hex-input:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.hex-input.invalid {
		border-color: #dc2626;
	}

	.reset-button {
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.reset-button:hover {
		background: var(--color-surface, #fff);
		border-color: var(--color-foreground-muted, #666);
	}

	.reset-button:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.contrast-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--color-background, #fefdfb);
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.contrast-label {
		color: var(--color-foreground-muted, #666);
	}

	.contrast-value {
		font-weight: 600;
		font-family: var(--font-mono, ui-monospace, monospace);
	}

	.contrast-value.pass {
		color: #16a34a;
	}

	.contrast-value.fail {
		color: #dc2626;
	}

	.wcag-badge {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.wcag-badge.pass {
		background: #dcfce7;
		color: #166534;
	}

	.wcag-badge.fail {
		background: #fee2e2;
		color: #991b1b;
	}

	.presets-section {
		padding: 1.25rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
	}

	.presets-section h4 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.presets-hint {
		margin: 0 0 1rem;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.presets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: 0.75rem;
	}

	.preset-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-background, #fefdfb);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-card:hover {
		border-color: var(--color-accent, #16a34a);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.preset-card:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.preset-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
	}

	.preset-preview {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
		height: 2rem;
	}

	.preset-color {
		border-radius: 0.25rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}
</style>
