<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { Circle, Save, Plus } from "lucide-svelte";
	import { lightenHex, darkenHex, DISPLAY_STYLE_OPTIONS } from "$lib/curios/moodring";
	import type { MoodDisplayStyle } from "$lib/curios/moodring";

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let selectedMode = $state(data.config?.mode || "time");
	// svelte-ignore state_referenced_locally
	let manualColor = $state(data.config?.manualColor || "#7cb85c");
	// svelte-ignore state_referenced_locally
	let displayStyle = $state<MoodDisplayStyle>(
		(data.config?.displayStyle || "ring") as MoodDisplayStyle,
	);
	// svelte-ignore state_referenced_locally
	let colorScheme = $state(data.config?.colorScheme || "default");
	// svelte-ignore state_referenced_locally
	let showMoodLog = $state(data.config?.showMoodLog ?? false);

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
	const previewColorLight = $derived(lightenHex(previewColor, 0.15));
	const previewColorDark = $derived(darkenHex(previewColor, 0.15));

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
			A mystical mood artifact that changes color based on time, season, or how you feel.
		</p>
	</header>

	<!-- Preview -->
	<GlassCard class="preview-card">
		<div
			class="ring-preview"
			style="--mood-color: {previewColor}; --mood-color-light: {previewColorLight}; --mood-color-dark: {previewColorDark};"
		>
			<div class="preview-shape mood-shape mood-shape--{displayStyle}">
				<div class="mood-aurora"></div>
			</div>
			<span class="preview-label">Preview — {displayStyle}</span>
		</div>
	</GlassCard>

	<!-- Config Form -->
	<GlassCard class="config-card">
		<h2>Settings</h2>
		<form
			method="POST"
			action="?/saveConfig"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
				};
			}}
		>
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

			<!-- Shape Picker Grid -->
			<div class="form-field shape-field">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Display Shape</label>
				<div class="shape-picker-grid">
					{#each DISPLAY_STYLE_OPTIONS as opt}
						<button
							type="button"
							class="shape-picker-item"
							class:shape-picker-item--selected={displayStyle === opt.value}
							onclick={() => (displayStyle = opt.value)}
							title={opt.description}
						>
							<div
								class="shape-picker-preview"
								style="--mood-color: {previewColor}; --mood-color-light: {previewColorLight}; --mood-color-dark: {previewColorDark};"
							>
								<div class="picker-shape mood-shape-mini mood-shape-mini--{opt.value}"></div>
							</div>
							<span class="shape-picker-label">{opt.label}</span>
						</button>
					{/each}
				</div>
				<input type="hidden" name="displayStyle" value={displayStyle} />
			</div>

			<!-- Show Mood Log Toggle -->
			<div class="form-field toggle-field">
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showMoodLog"
						bind:checked={showMoodLog}
						class="toggle-input"
					/>
					<span class="toggle-text">Show mood log constellation on public page</span>
				</label>
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

		{#if (data.logEntries?.length ?? 0) > 0}
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
	/* ==========================================================================
	   Aurora Animation (shared with public component)
	   ========================================================================== */

	@property --aurora-angle {
		syntax: "<angle>";
		initial-value: 0deg;
		inherits: false;
	}

	@keyframes aurora-rotate {
		to {
			--aurora-angle: 360deg;
		}
	}

	/* ==========================================================================
	   Page Layout
	   ========================================================================== */

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

	/* ==========================================================================
	   Preview Card
	   ========================================================================== */

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

	/* Main preview shape — uses same CSS system as public component */
	.preview-shape {
		width: 80px;
		height: 80px;
	}

	.mood-shape {
		position: relative;
		transition:
			box-shadow 0.6s,
			background 0.6s,
			border-color 0.6s;
	}

	.mood-aurora {
		position: absolute;
		inset: -4px;
		border-radius: inherit;
		background: conic-gradient(
			from var(--aurora-angle, 0deg),
			var(--mood-color-light),
			var(--mood-color),
			var(--mood-color-dark),
			var(--mood-color),
			var(--mood-color-light)
		);
		opacity: 0.4;
		z-index: -1;
		animation: aurora-rotate 8s linear infinite;
		filter: blur(8px);
	}

	.mood-shape--ring {
		border-radius: 50%;
		border: 3px solid var(--mood-color);
		background: color-mix(in srgb, var(--mood-color) 8%, transparent);
		box-shadow:
			0 0 16px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 32px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}
	.mood-shape--ring .mood-aurora {
		border-radius: 50%;
	}

	.mood-shape--gem {
		width: 60px;
		height: 60px;
		transform: rotate(45deg);
		border-radius: 4px;
		background: linear-gradient(
			135deg,
			var(--mood-color-light),
			var(--mood-color) 50%,
			var(--mood-color-dark)
		);
		box-shadow:
			0 0 18px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 36px color-mix(in srgb, var(--mood-color) 20%, transparent);
		margin: 10px;
	}
	.mood-shape--gem .mood-aurora {
		border-radius: 4px;
	}

	.mood-shape--orb {
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 35%,
			rgba(255, 255, 255, 0.35),
			var(--mood-color) 60%
		);
		box-shadow:
			0 0 24px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 48px color-mix(in srgb, var(--mood-color) 25%, transparent);
	}
	.mood-shape--orb .mood-aurora {
		border-radius: 50%;
	}

	.mood-shape--crystal {
		clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
		background: linear-gradient(
			160deg,
			var(--mood-color-light) 0%,
			color-mix(in srgb, var(--mood-color-light) 60%, white) 20%,
			var(--mood-color) 50%,
			var(--mood-color-dark) 80%,
			color-mix(in srgb, var(--mood-color-dark) 60%, black) 100%
		);
		box-shadow: 0 0 22px color-mix(in srgb, var(--mood-color) 40%, transparent);
	}
	.mood-shape--crystal .mood-aurora {
		clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
		inset: -5px;
	}

	.mood-shape--flame {
		border-radius: 50% 50% 50% 0%;
		transform: rotate(-45deg);
		background: radial-gradient(
			circle at 50% 60%,
			var(--mood-color-light),
			var(--mood-color) 50%,
			var(--mood-color-dark)
		);
		box-shadow:
			0 0 20px color-mix(in srgb, var(--mood-color) 50%, transparent),
			0 0 40px color-mix(in srgb, var(--mood-color) 25%, transparent);
	}
	.mood-shape--flame .mood-aurora {
		border-radius: 50% 50% 50% 0%;
	}

	.mood-shape--leaf {
		border-radius: 50% 0% 50% 0%;
		transform: rotate(-15deg);
		background: linear-gradient(
			135deg,
			var(--mood-color-light),
			var(--mood-color) 50%,
			var(--mood-color-dark)
		);
		box-shadow:
			0 0 18px color-mix(in srgb, var(--mood-color) 45%, transparent),
			0 0 36px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}
	.mood-shape--leaf .mood-aurora {
		border-radius: 50% 0% 50% 0%;
	}

	.mood-shape--moon {
		border-radius: 50%;
		background: var(--mood-color);
		box-shadow:
			inset -14px 5px 0 0 var(--mood-color-dark),
			0 0 20px color-mix(in srgb, var(--mood-color) 45%, transparent),
			0 0 40px color-mix(in srgb, var(--mood-color) 20%, transparent);
	}
	.mood-shape--moon .mood-aurora {
		border-radius: 50%;
	}

	.preview-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* ==========================================================================
	   Shape Picker Grid
	   ========================================================================== */

	.shape-field {
		grid-column: 1 / -1;
		margin-top: 0.5rem;
	}

	.shape-picker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 0.5rem;
	}

	.shape-picker-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 0.375rem;
		border: 2px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		background: var(--grove-overlay-4);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background 0.2s;
	}

	.shape-picker-item:hover {
		border-color: var(--grove-overlay-20, rgba(0, 0, 0, 0.2));
		background: var(--grove-overlay-8);
	}

	.shape-picker-item--selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
	}

	.shape-picker-preview {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Mini shapes for the picker grid (no aurora, just solid shapes) */
	.mood-shape-mini {
		transition:
			background 0.4s,
			box-shadow 0.4s;
	}

	.mood-shape-mini--ring {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--mood-color);
		background: color-mix(in srgb, var(--mood-color) 8%, transparent);
		box-shadow: 0 0 8px color-mix(in srgb, var(--mood-color) 40%, transparent);
	}

	.mood-shape-mini--gem {
		width: 20px;
		height: 20px;
		transform: rotate(45deg);
		border-radius: 2px;
		background: linear-gradient(135deg, var(--mood-color-light), var(--mood-color-dark));
		box-shadow: 0 0 6px color-mix(in srgb, var(--mood-color) 40%, transparent);
	}

	.mood-shape-mini--orb {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.3), var(--mood-color) 60%);
		box-shadow: 0 0 10px color-mix(in srgb, var(--mood-color) 40%, transparent);
	}

	.mood-shape-mini--crystal {
		width: 28px;
		height: 28px;
		clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
		background: linear-gradient(
			160deg,
			var(--mood-color-light),
			var(--mood-color) 50%,
			var(--mood-color-dark)
		);
	}

	.mood-shape-mini--flame {
		width: 24px;
		height: 24px;
		border-radius: 50% 50% 50% 0%;
		transform: rotate(-45deg);
		background: radial-gradient(circle at 50% 60%, var(--mood-color-light), var(--mood-color-dark));
	}

	.mood-shape-mini--leaf {
		width: 26px;
		height: 26px;
		border-radius: 50% 0% 50% 0%;
		transform: rotate(-15deg);
		background: linear-gradient(135deg, var(--mood-color-light), var(--mood-color-dark));
	}

	.mood-shape-mini--moon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--mood-color);
		box-shadow: inset -8px 3px 0 0 var(--mood-color-dark);
	}

	.shape-picker-label {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.shape-picker-item--selected .shape-picker-label {
		color: var(--color-primary);
	}

	/* ==========================================================================
	   Toggle (show mood log)
	   ========================================================================== */

	.toggle-field {
		grid-column: 1 / -1;
		margin-top: 0.25rem;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.toggle-input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-primary);
	}

	.toggle-text {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	/* ==========================================================================
	   Form
	   ========================================================================== */

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

	@media (prefers-reduced-motion: reduce) {
		.mood-aurora {
			animation: none;
		}

		.mood-shape,
		.mood-shape-mini {
			transition: none;
		}
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
		.shape-picker-grid {
			grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		}
	}
</style>
