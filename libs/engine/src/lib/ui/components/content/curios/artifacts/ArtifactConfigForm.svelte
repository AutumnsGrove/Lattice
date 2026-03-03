<script lang="ts">
	/**
	 * ArtifactConfigForm — Dynamic config editor driven by ARTIFACT_CONFIG_FIELDS registry.
	 *
	 * Renders appropriate form controls (text, textarea, select, color, date, number, toggle)
	 * for each artifact type's configurable fields. Serializes to a hidden JSON input for
	 * form submission.
	 */
	import {
		ARTIFACT_CONFIG_FIELDS,
		type ArtifactType,
		type ArtifactConfigFieldDef,
	} from "$lib/curios/artifacts";

	let {
		artifactType,
		config = {},
		inputName = "config",
	}: {
		artifactType: ArtifactType;
		config?: Record<string, unknown>;
		inputName?: string;
	} = $props();

	let localConfig = $state<Record<string, unknown>>({});

	// Sync local state when artifact type or config changes
	$effect(() => {
		localConfig = { ...config };
	});

	const fields = $derived(ARTIFACT_CONFIG_FIELDS[artifactType] ?? []);

	/**
	 * For textarea fields that represent arrays (customAnswers, customFortunes),
	 * convert array to newline-separated string for display
	 */
	function getTextareaValue(field: ArtifactConfigFieldDef): string {
		const val = localConfig[field.key];
		if (Array.isArray(val)) return val.join("\n");
		if (typeof val === "string") return val;
		return "";
	}

	/**
	 * For textarea fields, split input by newlines and filter empty lines
	 */
	function setTextareaValue(field: ArtifactConfigFieldDef, text: string) {
		const lines = text
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
		localConfig[field.key] = lines.length > 0 ? lines : undefined;
		localConfig = localConfig;
	}

	function setValue(key: string, value: unknown) {
		if (value === "" || value === undefined) {
			delete localConfig[key];
		} else {
			localConfig[key] = value;
		}
		localConfig = localConfig;
	}

	/** Serialize config object, omitting undefined/empty values */
	const serialized = $derived(
		JSON.stringify(
			Object.fromEntries(
				Object.entries(localConfig).filter(([, v]) => v !== undefined && v !== ""),
			),
		),
	);
</script>

{#if fields.length > 0}
	<div class="config-fields">
		{#each fields as field (field.key)}
			<div class="config-field">
				<label for="cfg-{field.key}">
					{field.label}
					{#if field.required}<span class="required">*</span>{/if}
				</label>

				{#if field.type === "text"}
					<input
						id="cfg-{field.key}"
						type="text"
						class="glass-input"
						placeholder={field.placeholder ?? ""}
						value={localConfig[field.key] ?? ""}
						oninput={(e) => setValue(field.key, e.currentTarget.value)}
					/>
				{:else if field.type === "textarea"}
					<textarea
						id="cfg-{field.key}"
						class="glass-input config-textarea"
						placeholder={field.placeholder ?? ""}
						rows="4"
						value={getTextareaValue(field)}
						oninput={(e) => setTextareaValue(field, e.currentTarget.value)}
					></textarea>
				{:else if field.type === "select"}
					<select
						id="cfg-{field.key}"
						class="glass-input"
						value={localConfig[field.key] ?? ""}
						onchange={(e) => setValue(field.key, e.currentTarget.value)}
					>
						<option value="">Default</option>
						{#each field.options ?? [] as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				{:else if field.type === "color"}
					<input
						id="cfg-{field.key}"
						type="color"
						class="glass-input color-input"
						value={localConfig[field.key] ?? "#8b7355"}
						oninput={(e) => setValue(field.key, e.currentTarget.value)}
					/>
				{:else if field.type === "date"}
					<input
						id="cfg-{field.key}"
						type="date"
						class="glass-input"
						value={localConfig[field.key] ?? ""}
						oninput={(e) => setValue(field.key, e.currentTarget.value)}
					/>
				{:else if field.type === "number"}
					<input
						id="cfg-{field.key}"
						type="number"
						class="glass-input"
						placeholder={field.placeholder ?? ""}
						value={localConfig[field.key] ?? ""}
						oninput={(e) => setValue(field.key, e.currentTarget.valueAsNumber || undefined)}
					/>
				{:else if field.type === "toggle"}
					<label class="toggle-row">
						<input
							type="checkbox"
							checked={!!localConfig[field.key]}
							onchange={(e) => setValue(field.key, e.currentTarget.checked || undefined)}
						/>
						<span class="toggle-label">{field.helpText ?? "Enabled"}</span>
					</label>
				{/if}

				{#if field.helpText && field.type !== "toggle"}
					<span class="help-text">{field.helpText}</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- Hidden input serializes config as JSON for form submission -->
<input type="hidden" name={inputName} value={serialized} />

<style>
	.config-fields {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.config-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.config-field > label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.required {
		color: var(--color-danger, #ef4444);
		margin-left: 0.125rem;
	}

	.glass-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		background: var(--grove-overlay-4);
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.glass-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.config-textarea {
		resize: vertical;
		min-height: 4rem;
		font-family: inherit;
	}

	.color-input {
		height: 2.5rem;
		padding: 0.25rem;
		cursor: pointer;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.toggle-label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.help-text {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		opacity: 0.7;
	}
</style>
