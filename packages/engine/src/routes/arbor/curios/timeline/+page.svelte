<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, Badge, Waystone } from "$lib/ui/components/ui";
  import { toast } from "$lib/ui/components/ui/toast";
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
    EyeOff,
    History,
    Loader2,
    Sparkles,
    XCircle,
    ArrowRight,
  } from "lucide-svelte";

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state - initialized and synced with data via $effect
  let enabled = $state(false);
  let githubUsername = $state("");
  let githubToken = $state("");
  let openrouterKey = $state("");
  let openrouterModel = $state("deepseek/deepseek-v3.2");
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
      openrouterModel = data.config.openrouterModel ?? "deepseek/deepseek-v3.2";
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

  // Backfill state
  let backfillStartDate = $state("");
  let backfillEndDate = $state("");
  let backfillRepoLimit = $state(10);
  let isBackfilling = $state(false);
  let backfillResult = $state<{ success: boolean; message: string; stats?: any } | null>(null);

  // Generate summaries state
  let generateStartDate = $state("");
  let generateEndDate = $state("");
  let isGenerating = $state(false);
  let generateCancelled = $state(false);
  let generateProgress = $state<{
    current: number;
    total: number;
    currentDate: string;
    completed: string[];
    skipped: string[];
    failed: string[];
    totalCost: number;
  } | null>(null);
  let generateResult = $state<{ success: boolean; message: string } | null>(null);

  async function startBackfill() {
    if (!backfillStartDate) {
      toast.error("Start date required", { description: "Pick how far back to go." });
      return;
    }

    isBackfilling = true;
    backfillResult = null;

    try {
      const response = await fetch("/api/curios/timeline/backfill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": data.csrfToken ?? "",
        },
        body: JSON.stringify({
          startDate: backfillStartDate,
          endDate: backfillEndDate || undefined,
          repoLimit: backfillRepoLimit,
        }),
      });

      const result = await response.json() as Record<string, unknown>;

      if (response.ok) {
        backfillResult = {
          success: true,
          message: (result.message as string) || "Backfill complete",
          stats: result.stats,
        };
        toast.success("Backfill complete!", {
          description: backfillResult.message,
        });
      } else {
        const errorMsg = (result.message as string) || `Backfill failed (${response.status})`;
        backfillResult = { success: false, message: errorMsg };
        toast.error("Backfill failed", { description: errorMsg });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      backfillResult = { success: false, message: errorMsg };
      toast.error("Backfill error", { description: errorMsg });
    } finally {
      isBackfilling = false;
    }
  }

  /**
   * Generate AI summaries for a date range.
   * Calls the generate endpoint for each day sequentially so that
   * long-horizon context can build up across consecutive days.
   */
  async function generateSummaries() {
    if (!generateStartDate) {
      toast.error("Start date required", { description: "Pick the first date to generate." });
      return;
    }

    isGenerating = true;
    generateCancelled = false;
    generateResult = null;

    const start = new Date(generateStartDate + "T00:00:00");
    const end = generateEndDate
      ? new Date(generateEndDate + "T00:00:00")
      : new Date(new Date().toISOString().split("T")[0] + "T00:00:00");

    // Build array of dates
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    generateProgress = {
      current: 0,
      total: dates.length,
      currentDate: "",
      completed: [],
      skipped: [],
      failed: [],
      totalCost: 0,
    };

    for (const date of dates) {
      if (generateCancelled) break;

      generateProgress = {
        ...generateProgress!,
        current: generateProgress!.current + 1,
        currentDate: date,
      };

      try {
        const response = await fetch("/api/curios/timeline/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": data.csrfToken ?? "",
          },
          body: JSON.stringify({ date }),
        });

        const result = await response.json() as Record<string, unknown>;

        if (response.ok) {
          if (result.summary) {
            generateProgress = {
              ...generateProgress!,
              completed: [...generateProgress!.completed, date],
              totalCost: generateProgress!.totalCost + ((result.usage as Record<string, unknown>)?.cost as number ?? 0),
            };
          } else {
            // No commits for this day
            generateProgress = {
              ...generateProgress!,
              skipped: [...generateProgress!.skipped, date],
            };
          }
        } else {
          generateProgress = {
            ...generateProgress!,
            failed: [...generateProgress!.failed, date],
          };
        }
      } catch {
        generateProgress = {
          ...generateProgress!,
          failed: [...generateProgress!.failed, date],
        };
      }
    }

    const completedCount = generateProgress!.completed.length;
    const skippedCount = generateProgress!.skipped.length;
    const failedCount = generateProgress!.failed.length;

    generateResult = {
      success: failedCount === 0,
      message: generateCancelled
        ? `Cancelled. Generated ${completedCount} summaries before stopping.`
        : `Done! ${completedCount} generated, ${skippedCount} skipped (no commits), ${failedCount} failed.`,
    };

    if (completedCount > 0) {
      toast.success("Summaries generated!", {
        description: `${completedCount} day${completedCount === 1 ? "" : "s"} of timeline entries created. Cost: $${generateProgress!.totalCost.toFixed(4)}`,
      });
    }

    isGenerating = false;
  }

  function cancelGeneration() {
    generateCancelled = true;
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
        AI-powered daily summaries of your GitHub activity.
        Configure your voice, connect your accounts, and let Timeline tell your coding story.
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
          toast.success("Configuration saved!", { description: "Your Timeline settings have been updated." });
          successMessage = "Configuration saved successfully!";
          // Clear token fields after successful save (they're now stored encrypted)
          githubToken = "";
          openrouterKey = "";
        } else if (result.type === "failure" && result.data) {
          const errorMsg = (result.data as { error?: string }).error || "Failed to save configuration";
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
            Create a token <ArrowRight size={12} class="inline-block" />
          </a>
          <Waystone slug="how-grove-protects-your-secrets" label="How we protect your tokens" inline />
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
            Get a key <ArrowRight size={12} class="inline-block" />
          </a>
          <Waystone slug="how-grove-protects-your-secrets" label="How we protect your keys" inline />
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

  <!-- Historical Backfill -->
  <GlassCard class="config-section backfill-section">
    <div class="section-header">
      <History class="section-icon" />
      <h2>Historical Backfill</h2>
    </div>

    <p class="backfill-description">
      Pull historical commit data from GitHub to populate your Timeline.
      This uses the Commits API (no 90-day limit) to fetch your full history.
    </p>

    <div class="backfill-fields">
      <div class="field-group">
        <label for="backfillStart" class="field-label">
          Start Date
          <span class="required">*</span>
        </label>
        <input
          type="date"
          id="backfillStart"
          bind:value={backfillStartDate}
          class="field-input"
          max={new Date().toISOString().split("T")[0]}
        />
        <p class="field-help">How far back to fetch commits (e.g., your project start date).</p>
      </div>

      <div class="field-group">
        <label for="backfillEnd" class="field-label">End Date</label>
        <input
          type="date"
          id="backfillEnd"
          bind:value={backfillEndDate}
          class="field-input"
          max={new Date().toISOString().split("T")[0]}
        />
        <p class="field-help">Defaults to today if left empty.</p>
      </div>

      <div class="field-group">
        <label for="backfillRepoLimit" class="field-label">Repo Limit</label>
        <input
          type="number"
          id="backfillRepoLimit"
          bind:value={backfillRepoLimit}
          class="field-input"
          min="1"
          max="50"
        />
        <p class="field-help">
          Max repos to process (rate-limited to 1/second). Higher = more data but slower.
        </p>
      </div>
    </div>

    {#if backfillResult}
      <div class="alert {backfillResult.success ? 'alert-success' : 'alert-error'}">
        {#if backfillResult.success}
          <CheckCircle2 class="alert-icon" />
        {:else}
          <AlertCircle class="alert-icon" />
        {/if}
        <div class="backfill-result-content">
          <span>{backfillResult.message}</span>
          {#if backfillResult.stats}
            <div class="backfill-stats">
              <span>{backfillResult.stats.totalCommits} commits</span>
              <span>·</span>
              <span>{backfillResult.stats.processedRepos} repos</span>
              <span>·</span>
              <span>{backfillResult.stats.datesWithActivity} days with activity</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="form-actions">
      <GlassButton
        type="button"
        variant="accent"
        disabled={isBackfilling || !backfillStartDate}
        onclick={startBackfill}
      >
        {#if isBackfilling}
          <Loader2 class="button-icon spinning" />
          Backfilling...
        {:else}
          <History class="button-icon" />
          Start Backfill
        {/if}
      </GlassButton>
    </div>
  </GlassCard>

  <!-- Generate Summaries -->
  <GlassCard class="config-section generate-section">
    <div class="section-header">
      <Sparkles class="section-icon" />
      <h2>Generate Summaries</h2>
    </div>

    <p class="generate-description">
      Generate AI-powered timeline entries for dates with commit activity.
      Each day uses your OpenRouter key to create a brief summary, detailed timeline, and gutter comments.
      Days are processed sequentially so context builds across consecutive entries.
    </p>

    <div class="generate-fields">
      <div class="field-group">
        <label for="generateStart" class="field-label">
          Start Date
          <span class="required">*</span>
        </label>
        <input
          type="date"
          id="generateStart"
          bind:value={generateStartDate}
          class="field-input"
          max={new Date().toISOString().split("T")[0]}
          disabled={isGenerating}
        />
        <p class="field-help">First date to generate a summary for.</p>
      </div>

      <div class="field-group">
        <label for="generateEnd" class="field-label">End Date</label>
        <input
          type="date"
          id="generateEnd"
          bind:value={generateEndDate}
          class="field-input"
          max={new Date().toISOString().split("T")[0]}
          disabled={isGenerating}
        />
        <p class="field-help">Defaults to today if left empty.</p>
      </div>
    </div>

    {#if generateProgress}
      <div class="generate-progress">
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill"
            style="width: {(generateProgress.current / generateProgress.total) * 100}%"
          ></div>
        </div>
        <div class="progress-details">
          {#if isGenerating}
            <span class="progress-current">
              Generating {generateProgress.currentDate}...
              ({generateProgress.current}/{generateProgress.total})
            </span>
          {:else}
            <span class="progress-current">
              Complete ({generateProgress.current}/{generateProgress.total})
            </span>
          {/if}
          <div class="progress-stats">
            {#if generateProgress.completed.length > 0}
              <span class="stat-generated">{generateProgress.completed.length} generated</span>
            {/if}
            {#if generateProgress.skipped.length > 0}
              <span class="stat-skipped">{generateProgress.skipped.length} skipped</span>
            {/if}
            {#if generateProgress.failed.length > 0}
              <span class="stat-failed">{generateProgress.failed.length} failed</span>
            {/if}
            {#if generateProgress.totalCost > 0}
              <span class="stat-cost">${generateProgress.totalCost.toFixed(4)}</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if generateResult && !isGenerating}
      <div class="alert {generateResult.success ? 'alert-success' : 'alert-error'}">
        {#if generateResult.success}
          <CheckCircle2 class="alert-icon" />
        {:else}
          <AlertCircle class="alert-icon" />
        {/if}
        <span>{generateResult.message}</span>
      </div>
    {/if}

    <div class="form-actions">
      {#if isGenerating}
        <GlassButton
          type="button"
          variant="ghost"
          onclick={cancelGeneration}
        >
          <XCircle class="button-icon" />
          Cancel
        </GlassButton>
      {:else}
        <GlassButton
          type="button"
          variant="accent"
          disabled={!generateStartDate}
          onclick={generateSummaries}
        >
          <Sparkles class="button-icon" />
          Generate Summaries
        </GlassButton>
      {/if}
    </div>
  </GlassCard>
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

  /* Backfill Section */
  :global(.backfill-section) {
    margin-top: 2rem;
    border-top: 2px solid var(--grove-overlay-12);
    padding-top: 1.5rem;
  }

  .backfill-description {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .backfill-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }

  .backfill-result-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .backfill-stats {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  :global(.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Generate Section */
  :global(.generate-section) {
    margin-top: 1.5rem;
  }

  .generate-description {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .generate-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .generate-progress {
    margin: 1.5rem 0;
  }

  .progress-bar-container {
    width: 100%;
    height: 6px;
    background: var(--grove-overlay-8);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .progress-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .progress-current {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .progress-stats {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
  }

  .stat-generated {
    color: var(--color-success, #22c55e);
  }

  .stat-skipped {
    color: var(--color-text-muted);
  }

  .stat-failed {
    color: var(--color-error, #ef4444);
  }

  .stat-cost {
    color: var(--color-primary);
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .voice-grid {
      grid-template-columns: 1fr;
    }

    .title-row {
      flex-wrap: wrap;
    }

    .backfill-fields {
      grid-template-columns: 1fr;
    }

    .generate-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
