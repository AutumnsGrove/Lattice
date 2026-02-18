<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { Circle, Save, Plus } from "lucide-svelte";

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let selectedMode = $state(data.config?.mode || "time");
	// svelte-ignore state_referenced_locally
	let manualColor = $state(data.config?.manualColor || "#7cb85c");
	// svelte-ignore state_referenced_locally
	let displayStyle = $state(data.config?.displayStyle || "ring");
	// svelte-ignore state_referenced_locally
	let colorScheme = $state(data.config?.colorScheme || "default");

	const schemeColors: Record<string, string> = {
		default: "#7cb85c",
		warm: "#d4853b",
		cool: "#7ba3c9",
		forest: "#3d7a4a",
		sunset: "#e8705a",
	};

	const previewColor = $derived(
		selectedMode === "manual" ? manualColor : schemeColors[colorScheme] || "#7cb85c",
	);

	$effect(() => {
		if (form?.configSaved) {
			toast.success("Mood ring settings saved");
		} else if (form?.moodLogged) {
			toast.success("Mood logged");
		} else if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>Mood Ring - Curios</title>
</svelte:head>

<div class="moodring-page">
	<header class="page-header">
		<div class="title-row">
			<Circle class="header-icon" />
			<h1>Mood Ring</h1>
		</div>
		<p class="subtitle">
			A visual mood indicator that changes color based on time, season, or how you feel.
		</p>
	</header>

	<!-- Preview -->
	<GlassCard class="preview-card">
		<div class="ring-preview">
			{#if displayStyle === "gem"}
				<div class="mood-gem" style="--ring-color: {previewColor}"></div>
			{:else if displayStyle === "orb"}
				<div class="mood-orb" style="--ring-color: {previewColor}"></div>
			{:else}
				<div class="mood-ring" style="--ring-color: {previewColor}"></div>
			{/if}
			<span class="preview-label">Preview — {displayStyle}</span>
		</div>
	</GlassCard>

	<!-- Config Form -->
	<GlassCard class="config-card">
		<h2>Settings</h2>
		<form method="POST" action="?/saveConfig" use:enhance>
			<div class="form-grid">
				<div class="form-field">
					<label for="mode">Mode</label>
					<select id="mode" name="mode" class="glass-input" bind:value={selectedMode}>
						{#each data.modeOptions as opt}
							<option value={opt.value}>{opt.label} — {opt.description}</option>
						{/each}
					</select>
				</div>

				<div class="form-field">
					<label for="displayStyle">Display Style</label>
					<select
						id="displayStyle"
						name="displayStyle"
						class="glass-input"
						bind:value={displayStyle}
					>
						{#each data.displayStyleOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-field">
					<label for="colorScheme">Color Scheme</label>
					<select id="colorScheme" name="colorScheme" class="glass-input" bind:value={colorScheme}>
						{#each data.colorSchemeOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>

				{#if selectedMode === "manual"}
					<div class="form-field">
						<label for="manualMood">Mood Name</label>
						<input
							type="text"
							id="manualMood"
							name="manualMood"
							placeholder="Peaceful"
							value={data.config?.manualMood || ""}
							maxlength="50"
							class="glass-input"
						/>
					</div>

					<div class="form-field">
						<label for="manualColor">Color</label>
						<input
							type="color"
							id="manualColor"
							name="manualColor"
							bind:value={manualColor}
							class="color-input"
						/>
					</div>
				{/if}
			</div>

			<div class="form-actions">
				<GlassButton type="submit" variant="accent">
					<Save class="btn-icon" />
					Save Settings
				</GlassButton>
			</div>
		</form>
	</GlassCard>

	<!-- Mood Log -->
	<GlassCard class="log-card">
		<h2>Mood Log</h2>
		<form method="POST" action="?/logMood" use:enhance class="log-form">
			<div class="log-inputs">
				<input
					type="text"
					name="mood"
					placeholder="How are you feeling?"
					maxlength="50"
					required
					class="glass-input"
				/>
				<input type="color" name="color" value="#7cb85c" class="color-input" />
				<input
					type="text"
					name="note"
					placeholder="Note (optional)"
					maxlength="200"
					class="glass-input note-input"
				/>
				<GlassButton type="submit" variant="accent">
					<Plus class="btn-icon" />
					Log
				</GlassButton>
			</div>
		</form>

		{#if data.logEntries.length > 0}
			<div class="mood-timeline">
				{#each data.logEntries as entry}
					<div
						class="timeline-dot"
						style="background-color: {entry.color}"
						title="{entry.mood}{entry.note ? ` — ${entry.note}` : ''}"
					></div>
				{/each}
			</div>
		{:else}
			<p class="empty-log">No mood entries yet. Log your first mood above.</p>
		{/if}
	</GlassCard>
</div>

<style>
	.moodring-page {
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
	:global(.preview-card) {
		padding: 2rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}
	.ring-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.mood-ring {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: var(--ring-color, #7cb85c);
		box-shadow: 0 0 20px var(--ring-color, #7cb85c);
		transition:
			background 0.6s,
			box-shadow 0.6s;
	}
	.mood-gem {
		width: 60px;
		height: 60px;
		background: var(--ring-color, #7cb85c);
		transform: rotate(45deg);
		border-radius: 4px;
		box-shadow: 0 0 16px var(--ring-color, #7cb85c);
		transition:
			background 0.6s,
			box-shadow 0.6s;
	}
	.mood-orb {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 35%,
			rgba(255, 255, 255, 0.4),
			var(--ring-color, #7cb85c) 60%
		);
		box-shadow:
			0 0 30px var(--ring-color, #7cb85c),
			0 0 60px color-mix(in srgb, var(--ring-color, #7cb85c) 40%, transparent);
		transition:
			background 0.6s,
			box-shadow 0.6s;
	}
	.preview-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	:global(.config-card) {
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}
	:global(.log-card) {
		padding: 1.5rem;
	}
	h2 {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
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
	.color-input {
		width: 3rem;
		height: 2.25rem;
		padding: 0.125rem;
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
	}
	.form-actions {
		margin-top: 1.25rem;
	}
	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
	}
	.log-form {
		margin-bottom: 1rem;
	}
	.log-inputs {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.note-input {
		flex: 1;
		min-width: 150px;
	}
	.mood-timeline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.5rem 0;
	}
	.timeline-dot {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		cursor: help;
		transition: transform 0.2s;
	}
	.timeline-dot:hover {
		transform: scale(1.3);
	}
	.empty-log {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
		.form-grid {
			grid-template-columns: 1fr;
		}
		.log-inputs {
			flex-direction: column;
		}
		.log-inputs input {
			width: 100%;
		}
		.log-inputs .color-input {
			width: auto;
		}
		.note-input {
			min-width: auto;
		}
	}
</style>
