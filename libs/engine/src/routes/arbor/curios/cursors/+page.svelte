<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { MousePointer, Save } from "lucide-svelte";

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let selectedPreset = $state(data.config?.preset || "leaf");
	// svelte-ignore state_referenced_locally
	let trailEnabled = $state(data.config?.trailEnabled || false);

	$effect(() => {
		if (form?.configSaved) {
			toast.success("Cursor settings saved");
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	const presetsByCategory = $derived(() => {
		const grouped: Record<string, typeof data.cursorPresets> = {};
		for (const p of data.cursorPresets) {
			if (!grouped[p.category]) grouped[p.category] = [];
			grouped[p.category].push(p);
		}
		return grouped;
	});
</script>

<svelte:head>
	<title>Custom Cursors - Curios</title>
</svelte:head>

<div class="cursors-page">
	<header class="page-header">
		<div class="title-row">
			<MousePointer class="header-icon" />
			<h1>Custom Cursors</h1>
		</div>
		<p class="subtitle">
			Replace the default pointer with something that matches your vibe. Choose a preset cursor and
			optionally add a trail effect.
		</p>
	</header>

	<GlassCard class="config-card">
		<form method="POST" action="?/save" use:enhance>
			<input type="hidden" name="cursorType" value="preset" />

			<h2>Cursor Preset</h2>
			<div class="preset-grid">
				{#each Object.entries(presetsByCategory()) as [category, presets]}
					<div class="category-group">
						<h3 class="category-label">{category}</h3>
						<div class="preset-pills">
							{#each presets as preset}
								<label class="preset-pill" class:selected={selectedPreset === preset.value}>
									<input
										type="radio"
										name="preset"
										value={preset.value}
										bind:group={selectedPreset}
										class="sr-only"
									/>
									<span>{preset.label}</span>
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="divider"></div>

			<h2>Trail Effect</h2>
			<div class="trail-toggle">
				<label class="toggle-label">
					<input type="checkbox" name="trailEnabled" bind:checked={trailEnabled} />
					<span>Enable cursor trail</span>
				</label>
			</div>

			{#if trailEnabled}
				<div class="trail-options">
					<div class="form-field">
						<label for="trailEffect">Effect Style</label>
						<select
							id="trailEffect"
							name="trailEffect"
							class="glass-input"
							value={data.config?.trailEffect || "sparkle"}
						>
							{#each data.trailEffectOptions as opt}
								<option value={opt.value}>{opt.label} — {opt.description}</option>
							{/each}
						</select>
					</div>

					<div class="form-field">
						<label for="trailLength">Trail Length</label>
						<input
							type="range"
							id="trailLength"
							name="trailLength"
							min="3"
							max="20"
							value={data.config?.trailLength || 8}
							class="range-input"
						/>
					</div>
				</div>
			{/if}

			<div class="form-actions">
				<GlassButton type="submit" variant="accent">
					<Save class="btn-icon" />
					Save Settings
				</GlassButton>
			</div>
		</form>
	</GlassCard>
</div>

<style>
	.cursors-page {
		max-width: 800px;
		margin: 0 auto;
	}
	.page-header {
		margin-bottom: 2rem;
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
		font-size: 0.95rem;
		line-height: 1.6;
		max-width: 600px;
	}
	:global(.config-card) {
		padding: 1.5rem;
	}
	h2 {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}
	.category-group {
		margin-bottom: 1rem;
	}
	.category-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin: 0 0 0.5rem 0;
		font-weight: 600;
	}
	.preset-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.preset-pill {
		padding: 0.5rem 1rem;
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--color-text);
		background: var(--grove-overlay-4);
		transition: all 0.2s;
	}
	.preset-pill:hover {
		border-color: var(--color-primary);
	}
	.preset-pill.selected {
		border-color: var(--color-primary);
		background: var(--grove-overlay-8);
		font-weight: 600;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
	.divider {
		height: 1px;
		background: var(--grove-overlay-12);
		margin: 1.5rem 0;
	}
	.trail-toggle {
		margin-bottom: 1rem;
	}
	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text);
	}
	.trail-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.form-field label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-muted);
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
	.range-input {
		width: 100%;
		accent-color: var(--color-primary);
	}
	.form-actions {
		margin-top: 1.5rem;
	}
	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
	}
	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
	}
</style>
