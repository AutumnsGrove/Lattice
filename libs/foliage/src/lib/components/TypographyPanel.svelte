<script lang="ts">
	// TypographyPanel.svelte
	// Typography customization panel for theme customizer

	import type { ThemeFonts } from "../types.js";

	interface Props {
		fonts: ThemeFonts;
		customFonts?: string[];
		onChange?: (fonts: Partial<ThemeFonts>) => void;
	}

	let { fonts, customFonts, onChange }: Props = $props();

	// System font stacks with fallbacks
	const systemFonts = [
		{ name: "System UI", stack: "system-ui, -apple-system, sans-serif" },
		{ name: "Arial", stack: "Arial, Helvetica, sans-serif" },
		{ name: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
		{ name: "Times New Roman", stack: '"Times New Roman", Times, serif' },
		{ name: "Verdana", stack: "Verdana, Geneva, sans-serif" },
		{ name: "Trebuchet MS", stack: '"Trebuchet MS", sans-serif' },
		{ name: "Palatino", stack: 'Palatino, "Palatino Linotype", serif' },
		{ name: "Garamond", stack: "Garamond, serif" },
		{ name: "Impact", stack: "Impact, sans-serif" },
	];

	const monoFonts = [
		{ name: "UI Monospace", stack: "ui-monospace, monospace" },
		{ name: "Courier New", stack: '"Courier New", Courier, monospace' },
		{ name: "Monaco", stack: 'Monaco, "Lucida Console", monospace' },
		{ name: "Consolas", stack: "Consolas, monospace" },
	];

	// Local state for current selections
	let selectedHeading = $state(fonts.heading);
	let selectedBody = $state(fonts.body);
	let selectedMono = $state(fonts.mono);

	// Preview text samples
	const headingSample = "The Quick Brown Fox Jumps Over";
	const bodySample =
		"The quick brown fox jumps over the lazy dog. Typography matters for readability and visual identity. Good font choices enhance the reading experience.";
	const monoSample = 'const theme = { font: "monospace" };';

	// Handle font selection changes
	function handleHeadingChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedHeading = target.value;
		onChange?.({ heading: target.value });
	}

	function handleBodyChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedBody = target.value;
		onChange?.({ body: target.value });
	}

	function handleMonoChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedMono = target.value;
		onChange?.({ mono: target.value });
	}

	// Handle custom font selection
	function selectCustomFont(fontStack: string, role: "heading" | "body" | "mono") {
		if (role === "heading") {
			selectedHeading = fontStack;
			onChange?.({ heading: fontStack });
		} else if (role === "body") {
			selectedBody = fontStack;
			onChange?.({ body: fontStack });
		} else {
			selectedMono = fontStack;
			onChange?.({ mono: fontStack });
		}
	}

	// Keyboard navigation for custom font buttons
	function handleCustomFontKeydown(
		event: KeyboardEvent,
		fontStack: string,
		role: "heading" | "body" | "mono",
	) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectCustomFont(fontStack, role);
		}
	}

	// Sync local state when props change externally
	$effect(() => {
		if (fonts.heading !== selectedHeading) {
			selectedHeading = fonts.heading;
		}
		if (fonts.body !== selectedBody) {
			selectedBody = fonts.body;
		}
		if (fonts.mono !== selectedMono) {
			selectedMono = fonts.mono;
		}
	});
</script>

<div class="typography-panel">
	<h3 class="panel-title">Typography</h3>

	<!-- Heading font section -->
	<div class="font-section">
		<label class="font-label" for="heading-font-select">
			<span class="label-text">Heading Font</span>
			<span class="label-hint">Used for titles and section headers</span>
		</label>

		<select
			id="heading-font-select"
			class="font-select"
			value={selectedHeading}
			onchange={handleHeadingChange}
			aria-label="Select heading font"
		>
			<optgroup label="System Fonts">
				{#each systemFonts as font}
					<option value={font.stack}>{font.name}</option>
				{/each}
			</optgroup>
			{#if customFonts && customFonts.length > 0}
				<optgroup label="Custom Fonts">
					{#each customFonts as customFont}
						<option value={customFont}>{customFont}</option>
					{/each}
				</optgroup>
			{/if}
		</select>

		<div class="preview-box" style="font-family: {selectedHeading}">
			<h4 class="preview-heading">{headingSample}</h4>
		</div>
	</div>

	<!-- Body font section -->
	<div class="font-section">
		<label class="font-label" for="body-font-select">
			<span class="label-text">Body Font</span>
			<span class="label-hint">Used for paragraphs and general text</span>
		</label>

		<select
			id="body-font-select"
			class="font-select"
			value={selectedBody}
			onchange={handleBodyChange}
			aria-label="Select body font"
		>
			<optgroup label="System Fonts">
				{#each systemFonts as font}
					<option value={font.stack}>{font.name}</option>
				{/each}
			</optgroup>
			{#if customFonts && customFonts.length > 0}
				<optgroup label="Custom Fonts">
					{#each customFonts as customFont}
						<option value={customFont}>{customFont}</option>
					{/each}
				</optgroup>
			{/if}
		</select>

		<div class="preview-box" style="font-family: {selectedBody}">
			<p class="preview-body">{bodySample}</p>
		</div>
	</div>

	<!-- Mono font section -->
	<div class="font-section">
		<label class="font-label" for="mono-font-select">
			<span class="label-text">Code Font</span>
			<span class="label-hint">Used for code blocks and technical text</span>
		</label>

		<select
			id="mono-font-select"
			class="font-select"
			value={selectedMono}
			onchange={handleMonoChange}
			aria-label="Select monospace font"
		>
			<optgroup label="Monospace Fonts">
				{#each monoFonts as font}
					<option value={font.stack}>{font.name}</option>
				{/each}
			</optgroup>
			{#if customFonts && customFonts.length > 0}
				<optgroup label="Custom Fonts">
					{#each customFonts as customFont}
						<option value={customFont}>{customFont}</option>
					{/each}
				</optgroup>
			{/if}
		</select>

		<div class="preview-box mono-preview" style="font-family: {selectedMono}">
			<code class="preview-code">{monoSample}</code>
		</div>
	</div>

	<!-- Custom fonts quick access (Evergreen tier feature) -->
	{#if customFonts && customFonts.length > 0}
		<div class="custom-fonts-section">
			<h4 class="section-heading">Your Custom Fonts</h4>
			<p class="section-hint">Click a font to preview it. Select a role above to apply it.</p>

			<div class="custom-fonts-grid">
				{#each customFonts as customFont}
					<div class="custom-font-card" style="font-family: {customFont}">
						<div class="custom-font-name">{customFont}</div>
						<div class="custom-font-sample">Aa Bb Cc 123</div>
						<div class="custom-font-actions">
							<button
								type="button"
								class="apply-button"
								onclick={() => selectCustomFont(customFont, "heading")}
								onkeydown={(e) => handleCustomFontKeydown(e, customFont, "heading")}
								aria-label="Apply {customFont} to headings"
							>
								Heading
							</button>
							<button
								type="button"
								class="apply-button"
								onclick={() => selectCustomFont(customFont, "body")}
								onkeydown={(e) => handleCustomFontKeydown(e, customFont, "body")}
								aria-label="Apply {customFont} to body"
							>
								Body
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.typography-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-body, system-ui, sans-serif);
	}

	.panel-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.font-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
	}

	.font-section:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.font-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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

	.font-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.font-select:hover {
		border-color: var(--color-accent, #16a34a);
	}

	.font-select:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.preview-box {
		padding: 1rem;
		background: var(--color-surface, #fafafa);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		min-height: 4rem;
		display: flex;
		align-items: center;
	}

	.preview-heading {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		line-height: 1.3;
	}

	.preview-body {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--color-foreground, #111);
		line-height: 1.6;
	}

	.mono-preview {
		background: #f8f9fa;
		border: 1px dashed var(--color-border, #e5e5e5);
	}

	.preview-code {
		display: block;
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
		line-height: 1.5;
	}

	.custom-fonts-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-surface, #fafafa);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border, #e5e5e5);
	}

	.section-heading {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.section-hint {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.custom-fonts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.custom-font-card {
		padding: 1rem;
		background: var(--color-background, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.custom-font-card:hover {
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.custom-font-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		word-break: break-word;
	}

	.custom-font-sample {
		font-size: 1.25rem;
		color: var(--color-foreground-muted, #666);
		padding: 0.5rem 0;
	}

	.custom-font-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.apply-button {
		flex: 1;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-accent, #16a34a);
		background: transparent;
		border: 1px solid var(--color-accent, #16a34a);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.apply-button:hover {
		background: var(--color-accent, #16a34a);
		color: #fff;
	}

	.apply-button:focus {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.apply-button:active {
		transform: scale(0.98);
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.typography-panel {
			gap: 1.25rem;
		}

		.preview-heading {
			font-size: 1.25rem;
		}

		.preview-body {
			font-size: 0.875rem;
		}

		.custom-fonts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
