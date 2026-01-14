<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, Badge } from "$lib/ui/components/ui";
  import {
    Calendar,
    Github,
    Key,
    Bot,
    Mic2,
    Settings2,
    ChevronLeft,
    Save,
    TestTube,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff
  } from "lucide-svelte";

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let enabled = $state(data.config?.enabled ?? false);
  let githubUsername = $state(data.config?.githubUsername ?? "");
  let githubToken = $state("");
  let openrouterKey = $state("");
  let openrouterModel = $state(data.config?.openrouterModel ?? "anthropic/claude-3.5-haiku");
  let voicePreset = $state(data.config?.voicePreset ?? "professional");
  let customSystemPrompt = $state(data.config?.customSystemPrompt ?? "");
  let customSummaryInstructions = $state(data.config?.customSummaryInstructions ?? "");
  let customGutterStyle = $state(data.config?.customGutterStyle ?? "");
  let reposInclude = $state(data.config?.reposInclude?.join(", ") ?? "");
  let reposExclude = $state(data.config?.reposExclude?.join(", ") ?? "");
  let timezone = $state(data.config?.timezone ?? "America/New_York");
  let ownerName = $state(data.config?.ownerName ?? "");

  // UI state
  let showGithubToken = $state(false);
  let showOpenrouterKey = $state(false);
  let isSubmitting = $state(false);

  // Common timezones
  const timezones = [
    { value: "America/New_York", label: "Eastern Time (US)" },
    { value: "America/Chicago", label: "Central Time (US)" },
    { value: "America/Denver", label: "Mountain Time (US)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US)" },
    { value: "America/Phoenix", label: "Arizona (US)" },
    { value: "Europe/London", label: "London (UK)" },
    { value: "Europe/Paris", label: "Paris (France)" },
    { value: "Europe/Berlin", label: "Berlin (Germany)" },
    { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
    { value: "Asia/Shanghai", label: "Shanghai (China)" },
    { value: "Australia/Sydney", label: "Sydney (Australia)" },
    { value: "Pacific/Auckland", label: "Auckland (New Zealand)" },
  ];

  // Check if using custom voice
  const isCustomVoice = $derived(voicePreset === "custom");
</script>

<svelte:head>
  <title>Timeline Curio - Admin</title>
</svelte:head>

<div class="timeline-config">
  <header class="page-header">
    <a href="/admin/curios" class="back-link">
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
        AI-powered daily summaries of your GitHub activity.
        Configure your voice, connect your accounts, and let Timeline tell your coding story.
      </p>
    </div>
  </header>

  {#if form?.error}
    <div class="alert alert-error">
      <AlertCircle class="alert-icon" />
      <span>{form.error}</span>
    </div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success">
      <CheckCircle2 class="alert-icon" />
      <span>Configuration saved successfully!</span>
    </div>
  {/if}

  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
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
        <p class="field-help">
          When enabled, daily summaries will be generated automatically.
        </p>
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
        <select
          id="timezone"
          name="timezone"
          bind:value={timezone}
          class="field-select"
        >
          {#each timezones as tz}
            <option value={tz.value}>{tz.label}</option>
          {/each}
        </select>
        <p class="field-help">
          Summaries are generated based on your local midnight.
        </p>
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
            onclick={() => showGithubToken = !showGithubToken}
          >
            {#if showGithubToken}
              <EyeOff class="visibility-icon" />
            {:else}
              <Eye class="visibility-icon" />
            {/if}
          </button>
        </div>
        <p class="field-help">
          Needs <code>repo</code> scope to read your commit history.
          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">
            Create a token →
          </a>
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
        <p class="field-help">
          Comma-separated list. Leave empty to include all repos.
        </p>
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
        <p class="field-help">
          Comma-separated list of repos to skip.
        </p>
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
            onclick={() => showOpenrouterKey = !showOpenrouterKey}
          >
            {#if showOpenrouterKey}
              <EyeOff class="visibility-icon" />
            {:else}
              <Eye class="visibility-icon" />
            {/if}
          </button>
        </div>
        <p class="field-help">
          Your own OpenRouter key (BYOK).
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">
            Get a key →
          </a>
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
              {model.name} — ${model.inputCostPer1M}/M in, ${model.outputCostPer1M}/M out
            </option>
          {/each}
        </select>
        <p class="field-help">
          Choose a model based on quality vs. cost. Claude 3.5 Haiku is recommended.
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
            <label for="customSystemPrompt" class="field-label">
              Custom System Prompt
            </label>
            <textarea
              id="customSystemPrompt"
              name="customSystemPrompt"
              bind:value={customSystemPrompt}
              placeholder="You are a technical writer who..."
              class="field-textarea"
              rows="4"
            ></textarea>
            <p class="field-help">
              Define the AI's persona and writing style.
            </p>
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
            <label for="customGutterStyle" class="field-label">
              Gutter Comment Style
            </label>
            <textarea
              id="customGutterStyle"
              name="customGutterStyle"
              bind:value={customGutterStyle}
              placeholder="Write margin comments that..."
              class="field-textarea"
              rows="2"
            ></textarea>
            <p class="field-help">
              How should the AI write margin annotations?
            </p>
          </div>
        </div>
      {/if}
    </GlassCard>

    <!-- Actions -->
    <div class="form-actions">
      <GlassButton type="submit" variant="accent" disabled={isSubmitting}>
        <Save class="button-icon" />
        {isSubmitting ? "Saving..." : "Save Configuration"}
      </GlassButton>
    </div>
  </form>
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
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--color-error, #ef4444);
  }

  .alert-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: var(--color-success, #22c55e);
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
    color: var(--color-error, #ef4444);
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
    transition: border-color 0.15s, box-shadow 0.15s;
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
    transition: border-color 0.15s, background 0.15s;
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
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  :global(.button-icon) {
    width: 1.125rem;
    height: 1.125rem;
    margin-right: 0.5rem;
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
