<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { Volume2 } from "lucide-svelte";

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let soundSet = $state(data.config?.soundSet || "forest-rain");
	// svelte-ignore state_referenced_locally
	let volume = $state(data.config?.volume ?? 30);
	// svelte-ignore state_referenced_locally
	let enabled = $state(data.config?.enabled ?? false);
	// svelte-ignore state_referenced_locally
	let customUrl = $state(data.config?.customUrl || "");

	$effect(() => {
		if (form?.configSaved) {
			toast.success("Ambient settings saved");
		} else if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>Ambient Sounds - Curios</title>
</svelte:head>

<div class="ambient-page">
	<header class="page-header">
		<div class="title-row">
			<Volume2 class="header-icon" />
			<h1>Ambient Sounds</h1>
		</div>
		<p class="subtitle">
			Optional background audio for an immersive grove experience. Always requires a click — never
			autoplay.
		</p>
	</header>

	<GlassCard class="config-card">
		<h2>Sound Configuration</h2>
		<form method="POST" action="?/save" use:enhance>
			<div class="form-grid">
				<div class="form-field">
					<label for="soundSet">Sound Set</label>
					<select id="soundSet" name="soundSet" class="glass-input" bind:value={soundSet}>
						{#each data.soundSetOptions as option}
							<option value={option.value}>{option.label} — {option.description}</option>
						{/each}
					</select>
				</div>

				<div class="form-field">
					<label for="volume">Volume: {volume}%</label>
					<input
						type="range"
						id="volume"
						name="volume"
						min="0"
						max="100"
						bind:value={volume}
						class="volume-slider"
					/>
				</div>

				<div class="form-field">
					<label class="checkbox-label">
						<input type="checkbox" name="enabled" bind:checked={enabled} />
						Enable ambient sounds
					</label>
				</div>

				<div class="form-field full-width">
					<label for="customUrl"
						>Custom Audio URL <span class="optional">(optional, Oak+)</span></label
					>
					<input
						type="url"
						id="customUrl"
						name="customUrl"
						placeholder="https://example.com/ambient.mp3"
						bind:value={customUrl}
						class="glass-input"
					/>
				</div>
			</div>

			<div class="form-actions">
				<GlassButton type="submit" variant="accent">Save Settings</GlassButton>
			</div>
		</form>
	</GlassCard>
</div>

<style>
	.ambient-page {
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
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.25rem 0;
		color: var(--color-text);
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.full-width {
		grid-column: 1 / -1;
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
	.optional {
		font-weight: 400;
		opacity: 0.7;
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
	select.glass-input {
		cursor: pointer;
	}
	.volume-slider {
		width: 100%;
		cursor: pointer;
		accent-color: var(--color-primary);
	}
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text);
	}
	.form-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}
	@media (max-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
		.title-row {
			flex-wrap: wrap;
		}
	}
</style>
