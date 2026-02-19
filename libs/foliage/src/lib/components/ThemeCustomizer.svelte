<script lang="ts">
	// ThemeCustomizer.svelte
	// Full theme customization panel (Oak+ tier)

	import type { Theme, ThemeSettings, ThemeColors, ThemeFonts, ThemeLayout } from "../types.js";
	import ColorPanel from "./ColorPanel.svelte";
	import TypographyPanel from "./TypographyPanel.svelte";
	import LayoutPanel from "./LayoutPanel.svelte";
	import CustomCSSEditor from "./CustomCSSEditor.svelte";

	interface Props {
		baseTheme: Theme;
		settings: ThemeSettings;
		onSave?: (settings: ThemeSettings) => void;
	}

	let { baseTheme, settings, onSave }: Props = $props();

	// Tab state
	type TabId = "colors" | "typography" | "layout" | "css";
	let activeTab = $state<TabId>("colors");

	// Local state for all customizations
	let localColors = $state<ThemeColors>({
		...baseTheme.colors,
		...settings.customColors,
	});

	let localFonts = $state<ThemeFonts>({
		...baseTheme.fonts,
		...settings.customTypography,
	});

	let localLayout = $state<ThemeLayout>({
		...baseTheme.layout,
		...settings.customLayout,
	});

	let localCustomCSS = $state<string>(settings.customCSS || baseTheme.customCSS || "");
	let cssIsValid = $state<boolean>(true);

	// Track if there are unsaved changes
	let hasChanges = $derived(
		JSON.stringify(localColors) !==
			JSON.stringify({ ...baseTheme.colors, ...settings.customColors }) ||
			JSON.stringify(localFonts) !==
				JSON.stringify({ ...baseTheme.fonts, ...settings.customTypography }) ||
			JSON.stringify(localLayout) !==
				JSON.stringify({ ...baseTheme.layout, ...settings.customLayout }) ||
			localCustomCSS !== (settings.customCSS || baseTheme.customCSS || ""),
	);

	// Effective theme for preview (exported for parent components)
	export let effectiveTheme = $derived<Theme>({
		...baseTheme,
		colors: localColors,
		fonts: localFonts,
		layout: localLayout,
		customCSS: localCustomCSS,
	});

	// Tab definitions with icons and labels
	const tabs: { id: TabId; label: string; icon: string }[] = [
		{ id: "colors", label: "Colors", icon: "🎨" },
		{ id: "typography", label: "Typography", icon: "✍️" },
		{ id: "layout", label: "Layout", icon: "📐" },
		{ id: "css", label: "Custom CSS", icon: "💾" },
	];

	// Handle panel changes
	function handleColorsChange(changes: Partial<ThemeColors>) {
		localColors = { ...localColors, ...changes };
	}

	function handleFontsChange(changes: Partial<ThemeFonts>) {
		localFonts = { ...localFonts, ...changes };
	}

	function handleLayoutChange(changes: Partial<ThemeLayout>) {
		localLayout = { ...localLayout, ...changes };
	}

	function handleCustomCSSChange(css: string) {
		localCustomCSS = css;
	}

	function handleCSSValidate(isValid: boolean, error?: string) {
		cssIsValid = isValid;
	}

	// Save changes
	function handleSave() {
		if (!onSave) return;

		const updatedSettings: ThemeSettings = {
			...settings,
			customColors: localColors,
			customTypography: localFonts,
			customLayout: localLayout,
			customCSS: localCustomCSS || undefined,
		};

		onSave(updatedSettings);
	}

	// Reset to base theme defaults
	function handleReset() {
		localColors = { ...baseTheme.colors };
		localFonts = { ...baseTheme.fonts };
		localLayout = { ...baseTheme.layout };
		localCustomCSS = baseTheme.customCSS || "";
	}

	// Cancel changes (revert to current settings)
	function handleCancel() {
		localColors = { ...baseTheme.colors, ...settings.customColors };
		localFonts = { ...baseTheme.fonts, ...settings.customTypography };
		localLayout = { ...baseTheme.layout, ...settings.customLayout };
		localCustomCSS = settings.customCSS || baseTheme.customCSS || "";
	}

	// Keyboard navigation for tabs
	function handleTabKeydown(event: KeyboardEvent, tabId: TabId) {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			const currentIndex = tabs.findIndex((t) => t.id === activeTab);
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
			activeTab = tabs[prevIndex].id;
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			const currentIndex = tabs.findIndex((t) => t.id === activeTab);
			const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
			activeTab = tabs[nextIndex].id;
		}
	}
</script>

<div class="theme-customizer">
	<!-- Header -->
	<header class="customizer-header">
		<h2 class="customizer-title">Theme Customizer</h2>
		<p class="customizer-subtitle">Customize colors, typography, layout, and more</p>
	</header>

	<!-- Tabs -->
	<nav class="tabs" role="tablist" aria-label="Theme customization sections">
		{#each tabs as tab}
			<button
				type="button"
				role="tab"
				class="tab-button"
				class:active={activeTab === tab.id}
				onclick={() => (activeTab = tab.id)}
				onkeydown={(e) => handleTabKeydown(e, tab.id)}
				aria-selected={activeTab === tab.id}
				aria-controls="{tab.id}-panel"
				id="{tab.id}-tab"
			>
				<span class="tab-icon" aria-hidden="true">{tab.icon}</span>
				<span class="tab-label">{tab.label}</span>
			</button>
		{/each}
	</nav>

	<!-- Tab Panels -->
	<div class="tab-content">
		<!-- Colors Panel -->
		<div
			role="tabpanel"
			id="colors-panel"
			aria-labelledby="colors-tab"
			class="tab-panel"
			class:active={activeTab === "colors"}
			hidden={activeTab !== "colors"}
		>
			<ColorPanel colors={localColors} onChange={handleColorsChange} />
		</div>

		<!-- Typography Panel -->
		<div
			role="tabpanel"
			id="typography-panel"
			aria-labelledby="typography-tab"
			class="tab-panel"
			class:active={activeTab === "typography"}
			hidden={activeTab !== "typography"}
		>
			<TypographyPanel fonts={localFonts} onChange={handleFontsChange} />
		</div>

		<!-- Layout Panel -->
		<div
			role="tabpanel"
			id="layout-panel"
			aria-labelledby="layout-tab"
			class="tab-panel"
			class:active={activeTab === "layout"}
			hidden={activeTab !== "layout"}
		>
			<LayoutPanel layout={localLayout} onChange={handleLayoutChange} />
		</div>

		<!-- Custom CSS Panel -->
		<div
			role="tabpanel"
			id="css-panel"
			aria-labelledby="css-tab"
			class="tab-panel"
			class:active={activeTab === "css"}
			hidden={activeTab !== "css"}
		>
			<CustomCSSEditor
				value={localCustomCSS}
				onChange={handleCustomCSSChange}
				onValidate={handleCSSValidate}
			/>
		</div>
	</div>

	<!-- Action Buttons -->
	<footer class="customizer-footer">
		<div class="action-buttons">
			<button
				type="button"
				class="button button-secondary"
				onclick={handleReset}
				aria-label="Reset all customizations to theme defaults"
			>
				Reset to Default
			</button>
			<button
				type="button"
				class="button button-secondary"
				onclick={handleCancel}
				disabled={!hasChanges}
				aria-label="Cancel unsaved changes"
			>
				Cancel
			</button>
			<button
				type="button"
				class="button button-primary"
				onclick={handleSave}
				disabled={!hasChanges || !cssIsValid}
				aria-label="Save theme customizations"
			>
				{hasChanges ? "Save Changes" : "Saved"}
			</button>
		</div>
	</footer>
</div>

<style>
	.theme-customizer {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		max-width: 400px;
		background: var(--color-background, #fefdfb);
		border-left: 1px solid var(--color-border, #e5e5e5);
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	/* Header */
	.customizer-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
	}

	.customizer-title {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.customizer-subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Tabs */
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
		background: var(--color-surface, #fff);
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.tabs::-webkit-scrollbar {
		height: 4px;
	}

	.tabs::-webkit-scrollbar-thumb {
		background: var(--color-border, #e5e5e5);
		border-radius: 2px;
	}

	.tab-button {
		flex: 1;
		min-width: fit-content;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		color: var(--color-foreground-muted, #666);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.tab-button:hover {
		background: var(--color-background, #fefdfb);
		color: var(--color-foreground, #111);
	}

	.tab-button:focus {
		outline: none;
		background: var(--color-background, #fefdfb);
		box-shadow: inset 0 0 0 2px var(--color-accent, #16a34a);
	}

	.tab-button.active {
		color: var(--color-accent, #16a34a);
		border-bottom-color: var(--color-accent, #16a34a);
	}

	.tab-icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	.tab-label {
		white-space: nowrap;
	}

	/* Tab Content */
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		scrollbar-width: thin;
	}

	.tab-content::-webkit-scrollbar {
		width: 8px;
	}

	.tab-content::-webkit-scrollbar-thumb {
		background: var(--color-border, #e5e5e5);
		border-radius: 4px;
	}

	.tab-content::-webkit-scrollbar-thumb:hover {
		background: var(--color-foreground-muted, #666);
	}

	.tab-panel {
		display: none;
		animation: fadeIn 0.2s ease;
	}

	.tab-panel.active {
		display: block;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Footer */
	.customizer-footer {
		padding: 1.5rem;
		border-top: 1px solid var(--color-border, #e5e5e5);
		background: var(--color-surface, #fff);
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.button {
		flex: 1;
		min-width: fit-content;
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
	}

	.button:focus {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 30%, transparent);
	}

	.button:active:not(:disabled) {
		transform: scale(0.98);
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-primary {
		background: var(--color-accent, #16a34a);
		color: #fff;
	}

	.button-primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 90%, #000);
	}

	.button-secondary {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 1px solid var(--color-border, #e5e5e5);
	}

	.button-secondary:hover:not(:disabled) {
		background: var(--color-background, #fefdfb);
		border-color: var(--color-foreground-muted, #666);
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.theme-customizer {
			max-width: 100%;
		}

		.tab-button {
			padding: 0.625rem 0.75rem;
			font-size: 0.7rem;
		}

		.tab-icon {
			font-size: 1rem;
		}

		.tab-content {
			padding: 1rem;
		}

		.customizer-footer {
			padding: 1rem;
		}

		.action-buttons {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}

	/* Print styles */
	@media print {
		.theme-customizer {
			display: none;
		}
	}
</style>
