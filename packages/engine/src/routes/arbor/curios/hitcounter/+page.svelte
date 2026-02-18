<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { Hash, ArrowLeft, RotateCcw } from "$lib/ui/components/icons";
	import {
		formatCount,
		toDigits,
		formatSinceDate,
		type HitCounterStyle,
		type HitCounterCountMode,
		type HitCounterSinceDateStyle,
	} from "$lib/curios/hitcounter";

	let { data, form } = $props();

	// Config form state
	let style = $state<HitCounterStyle>("classic");
	let label = $state("You are visitor");
	let showSinceDate = $state(true);
	let countMode = $state<HitCounterCountMode>("every");
	let sinceDateStyle = $state<HitCounterSinceDateStyle>("footnote");
	let isSubmitting = $state(false);

	// Label preset state
	let labelPreset = $state("You are visitor");
	let customLabel = $state("");

	// Sync form state with loaded data
	$effect(() => {
		if (data.config) {
			style = (data.config.style as HitCounterStyle) ?? "classic";
			label = data.config.label ?? "You are visitor";
			showSinceDate = data.config.showSinceDate ?? true;
			countMode = (data.config.countMode as HitCounterCountMode) ?? "every";
			sinceDateStyle = (data.config.sinceDateStyle as HitCounterSinceDateStyle) ?? "footnote";

			// Determine if label matches a preset or is custom
			const matchingPreset = data.labelPresets?.find(
				(p: { value: string }) => p.value === data.config.label && p.value !== "__custom__",
			);
			if (matchingPreset) {
				labelPreset = matchingPreset.value;
			} else {
				labelPreset = "__custom__";
				customLabel = data.config.label ?? "";
			}
		}
	});

	// Sync label from preset selection
	$effect(() => {
		if (labelPreset === "__custom__") {
			label = customLabel;
		} else {
			label = labelPreset;
		}
	});

	// Show toast on form result
	$effect(() => {
		if (form?.success && form?.reset) {
			toast.success("Counter reset to zero!");
		} else if (form?.success) {
			toast.success("Hit counter settings saved!");
		} else if (form?.error) {
			toast.error("Failed to save", { description: form.error });
		}
	});

	const previewCount = $derived(data.config?.count ?? 0);
	const previewDigits = $derived(toDigits(previewCount));
	const previewFormatted = $derived(formatCount(previewCount));
</script>

<svelte:head>
	<title>Hit Counter - Admin</title>
</svelte:head>

<div class="hitcounter-admin">
	<header class="page-header">
		<div class="header-top">
			<GlassButton href="/arbor/curios" variant="ghost" class="back-link">
				<ArrowLeft class="w-4 h-4" />
				Back to Curios
			</GlassButton>
		</div>
		<div class="title-row">
			<Hash class="header-icon" />
			<h1>Hit Counter</h1>
		</div>
		<p class="subtitle">The nostalgic page view counter. No tracking, just a number.</p>
	</header>

	<!-- Live Preview -->
	<GlassCard class="preview-card">
		<h3 class="preview-title">Preview</h3>
		<div class="counter-preview style-{style}">
			<!-- ─── Classic preview ─── -->
			{#if style === "classic"}
				<div class="classic-counter">
					{#if label}
						<span class="preview-label classic-plabel">{label}</span>
					{/if}
					<div class="classic-digits">
						{#each previewDigits as digit}
							<span class="classic-digit">{digit}</span>
						{/each}
					</div>
				</div>

				<!-- ─── Odometer preview ─── -->
			{:else if style === "odometer"}
				<div class="odometer-counter">
					{#if label}
						<span class="preview-label odometer-plabel">{label}</span>
					{/if}
					<div class="odometer-digits">
						{#each previewDigits as digit}
							<span class="odometer-cell">{digit}</span>
						{/each}
					</div>
				</div>

				<!-- ─── LCD preview ─── -->
			{:else if style === "lcd"}
				<div class="lcd-counter">
					{#if label}
						<span class="preview-label lcd-plabel">{label}</span>
					{/if}
					<div class="lcd-screen">
						{#each previewDigits as digit}
							<span class="lcd-cell">
								<span class="lcd-ghost" aria-hidden="true">8</span>
								<span class="lcd-active">{digit}</span>
							</span>
						{/each}
					</div>
				</div>

				<!-- ─── Minimal preview ─── -->
			{:else}
				<div class="minimal-counter">
					{#if label}
						<span class="minimal-label">{label}</span>
						<span class="minimal-sep" aria-hidden="true">&middot;</span>
					{/if}
					<span class="minimal-number">#{previewFormatted}</span>
				</div>
			{/if}

			{#if showSinceDate && data.config?.startedAt}
				<span class="since-date since-date--{sinceDateStyle}"
					>{formatSinceDate(data.config.startedAt)}</span
				>
			{/if}
		</div>
	</GlassCard>

	<!-- Settings -->
	<GlassCard class="settings-card">
		<form
			method="POST"
			action="?/save"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
		>
			<!-- Hidden label input — always carries the real value -->
			<input type="hidden" name="label" value={label} />
			<input type="hidden" name="countMode" value={countMode} />
			<input type="hidden" name="sinceDateStyle" value={sinceDateStyle} />

			<!-- Current Count -->
			<div class="form-section">
				<h3>Current Count</h3>
				<div class="count-display">
					<span class="big-count">{previewFormatted}</span>
					<span class="count-hint">visitors</span>
				</div>
			</div>

			<!-- Display Style -->
			<div class="form-section">
				<h3>Display Style</h3>
				<div class="style-grid">
					{#each data.styleOptions as option}
						<label class="style-option" class:selected={style === option.value}>
							<input type="radio" name="style" value={option.value} bind:group={style} />
							<span class="style-name">{option.label}</span>
							<span class="style-desc">{option.description}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Label -->
			<div class="form-section">
				<h3>Label</h3>
				<div class="input-group">
					<label class="input-label" for="labelPreset"> Text shown next to the counter </label>
					<select id="labelPreset" bind:value={labelPreset} class="text-input">
						{#each data.labelPresets as preset}
							<option value={preset.value}>{preset.label}</option>
						{/each}
					</select>
				</div>
				{#if labelPreset === "__custom__"}
					<div class="input-group">
						<label class="input-label" for="customLabel"> Custom label text </label>
						<input
							id="customLabel"
							type="text"
							bind:value={customLabel}
							placeholder="Your custom label..."
							maxlength="100"
							class="text-input"
						/>
					</div>
				{/if}
			</div>

			<!-- Options Section -->
			<div class="form-section">
				<h3>Options</h3>

				<!-- Count Mode -->
				<fieldset class="radio-group">
					<legend class="radio-legend">Counting mode</legend>
					{#each data.countModeOptions as option}
						<label class="radio-row" class:radio-selected={countMode === option.value}>
							<input type="radio" bind:group={countMode} value={option.value} />
							<span class="radio-content">
								<strong>{option.label}</strong>
								<span class="radio-desc">{option.description}</span>
							</span>
						</label>
					{/each}
				</fieldset>

				<!-- Since Date Toggle -->
				<label class="toggle-row">
					<span class="toggle-label">
						<strong>Show "since" date</strong>
						<span class="toggle-hint">Display when the counter started</span>
					</span>
					<input
						type="checkbox"
						name="showSinceDate"
						value="true"
						bind:checked={showSinceDate}
						class="toggle-input"
					/>
				</label>

				<!-- Since Date Style (shown only when showSinceDate is true) -->
				{#if showSinceDate}
					<fieldset class="radio-group radio-group--nested">
						<legend class="radio-legend">Date presentation</legend>
						{#each data.sinceDateStyleOptions as option}
							<label class="radio-row" class:radio-selected={sinceDateStyle === option.value}>
								<input type="radio" bind:group={sinceDateStyle} value={option.value} />
								<span class="radio-content">
									<strong>{option.label}</strong>
									<span class="radio-desc">{option.description}</span>
								</span>
							</label>
						{/each}
					</fieldset>
				{/if}
			</div>

			<div class="form-actions">
				<GlassButton type="submit" variant="accent" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Configuration"}
				</GlassButton>
			</div>
		</form>
	</GlassCard>

	<!-- Danger Zone -->
	<GlassCard class="danger-card">
		<h3>Reset Counter</h3>
		<p class="danger-hint">Set the counter back to zero. This can't be undone.</p>
		<form
			method="POST"
			action="?/reset"
			use:enhance={({ cancel }) => {
				if (!confirm("Reset the counter to zero? This can't be undone.")) {
					cancel();
					return;
				}
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<GlassButton type="submit" variant="ghost" class="reset-btn">
				<RotateCcw class="w-4 h-4" />
				Reset to Zero
			</GlassButton>
		</form>
	</GlassCard>
</div>

<style>
	.hitcounter-admin {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.header-top {
		margin-bottom: 1rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	:global(.header-icon) {
		width: 2rem;
		height: 2rem;
		color: var(--color-primary);
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: 1.6;
	}

	/* ─── Preview ─── */
	:global(.preview-card) {
		padding: 1.5rem !important;
		margin-bottom: 1.5rem;
	}

	.preview-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 1rem;
	}

	.counter-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		border-radius: 0.75rem;
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
	}

	.preview-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
		font-family: "Courier New", Consolas, monospace;
	}

	.since-date {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.since-date--integrated {
		font-style: normal;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		opacity: 0.55;
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 0.35rem;
		margin-top: 0.15rem;
	}

	/* ─── Classic Preview ─── */
	.classic-counter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.classic-digits {
		display: flex;
		gap: 2px;
	}

	.classic-digit {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2.75rem;
		background: rgb(var(--grove-950, 5 46 22) / 0.92);
		color: rgb(var(--grove-400, 74 222 128));
		font-family: "Courier New", Courier, monospace;
		font-size: 1.5rem;
		font-weight: 700;
		border-radius: 3px;
		border: 1px solid rgb(var(--grove-800, 22 101 52) / 0.6);
		backdrop-filter: blur(4px);
		text-shadow: 0 0 6px rgb(var(--grove-400, 74 222 128) / 0.4);
	}

	.classic-plabel {
		color: rgb(var(--grove-400, 74 222 128) / 0.7);
	}

	:global(.dark) .classic-digit {
		background: rgb(var(--cream-100, 37 35 32) / 0.08);
		border-color: rgb(var(--grove-700, 21 128 61) / 0.4);
	}

	/* ─── Odometer Preview ─── */
	.odometer-counter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.odometer-digits {
		display: flex;
		gap: 1px;
	}

	.odometer-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2.75rem;
		position: relative;
		background: linear-gradient(
			180deg,
			rgb(var(--cream-50, 253 251 247)) 0%,
			rgb(var(--cream-100, 250 247 240)) 45%,
			rgb(var(--cream-200, 243 237 224)) 55%,
			rgb(var(--cream-50, 253 251 247)) 100%
		);
		color: rgb(var(--bark-800, 68 51 34));
		font-family: "Courier New", Courier, monospace;
		font-size: 1.5rem;
		font-weight: 700;
		border-radius: 2px;
		border: 1px solid rgb(var(--bark-400, 161 137 104));
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5);
	}

	.odometer-cell::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: rgb(var(--bark-400, 161 137 104) / 0.3);
		pointer-events: none;
	}

	.odometer-plabel {
		color: rgb(var(--bark-600, 113 89 62));
	}

	:global(.dark) .odometer-cell {
		background: linear-gradient(
			180deg,
			rgb(var(--cream-100, 37 35 32) / 0.18) 0%,
			rgb(var(--cream-100, 37 35 32) / 0.12) 45%,
			rgb(var(--cream-100, 37 35 32) / 0.22) 55%,
			rgb(var(--cream-100, 37 35 32) / 0.15) 100%
		);
		color: rgb(var(--cream-50, 253 251 247));
		border-color: rgb(var(--bark-400, 161 137 104) / 0.4);
	}

	:global(.dark) .odometer-cell::after {
		background: rgb(var(--bark-400, 161 137 104) / 0.2);
	}

	:global(.dark) .odometer-plabel {
		color: rgb(var(--cream-200, 243 237 224) / 0.7);
	}

	/* ─── LCD Preview ─── */
	.lcd-counter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.lcd-screen {
		display: flex;
		gap: 3px;
		padding: 0.75rem 1rem;
		background: linear-gradient(180deg, #1a2e1a 0%, #0d1f0d 100%);
		border-radius: 4px;
		border: 1px solid rgb(var(--grove-800, 22 101 52) / 0.5);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.lcd-cell {
		position: relative;
		width: 1.5rem;
		height: 2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: "Courier New", Courier, monospace;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.lcd-ghost {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgb(var(--grove-400, 74 222 128) / 0.1);
		font-size: inherit;
		font-weight: inherit;
	}

	.lcd-active {
		position: relative;
		color: rgb(var(--grove-400, 74 222 128));
		text-shadow: 0 0 8px rgb(var(--grove-400, 74 222 128) / 0.5);
	}

	.lcd-plabel {
		color: rgb(var(--grove-400, 74 222 128) / 0.6);
		font-size: 0.7rem;
	}

	:global(.dark) .lcd-screen {
		background: linear-gradient(180deg, #0d1a0d 0%, #050f05 100%);
		border-color: rgb(var(--grove-800, 22 101 52) / 0.3);
	}

	:global(.dark) .lcd-active {
		text-shadow: 0 0 10px rgb(var(--grove-400, 74 222 128) / 0.7);
	}

	/* ─── Minimal Preview ─── */
	.minimal-counter {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 1.1rem;
	}

	.minimal-label {
		color: var(--color-text-muted);
	}

	.minimal-sep {
		color: rgb(var(--grove-600, 22 163 74));
		opacity: 0.5;
	}

	.minimal-number {
		font-weight: 700;
		color: rgb(var(--grove-600, 22 163 74));
		font-size: 1.5rem;
	}

	:global(.dark) .minimal-number {
		color: rgb(var(--grove-400, 74 222 128));
	}

	:global(.dark) .minimal-label {
		color: rgb(var(--cream-200, 243 237 224) / 0.7);
	}

	/* ─── Settings ─── */
	:global(.settings-card) {
		padding: 1.5rem !important;
		margin-bottom: 1.5rem;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.form-section:last-of-type {
		border-bottom: none;
		margin-bottom: 1rem;
	}

	.form-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 1rem;
	}

	.count-display {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.big-count {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}

	.count-hint {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.style-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.style-option {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.style-option:hover {
		border-color: var(--color-primary);
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
	}

	.style-option.selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.style-option input[type="radio"] {
		display: none;
	}

	.style-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.style-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.input-group {
		margin-bottom: 1rem;
	}

	.input-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.text-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text);
		background: hsl(var(--background));
		transition: border-color 0.2s ease;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	/* ─── Radio Groups ─── */
	.radio-group {
		border: none;
		padding: 0;
		margin: 0 0 1.25rem;
	}

	.radio-group--nested {
		margin-top: 0.75rem;
		padding-left: 0.5rem;
		border-left: 2px solid var(--color-border, #e5e7eb);
	}

	.radio-legend {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.radio-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
		margin-bottom: 0.25rem;
	}

	.radio-row:hover {
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
	}

	.radio-row.radio-selected {
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
	}

	.radio-row input[type="radio"] {
		margin-top: 0.25rem;
		accent-color: var(--color-primary);
	}

	.radio-content {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.9rem;
	}

	.radio-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* ─── Toggles ─── */
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
		margin-bottom: 0.75rem;
	}

	.toggle-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.toggle-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.toggle-input {
		width: 2.5rem;
		height: 1.25rem;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 1rem;
	}

	/* ─── Danger Zone ─── */
	:global(.danger-card) {
		padding: 1.5rem !important;
		border-color: hsl(var(--destructive) / 0.2) !important;
	}

	:global(.dark .danger-card) {
		border-color: hsl(var(--destructive) / 0.15) !important;
	}

	:global(.danger-card h3) {
		font-size: 1rem;
		font-weight: 600;
		color: hsl(var(--destructive));
		margin: 0 0 0.5rem;
	}

	.danger-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0 0 1rem;
	}

	:global(.reset-btn) {
		color: hsl(var(--destructive)) !important;
	}

	:global(.reset-btn:hover) {
		background: hsl(var(--destructive) / 0.1) !important;
	}

	:global(.dark .reset-btn:hover) {
		background: rgb(127 29 29 / 0.3) !important;
	}

	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}

		.style-grid {
			grid-template-columns: 1fr;
		}

		.toggle-row {
			flex-wrap: wrap;
		}

		.count-display {
			flex-wrap: wrap;
		}
	}
</style>
