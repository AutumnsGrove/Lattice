<script lang="ts">
	// AccentColorPicker.svelte
	// Color picker for accent color customization with live preview and accessibility

	import { getContrastRatio, meetsWCAGAA, suggestReadableColor } from "../utils/contrast.js";
	import { grove } from "../tokens/colors.js";

	interface Props {
		value: string;
		backgroundColor?: string;
		onChange?: (color: string) => void;
		label?: string;
		showContrast?: boolean;
	}

	let {
		value = "#16a34a",
		backgroundColor = "#fefdfb",
		onChange,
		label = "Accent Color",
		showContrast = true,
	}: Props = $props();

	// Local state for hex input
	let hexInput = $state(value);
	let isValidHex = $state(true);

	// Preset color swatches - based on grove palette and common accent colors
	const presets = [
		{ name: "Grove Green", color: grove[600] },
		{ name: "Forest", color: grove[700] },
		{ name: "Emerald", color: "#10b981" },
		{ name: "Sky", color: "#0ea5e9" },
		{ name: "Indigo", color: "#6366f1" },
		{ name: "Purple", color: "#a855f7" },
		{ name: "Pink", color: "#ec4899" },
		{ name: "Rose", color: "#f43f5e" },
		{ name: "Orange", color: "#f97316" },
		{ name: "Amber", color: "#f59e0b" },
	];

	// Derived values
	let contrastRatio = $derived(getContrastRatio(value, backgroundColor));
	let meetsAA = $derived(meetsWCAGAA(value, backgroundColor));
	let suggestedTextColor = $derived(suggestReadableColor(value));

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
	function handleColorPickerChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newColor = target.value;
		hexInput = newColor;
		isValidHex = true;
		onChange?.(newColor);
	}

	// Handle hex input change
	function handleHexInput(event: Event) {
		const target = event.target as HTMLInputElement;
		let newValue = target.value;

		// Add # if missing
		if (newValue && !newValue.startsWith("#")) {
			newValue = "#" + newValue;
		}

		hexInput = newValue;

		if (isValidHexColor(newValue)) {
			isValidHex = true;
			const normalized = normalizeHex(newValue);
			onChange?.(normalized);
		} else {
			isValidHex = newValue === "" || newValue === "#";
		}
	}

	// Handle preset selection
	function selectPreset(color: string) {
		hexInput = color;
		isValidHex = true;
		onChange?.(color);
	}

	// Handle keyboard navigation for presets
	function handlePresetKeydown(event: KeyboardEvent, color: string) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectPreset(color);
		}
	}

	// Sync hexInput when value prop changes externally
	$effect(() => {
		if (isValidHexColor(value) && value !== hexInput) {
			hexInput = value;
			isValidHex = true;
		}
	});
</script>

<div class="accent-color-picker">
	<label class="picker-label" for="accent-color-input">{label}</label>

	<div class="picker-row">
		<!-- Native color picker -->
		<div class="color-input-wrapper">
			<input
				type="color"
				id="accent-color-input"
				{value}
				onchange={handleColorPickerChange}
				aria-label="{label} color picker"
			/>
			<div class="color-preview" style="background-color: {value}">
				<span style="color: {suggestedTextColor}">Aa</span>
			</div>
		</div>

		<!-- Hex input -->
		<div class="hex-input-wrapper">
			<input
				type="text"
				class="hex-input"
				class:invalid={!isValidHex}
				value={hexInput}
				oninput={handleHexInput}
				placeholder="#16a34a"
				maxlength="7"
				aria-label="Hex color value"
				aria-invalid={!isValidHex}
			/>
			{#if !isValidHex}
				<span class="error-hint" role="alert">Invalid hex</span>
			{/if}
		</div>
	</div>

	<!-- Preset swatches -->
	<div class="presets" role="listbox" aria-label="Preset colors">
		{#each presets as preset}
			<button
				type="button"
				class="preset-swatch"
				class:selected={value === preset.color}
				style="background-color: {preset.color}"
				onclick={() => selectPreset(preset.color)}
				onkeydown={(e) => handlePresetKeydown(e, preset.color)}
				aria-label="{preset.name} ({preset.color})"
				aria-selected={value === preset.color}
				role="option"
			>
				{#if value === preset.color}
					<svg
						class="check-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke={suggestReadableColor(preset.color)}
						stroke-width="3"
						aria-hidden="true"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Contrast info -->
	{#if showContrast}
		<div class="contrast-info" aria-live="polite">
			<div class="contrast-ratio">
				<span class="contrast-label">Contrast:</span>
				<span class="contrast-value" class:pass={meetsAA} class:fail={!meetsAA}>
					{contrastRatio.toFixed(2)}:1
				</span>
				{#if meetsAA}
					<span class="wcag-badge pass">AA</span>
				{:else}
					<span class="wcag-badge fail">Fails AA</span>
				{/if}
			</div>
			<p class="contrast-hint">
				{#if meetsAA}
					This color has sufficient contrast for text.
				{:else}
					Consider choosing a {getContrastRatio("#ffffff", backgroundColor) >
					getContrastRatio("#000000", backgroundColor)
						? "lighter"
						: "darker"} color for better readability.
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	.accent-color-picker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: var(--font-body, system-ui, sans-serif);
	}

	.picker-label {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.picker-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.color-input-wrapper {
		position: relative;
		width: 3.5rem;
		height: 3.5rem;
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
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		max-width: 8rem;
	}

	.hex-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.875rem;
		background: var(--color-surface, #fff);
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

	.error-hint {
		font-size: 0.75rem;
		color: #dc2626;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preset-swatch {
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		border: 2px solid transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		padding: 0;
	}

	.preset-swatch:hover {
		transform: scale(1.1);
	}

	.preset-swatch:focus {
		outline: none;
		border-color: var(--color-foreground, #111);
		box-shadow: 0 0 0 2px var(--color-background, #fff);
	}

	.preset-swatch.selected {
		border-color: var(--color-foreground, #111);
		box-shadow: 0 0 0 2px var(--color-background, #fff);
	}

	.check-icon {
		width: 1rem;
		height: 1rem;
	}

	.contrast-info {
		padding: 0.75rem;
		background: var(--color-surface, #fafafa);
		border-radius: 0.375rem;
		border: 1px solid var(--color-border, #e5e5e5);
	}

	.contrast-ratio {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.contrast-hint {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}
</style>
