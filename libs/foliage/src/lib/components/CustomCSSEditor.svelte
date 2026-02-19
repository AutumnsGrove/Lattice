<script lang="ts">
	// CustomCSSEditor.svelte
	// Custom CSS editor with validation and security checks

	interface Props {
		value: string;
		maxSize?: number;
		onChange?: (css: string) => void;
		onValidate?: (isValid: boolean, error?: string) => void;
	}

	let { value, maxSize = 10240, onChange, onValidate }: Props = $props();

	interface ValidationResult {
		valid: boolean;
		errors: string[];
		warnings: string[];
	}

	// Local state for CSS input
	let localValue = $state(value);

	// Validate CSS for security and size
	function validateCSS(css: string, maxSize: number): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Size check
		const size = new Blob([css]).size;
		if (size > maxSize) {
			errors.push(
				`CSS exceeds ${(maxSize / 1024).toFixed(1)}KB limit (current: ${(size / 1024).toFixed(1)}KB)`,
			);
		} else if (size > maxSize * 0.8) {
			warnings.push(
				`Approaching size limit: ${(size / 1024).toFixed(1)}KB / ${(maxSize / 1024).toFixed(1)}KB`,
			);
		}

		// Blocked patterns for security
		const blockedPatterns = [
			{ pattern: /@import/gi, message: "@import statements are not allowed (security risk)" },
			{ pattern: /javascript:/gi, message: "javascript: URLs are not allowed (security risk)" },
			{ pattern: /expression\s*\(/gi, message: "expression() is not allowed (IE vulnerability)" },
			{ pattern: /behavior\s*:/gi, message: "behavior: is not allowed (IE vulnerability)" },
			{ pattern: /-moz-binding/gi, message: "-moz-binding is not allowed (Firefox vulnerability)" },
			{ pattern: /<script/gi, message: "Script tags are not allowed" },
			{
				pattern: /url\s*\(\s*["']?https?:\/\//gi,
				message: "External URLs in url() are not allowed (security risk)",
			},
		];

		for (const { pattern, message } of blockedPatterns) {
			if (pattern.test(css)) {
				errors.push(message);
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	// Derived validation state
	let validation = $derived(validateCSS(localValue, maxSize));
	let sizeBytes = $derived(new Blob([localValue]).size);
	let sizeKB = $derived((sizeBytes / 1024).toFixed(1));
	let maxSizeKB = $derived((maxSize / 1024).toFixed(1));
	let sizePercent = $derived(Math.min((sizeBytes / maxSize) * 100, 100));
	let lineCount = $derived(localValue.split("\n").length);
	let charCount = $derived(localValue.length);

	// CSS variable hints
	const cssVariableHints = [
		"--color-background",
		"--color-surface",
		"--color-foreground",
		"--color-foreground-muted",
		"--color-accent",
		"--color-border",
		"--font-heading",
		"--font-body",
		"--font-mono",
	];

	// Handle input change
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		let newValue = target.value;

		// Check if exceeds max size and truncate if needed
		const newSize = new Blob([newValue]).size;
		if (newSize > maxSize) {
			// Truncate to fit within size limit
			while (new Blob([newValue]).size > maxSize && newValue.length > 0) {
				newValue = newValue.slice(0, -1);
			}
			target.value = newValue;
		}

		localValue = newValue;
		onChange?.(newValue);
	}

	// Clear CSS
	function clearCSS() {
		localValue = "";
		onChange?.("");
	}

	// Call onValidate when validation changes
	$effect(() => {
		onValidate?.(validation.valid, validation.errors[0]);
	});

	// Sync with external value changes
	$effect(() => {
		if (value !== localValue) {
			localValue = value;
		}
	});
</script>

<div class="custom-css-editor">
	<div class="editor-header">
		<h3 class="editor-title">Custom CSS</h3>
		<button
			type="button"
			class="clear-button"
			onclick={clearCSS}
			disabled={localValue.length === 0}
			aria-label="Clear CSS"
		>
			Clear
		</button>
	</div>

	<div class="editor-info">
		<p class="info-text">
			Add custom CSS to personalize your theme. Use CSS variables for dynamic theming.
		</p>
	</div>

	<!-- CSS Variables Hint -->
	<details class="hints-section">
		<summary class="hints-summary">Available CSS Variables</summary>
		<div class="hints-content">
			<code class="hints-code">
				{#each cssVariableHints as variable}
					<span class="hint-variable">{variable}</span>
				{/each}
			</code>
		</div>
	</details>

	<!-- Textarea -->
	<div class="editor-container">
		<textarea
			class="css-textarea"
			class:has-errors={!validation.valid}
			bind:value={localValue}
			oninput={handleInput}
			placeholder={`/* Example CSS */\n.my-custom-class {\n  color: var(--color-accent);\n  font-family: var(--font-body);\n  padding: 1rem;\n}\n\n/* Target specific elements */\narticle {\n  max-width: 42rem;\n  margin: 0 auto;\n}`}
			spellcheck="false"
			aria-label="Custom CSS editor"
			aria-describedby="css-size-info css-validation-errors"
		></textarea>

		<!-- Line numbers would go here - optional feature for future -->
	</div>

	<!-- Size indicator -->
	<div class="size-info" id="css-size-info">
		<div class="size-details">
			<span class="size-label">Size:</span>
			<span class="size-value" class:warning={sizePercent > 80} class:error={sizePercent >= 100}>
				{sizeKB} KB / {maxSizeKB} KB
			</span>
			<span class="char-count">({charCount} chars, {lineCount} lines)</span>
		</div>
		<div class="size-bar">
			<div
				class="size-fill"
				class:warning={sizePercent > 80}
				class:error={sizePercent >= 100}
				style="width: {sizePercent}%"
			></div>
		</div>
	</div>

	<!-- Validation errors -->
	{#if validation.errors.length > 0}
		<div class="validation-section errors" id="css-validation-errors" role="alert">
			<div class="validation-title">Errors ({validation.errors.length})</div>
			<ul class="validation-list">
				{#each validation.errors as error}
					<li class="validation-item error">{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Validation warnings -->
	{#if validation.warnings.length > 0}
		<div class="validation-section warnings" role="status">
			<div class="validation-title">Warnings ({validation.warnings.length})</div>
			<ul class="validation-list">
				{#each validation.warnings as warning}
					<li class="validation-item warning">{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Valid indicator -->
	{#if localValue.length > 0 && validation.valid && validation.warnings.length === 0}
		<div class="validation-section success" role="status">
			<div class="validation-title">✓ CSS is valid and ready to use</div>
		</div>
	{/if}
</div>

<style>
	.custom-css-editor {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.editor-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.clear-button {
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

	.clear-button:hover:not(:disabled) {
		background: var(--color-background, #fefdfb);
		border-color: var(--color-foreground-muted, #666);
		color: var(--color-foreground, #111);
	}

	.clear-button:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.clear-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.editor-info {
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border-left: 3px solid var(--color-accent, #16a34a);
		border-radius: 0.25rem;
	}

	.info-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.5;
	}

	/* Hints section */
	.hints-section {
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		padding: 0.75rem;
	}

	.hints-summary {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
		cursor: pointer;
		user-select: none;
		list-style: none;
	}

	.hints-summary::-webkit-details-marker {
		display: none;
	}

	.hints-summary::before {
		content: "▶";
		display: inline-block;
		margin-right: 0.5rem;
		transition: transform 0.15s ease;
	}

	.hints-section[open] .hints-summary::before {
		transform: rotate(90deg);
	}

	.hints-content {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: var(--color-background, #fefdfb);
		border-radius: 0.25rem;
	}

	.hints-code {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
	}

	.hint-variable {
		padding: 0.25rem 0.5rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		color: var(--color-accent, #16a34a);
	}

	/* Editor container */
	.editor-container {
		position: relative;
		background: #1e1e1e;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 2px solid var(--color-border, #e5e5e5);
		transition: border-color 0.15s ease;
	}

	.editor-container:focus-within {
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.editor-container:has(.has-errors) {
		border-color: #dc2626;
	}

	.css-textarea {
		width: 100%;
		min-height: 20rem;
		padding: 1rem;
		background: #1e1e1e;
		color: #d4d4d4;
		border: none;
		font-family: var(--font-mono, "Courier New", Courier, monospace);
		font-size: 0.875rem;
		line-height: 1.6;
		resize: vertical;
		outline: none;
		tab-size: 2;
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}

	.css-textarea::placeholder {
		color: #6a9955;
	}

	/* Size info */
	.size-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.size-details {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.size-label {
		font-weight: 500;
		color: var(--color-foreground, #111);
	}

	.size-value {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.size-value.warning {
		color: #ea580c;
	}

	.size-value.error {
		color: #dc2626;
	}

	.char-count {
		color: var(--color-foreground-muted, #666);
		font-size: 0.8125rem;
	}

	.size-bar {
		width: 100%;
		height: 0.5rem;
		background: var(--color-background, #fefdfb);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.size-fill {
		height: 100%;
		background: #16a34a;
		transition:
			width 0.2s ease,
			background-color 0.15s ease;
		border-radius: 0.25rem;
	}

	.size-fill.warning {
		background: #ea580c;
	}

	.size-fill.error {
		background: #dc2626;
	}

	/* Validation sections */
	.validation-section {
		padding: 0.75rem;
		border-radius: 0.375rem;
		border-left: 3px solid;
	}

	.validation-section.errors {
		background: #fee2e2;
		border-color: #dc2626;
	}

	.validation-section.warnings {
		background: #ffedd5;
		border-color: #ea580c;
	}

	.validation-section.success {
		background: #dcfce7;
		border-color: #16a34a;
	}

	.validation-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.validation-section.errors .validation-title {
		color: #991b1b;
	}

	.validation-section.warnings .validation-title {
		color: #9a3412;
	}

	.validation-section.success .validation-title {
		color: #166534;
	}

	.validation-list {
		margin: 0;
		padding-left: 1.25rem;
		list-style: disc;
	}

	.validation-item {
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 0.25rem;
	}

	.validation-item:last-child {
		margin-bottom: 0;
	}

	.validation-item.error {
		color: #991b1b;
	}

	.validation-item.warning {
		color: #9a3412;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.custom-css-editor {
			gap: 0.875rem;
		}

		.css-textarea {
			min-height: 16rem;
			font-size: 0.8125rem;
		}

		.size-details {
			flex-wrap: wrap;
		}

		.hints-code {
			font-size: 0.75rem;
		}
	}
</style>
