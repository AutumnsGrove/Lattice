<script lang="ts">
	import type { PageData, ActionData } from "./$types";
	import { enhance } from "$app/forms";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import {
		metricIcons,
		chromeIcons,
		authIcons,
		toolIcons,
		actionIcons,
		navIcons,
		stateIcons,
		phaseIcons,
		featureIcons,
	} from "@autumnsgrove/prism/icons";
	const Calendar = metricIcons.calendar;
	// chromeIcons.github resolves to undefined: @lucide/svelte dropped brand/
	// logo icons (Github, Chrome, Codepen, ...) and Prism's manifest still
	// maps them, so the lookup silently returns nothing instead of a
	// component. GitBranch is the closest source-control icon that still
	// exists in the installed lucide package.
	const Github = featureIcons.gitBranch;
	const Key = authIcons.keyLegacy;
	const Bot = toolIcons.shade;
	const Mic2 = chromeIcons.mic;
	const Settings2 = actionIcons.settings;
	const ChevronLeft = navIcons.chevronLeft;
	const Save = actionIcons.save;
	const AlertCircle = stateIcons.alertCircle;
	const CheckCircle2 = stateIcons.checkCircle2;
	const Eye = stateIcons.eye;
	const EyeOff = stateIcons.eyeOff;
	const Loader2 = stateIcons.loader;
	const ArrowRight = navIcons.arrowRight;

	import { saveTokenIndividually as saveTokenApi } from "./timeline-api";
	import TimelineBackfillSection from "./TimelineBackfillSection.svelte";
	import TimezonePicker from "./TimezonePicker.svelte";
	import TimelineGenerateSection from "./TimelineGenerateSection.svelte";

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state - initialized and synced with data via $effect
	let enabled = $state(false);
	let githubUsername = $state("");
	let githubToken = $state("");
	let openrouterKey = $state("");
	let openrouterModel = $state("");
	let voicePreset = $state("professional");
	let customSystemPrompt = $state("");
	let customSummaryInstructions = $state("");
	let customGutterStyle = $state("");
	let reposInclude = $state("");
	let reposExclude = $state("");
	let timezone = $state("America/New_York");
	let ownerName = $state("");

	// Sync form state when data changes (e.g., after form submission)
	$effect(() => {
		if (data.config) {
			enabled = data.config.enabled ?? false;
			githubUsername = data.config.githubUsername ?? "";
			// The server always sends one: the tenant's saved model, or the timeline default
			// from the registry. A second literal here was a third place to change a model (#1602).
			openrouterModel = data.config.openrouterModel ?? "";
			voicePreset = data.config.voicePreset ?? "professional";
			customSystemPrompt = data.config.customSystemPrompt ?? "";
			customSummaryInstructions = data.config.customSummaryInstructions ?? "";
			customGutterStyle = data.config.customGutterStyle ?? "";
			reposInclude = data.config.reposInclude?.join(", ") ?? "";
			reposExclude = data.config.reposExclude?.join(", ") ?? "";
			timezone = data.config.timezone ?? "America/New_York";
			ownerName = data.config.ownerName ?? "";
		}
	});

	// UI state
	let showGithubToken = $state(false);
	let showOpenrouterKey = $state(false);
	let isSubmitting = $state(false);

	// Explicit feedback state (more reliable than relying on form prop in Svelte 5)
	let successMessage = $state("");
	let errorMessage = $state("");
	let saveConfirmed = $state(false);

	// Per-token save state
	let githubTokenSaving = $state(false);
	let githubTokenResult = $state<{ ok: boolean; message: string } | null>(null);
	let openrouterKeySaving = $state(false);
	let openrouterKeyResult = $state<{ ok: boolean; message: string } | null>(null);

	// Check if using custom voice
	const isCustomVoice = $derived(voicePreset === "custom");

	async function saveTokenIndividually(type: "github" | "openrouter") {
		const value = type === "github" ? githubToken : openrouterKey;
		if (type === "github") {
			githubTokenSaving = true;
			githubTokenResult = null;
		} else {
			openrouterKeySaving = true;
			openrouterKeyResult = null;
		}

		const result = await saveTokenApi(type, value);

		if (type === "github") {
			githubTokenResult = result;
			if (result.ok) githubToken = "";
			githubTokenSaving = false;
		} else {
			openrouterKeyResult = result;
			if (result.ok) openrouterKey = "";
			openrouterKeySaving = false;
		}
	}
</script>

<svelte:head>
	<title>Timeline Curio - Admin</title>
</svelte:head>

<div class="timeline-config">
	<header class="page-header">
		<a href="/arbor/curios" class="back-link">
			<ChevronLeft class="back-icon" />
			<span>Back to Curios</span>
		</a>

		<div class="header-content">
			<div class="title-row">
				<Calendar class="header-icon" />
				<h1>Timeline</h1>
				<Badge variant={enabled ? "default" : "secondary"}>
					{enabled ? "Enabled" : "Disabled"}
				</Badge>
			</div>
			<p class="subtitle">
				AI-powered daily summaries of your GitHub activity. Configure your voice, connect your
				accounts, and let Timeline tell your coding story.
			</p>
		</div>
	</header>

	{#if errorMessage || form?.error}
		<div class="alert alert-error">
			<AlertCircle class="alert-icon" />
			<span>{errorMessage || form?.error}</span>
		</div>
	{/if}

	{#if successMessage || form?.success}
		<div class="alert alert-success">
			<CheckCircle2 class="alert-icon" />
			<span>{successMessage || "Configuration saved successfully!"}</span>
		</div>
	{/if}

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			isSubmitting = true;
			successMessage = "";
			errorMessage = "";
			console.log("[Timeline Config] Form submitting...");
			return async ({ result, update }) => {
				console.log("[Timeline Config] Got result:", result.type);
				isSubmitting = false;
				if (result.type === "success") {
					toast.success("Configuration saved!", {
						description: "Your Timeline settings have been updated.",
					});
					successMessage = "Configuration saved successfully!";
					saveConfirmed = true;
					setTimeout(() => {
						saveConfirmed = false;
					}, 4000);
					// Clear token fields after successful save (they're now stored encrypted)
					githubToken = "";
					openrouterKey = "";
				} else if (result.type === "failure" && result.data) {
					const errorMsg =
						(result.data as { error?: string }).error || "Failed to save configuration";
					toast.error("Failed to save", { description: errorMsg });
					errorMessage = errorMsg;
				} else if (result.type === "error") {
					toast.error("Unexpected error", { description: "Please try again." });
					errorMessage = "An unexpected error occurred. Please try again.";
				}
				await update({ reset: false }); // Don't reset form, preserve our state
			};
		}}
	>
		<!-- Enable/Disable Toggle -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Settings2 class="section-icon" />
				<h2>General</h2>
			</div>

			<div class="toggle-row">
				<label class="toggle-label">
					<input
						type="checkbox"
						name="enabled"
						value="true"
						bind:checked={enabled}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">Enable Timeline</span>
				</label>
				<p class="field-help">When enabled, daily summaries will be generated automatically.</p>
			</div>

			<div class="field-group">
				<label for="ownerName" class="field-label">Display Name</label>
				<input
					type="text"
					id="ownerName"
					name="ownerName"
					bind:value={ownerName}
					placeholder="Your name (for summaries)"
					class="field-input"
				/>
				<p class="field-help">
					How you want to be referred to in summaries (e.g., "Autumn", "the developer")
				</p>
			</div>

			<div class="field-group">
				<label for="timezone" class="field-label">Timezone</label>
				<TimezonePicker bind:value={timezone} saved={data.config?.timezoneIsSaved ?? false} />
			</div>
		</GlassCard>

		<!-- GitHub Configuration -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Github class="section-icon" />
				<h2>GitHub</h2>
			</div>

			<div class="field-group">
				<label for="githubUsername" class="field-label">
					GitHub Username
					<span class="required">*</span>
				</label>
				<input
					type="text"
					id="githubUsername"
					name="githubUsername"
					bind:value={githubUsername}
					placeholder="your-username"
					class="field-input"
					required={enabled}
				/>
			</div>

			<div class="field-group">
				<label for="githubToken" class="field-label">
					Personal Access Token
					{#if data.config?.hasGithubToken}
						<Badge variant="secondary" class="token-badge">Saved</Badge>
					{/if}
				</label>
				<div class="password-field">
					<input
						type={showGithubToken ? "text" : "password"}
						id="githubToken"
						name="githubToken"
						bind:value={githubToken}
						placeholder={data.config?.hasGithubToken ? "••••••••••••••••" : "ghp_..."}
						class="field-input"
					/>
					<button
						type="button"
						class="toggle-visibility"
						onclick={() => (showGithubToken = !showGithubToken)}
					>
						{#if showGithubToken}
							<EyeOff class="visibility-icon" />
						{:else}
							<Eye class="visibility-icon" />
						{/if}
					</button>
				</div>
				<div class="token-actions">
					<button
						type="button"
						class="token-save-btn"
						disabled={githubTokenSaving || !githubToken?.trim()}
						onclick={() => saveTokenIndividually("github")}
					>
						{#if githubTokenSaving}
							<Loader2 size={14} class="spinning" />
							Verifying...
						{:else}
							<Key size={14} />
							Save Key
						{/if}
					</button>
					{#if githubTokenResult}
						<span class="token-result {githubTokenResult.ok ? 'token-ok' : 'token-fail'}">
							{#if githubTokenResult.ok}
								<CheckCircle2 size={14} />
							{:else}
								<AlertCircle size={14} />
							{/if}
							{githubTokenResult.message}
						</span>
					{/if}
				</div>
				<p class="field-help">
					Needs <code>repo</code> scope to read your commit history.
					<a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">
						Create a token <ArrowRight size={12} class="inline-block" />
					</a>
					<Waystone
						slug="how-grove-protects-your-secrets"
						label="How we protect your tokens"
						inline
					/>
				</p>
			</div>

			<div class="field-group">
				<label for="reposInclude" class="field-label">Include Repos (optional)</label>
				<input
					type="text"
					id="reposInclude"
					name="reposInclude"
					bind:value={reposInclude}
					placeholder="repo1, repo2, repo3"
					class="field-input"
				/>
				<p class="field-help">Comma-separated list. Leave empty to include all repos.</p>
			</div>

			<div class="field-group">
				<label for="reposExclude" class="field-label">Exclude Repos (optional)</label>
				<input
					type="text"
					id="reposExclude"
					name="reposExclude"
					bind:value={reposExclude}
					placeholder="private-notes, dotfiles"
					class="field-input"
				/>
				<p class="field-help">Comma-separated list of repos to skip.</p>
			</div>
		</GlassCard>

		<!-- AI Configuration -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Bot class="section-icon" />
				<h2>AI Provider</h2>
			</div>

			<div class="field-group">
				<label for="openrouterKey" class="field-label">
					OpenRouter API Key
					{#if data.config?.hasOpenrouterKey}
						<Badge variant="secondary" class="token-badge">Saved</Badge>
					{/if}
				</label>
				<div class="password-field">
					<input
						type={showOpenrouterKey ? "text" : "password"}
						id="openrouterKey"
						name="openrouterKey"
						bind:value={openrouterKey}
						placeholder={data.config?.hasOpenrouterKey ? "••••••••••••••••" : "sk-or-..."}
						class="field-input"
					/>
					<button
						type="button"
						class="toggle-visibility"
						onclick={() => (showOpenrouterKey = !showOpenrouterKey)}
					>
						{#if showOpenrouterKey}
							<EyeOff class="visibility-icon" />
						{:else}
							<Eye class="visibility-icon" />
						{/if}
					</button>
				</div>
				<div class="token-actions">
					<button
						type="button"
						class="token-save-btn"
						disabled={openrouterKeySaving || !openrouterKey?.trim()}
						onclick={() => saveTokenIndividually("openrouter")}
					>
						{#if openrouterKeySaving}
							<Loader2 size={14} class="spinning" />
							Verifying...
						{:else}
							<Key size={14} />
							Save Key
						{/if}
					</button>
					{#if openrouterKeyResult}
						<span class="token-result {openrouterKeyResult.ok ? 'token-ok' : 'token-fail'}">
							{#if openrouterKeyResult.ok}
								<CheckCircle2 size={14} />
							{:else}
								<AlertCircle size={14} />
							{/if}
							{openrouterKeyResult.message}
						</span>
					{/if}
				</div>
				<p class="field-help">
					Your own OpenRouter key (BYOK).
					<a href="https://openrouter.ai/keys" target="_blank" rel="noopener">
						Get a key <ArrowRight size={12} class="inline-block" />
					</a>
					<Waystone
						slug="how-grove-protects-your-secrets"
						label="How we protect your keys"
						inline
					/>
				</p>
			</div>

			<div class="field-group">
				<label for="openrouterModel" class="field-label">Model</label>
				<select
					id="openrouterModel"
					name="openrouterModel"
					bind:value={openrouterModel}
					class="field-select"
				>
					{#each data.models as model}
						<option value={model.id}>
							{model.name} — ${model.inputCostPer1M}/M in, ${model.outputCostPer1M}/M out{model.isDefault
								? " (Recommended)"
								: ""}
						</option>
					{/each}
				</select>
				<p class="field-help">
					Choose a model based on quality vs. cost — the recommended option is marked above.
				</p>
			</div>
		</GlassCard>

		<!-- Voice Configuration -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Mic2 class="section-icon" />
				<h2>Voice & Personality</h2>
			</div>

			<div class="voice-grid">
				{#each data.voices as voice}
					<label class="voice-option {voicePreset === voice.id ? 'selected' : ''}">
						<input
							type="radio"
							name="voicePreset"
							value={voice.id}
							bind:group={voicePreset}
							class="voice-radio"
						/>
						<div class="voice-content">
							<span class="voice-name">{voice.name}</span>
							<span class="voice-description">{voice.description}</span>
							<span class="voice-preview">"{voice.preview}"</span>
						</div>
					</label>
				{/each}
			</div>

			{#if isCustomVoice}
				<div class="custom-voice-fields">
					<div class="field-group">
						<label for="customSystemPrompt" class="field-label"> Custom System Prompt </label>
						<textarea
							id="customSystemPrompt"
							name="customSystemPrompt"
							bind:value={customSystemPrompt}
							placeholder="You are a technical writer who..."
							class="field-textarea"
							rows="4"
						></textarea>
						<p class="field-help">Define the AI's persona and writing style.</p>
					</div>

					<div class="field-group">
						<label for="customSummaryInstructions" class="field-label">
							Summary Instructions
						</label>
						<textarea
							id="customSummaryInstructions"
							name="customSummaryInstructions"
							bind:value={customSummaryInstructions}
							placeholder="Write summaries that emphasize..."
							class="field-textarea"
							rows="3"
						></textarea>
					</div>

					<div class="field-group">
						<label for="customGutterStyle" class="field-label"> Gutter Comment Style </label>
						<textarea
							id="customGutterStyle"
							name="customGutterStyle"
							bind:value={customGutterStyle}
							placeholder="Write margin comments that..."
							class="field-textarea"
							rows="2"
						></textarea>
						<p class="field-help">How should the AI write margin annotations?</p>
					</div>
				</div>
			{/if}
		</GlassCard>

		<!-- Actions -->
		<div class="form-actions">
			<GlassButton type="submit" variant="accent" disabled={isSubmitting}>
				{#if saveConfirmed}
					<CheckCircle2 class="button-icon" />
					Saved!
				{:else if isSubmitting}
					<Loader2 class="button-icon spinning" />
					Saving...
				{:else}
					<Save class="button-icon" />
					Save Configuration
				{/if}
			</GlassButton>
			{#if errorMessage}
				<p class="save-error-inline">
					<AlertCircle size={14} />
					{errorMessage}
				</p>
			{/if}
		</div>
	</form>

	<TimelineBackfillSection />
	<TimelineGenerateSection csrfToken={data.csrfToken ?? ""} />
</div>

<style>
	.timeline-config {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-decoration: none;
		margin-bottom: 1rem;
		transition: color 0.15s;
	}

	.back-link:hover {
		color: var(--color-text);
	}

	:global(.back-icon) {
		width: 1rem;
		height: 1rem;
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
		max-width: 600px;
	}

	/* Alerts */
	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--border-radius-standard);
		margin-bottom: 1.5rem;
	}

	.alert-error {
		background: hsl(var(--destructive) / 0.1);
		border: 1px solid hsl(var(--destructive) / 0.2);
		color: hsl(var(--destructive));
	}

	.alert-success {
		background: var(--grove-accent-10);
		border: 1px solid var(--grove-accent-30);
		color: var(--grove-accent);
	}

	:global(.alert-icon) {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	/* Sections */
	:global(.config-section) {
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--grove-overlay-8);
	}

	:global(.section-icon) {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-primary);
	}

	.section-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	/* Form Fields */
	.field-group {
		margin-bottom: 1.25rem;
	}

	.field-group:last-child {
		margin-bottom: 0;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.required {
		color: hsl(var(--destructive));
	}

	:global(.token-badge) {
		font-size: 0.7rem;
	}

	.field-input,
	.field-select,
	.field-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--grove-overlay-4);
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		color: var(--color-text);
		font-size: 0.9rem;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.field-input:focus,
	.field-select:focus,
	.field-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	.field-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.field-help {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.5rem;
		line-height: 1.5;
	}

	.field-help a {
		color: var(--color-primary);
		text-decoration: none;
	}

	.field-help a:hover {
		text-decoration: underline;
	}

	.field-help code {
		background: var(--grove-overlay-8);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
	}

	/* Token Actions */
	.token-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.token-save-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-primary);
		background: rgba(var(--color-primary-rgb), 0.08);
		border: 1px solid rgba(var(--color-primary-rgb), 0.2);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.token-save-btn:hover:not(:disabled) {
		background: rgba(var(--color-primary-rgb), 0.15);
		border-color: rgba(var(--color-primary-rgb), 0.35);
	}

	.token-save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.token-result {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.token-ok {
		color: var(--grove-accent);
	}

	.token-fail {
		color: hsl(var(--destructive));
	}

	/* Password Field */
	.password-field {
		position: relative;
		display: flex;
	}

	.password-field .field-input {
		padding-right: 3rem;
	}

	.toggle-visibility {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-text-muted);
		transition: color 0.15s;
	}

	.toggle-visibility:hover {
		color: var(--color-text);
	}

	:global(.visibility-icon) {
		width: 1.25rem;
		height: 1.25rem;
	}

	/* Toggle Switch */
	.toggle-row {
		margin-bottom: 1.5rem;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.toggle-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-switch {
		position: relative;
		width: 3rem;
		height: 1.5rem;
		background: var(--grove-overlay-12);
		border-radius: 1rem;
		transition: background 0.2s;
	}

	.toggle-switch::after {
		content: "";
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1.25rem;
		height: 1.25rem;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle-input:checked + .toggle-switch {
		background: var(--color-primary);
	}

	.toggle-input:checked + .toggle-switch::after {
		transform: translateX(1.5rem);
	}

	.toggle-text {
		font-weight: 500;
		color: var(--color-text);
	}

	/* Voice Grid */
	.voice-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.voice-option {
		position: relative;
		padding: 1rem;
		background: var(--grove-overlay-4);
		border: 2px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.voice-option:hover {
		background: var(--grove-overlay-8);
	}

	.voice-option.selected {
		border-color: var(--color-primary);
		background: rgba(var(--color-primary-rgb), 0.05);
	}

	.voice-radio {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.voice-content {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.voice-name {
		font-weight: 600;
		color: var(--color-text);
		font-size: 0.95rem;
	}

	.voice-description {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.voice-preview {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-style: italic;
		margin-top: 0.25rem;
	}

	.custom-voice-fields {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--grove-overlay-8);
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	.save-error-inline {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: hsl(var(--destructive, 0 84% 60%));
		font-size: 0.875rem;
		margin: 0;
	}

	:global(.button-icon) {
		width: 1.125rem;
		height: 1.125rem;
		margin-right: 0.5rem;
	}

	/* Backfill Section */
	:global(.backfill-section) {
		margin-top: 2rem;
		border-top: 2px solid var(--grove-overlay-12);
		padding-top: 1.5rem;
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.spinning) {
			animation: none;
		}
	}

	/* Generate Section */
	:global(.generate-section) {
		margin-top: 1.5rem;
	}

	@media (max-width: 640px) {
		.voice-grid {
			grid-template-columns: 1fr;
		}

		.title-row {
			flex-wrap: wrap;
		}
	}
</style>
