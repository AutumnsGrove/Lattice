<script lang="ts">
	import type { PageData, ActionData } from "./$types";
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, Badge, Waystone } from "$lib/ui/components/ui";
	import { toast } from "$lib/ui/components/ui/toast";
	import { api } from "$lib/utils/api";
	import {
		Activity,
		Settings2,
		ChevronLeft,
		Save,
		AlertCircle,
		CheckCircle2,
		Copy,
		RefreshCw,
		Eye,
		EyeOff,
		Loader2,
		Globe,
		Filter,
		BarChart3,
	} from "lucide-svelte";

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	// svelte-ignore state_referenced_locally
	let enabled = $state(data.config?.enabled ?? false);
	// svelte-ignore state_referenced_locally
	let showHeatmap = $state(data.config?.showHeatmap ?? true);
	// svelte-ignore state_referenced_locally
	let showFeed = $state(data.config?.showFeed ?? true);
	// svelte-ignore state_referenced_locally
	let showStats = $state(data.config?.showStats ?? true);
	// svelte-ignore state_referenced_locally
	let showTrends = $state(data.config?.showTrends ?? true);
	// svelte-ignore state_referenced_locally
	let showCi = $state(data.config?.showCi ?? true);
	// svelte-ignore state_referenced_locally
	let timezone = $state(data.config?.timezone ?? "America/New_York");
	// svelte-ignore state_referenced_locally
	let feedMaxItems = $state(data.config?.feedMaxItems ?? 100);
	// svelte-ignore state_referenced_locally
	let reposInclude = $state(data.config?.reposInclude?.join(", ") ?? "");
	// svelte-ignore state_referenced_locally
	let reposExclude = $state(data.config?.reposExclude?.join(", ") ?? "");

	// Sync on data change
	$effect(() => {
		if (data.config) {
			enabled = data.config.enabled ?? false;
			showHeatmap = data.config.showHeatmap ?? true;
			showFeed = data.config.showFeed ?? true;
			showStats = data.config.showStats ?? true;
			showTrends = data.config.showTrends ?? true;
			showCi = data.config.showCi ?? true;
			timezone = data.config.timezone ?? "America/New_York";
			feedMaxItems = data.config.feedMaxItems ?? 100;
			reposInclude = data.config.reposInclude?.join(", ") ?? "";
			reposExclude = data.config.reposExclude?.join(", ") ?? "";
		}
	});

	// UI state
	let isSubmitting = $state(false);
	let successMessage = $state("");
	let errorMessage = $state("");
	let saveConfirmed = $state(false);
	let showSecret = $state(false);
	let isRegenerating = $state(false);
	let generatedSecret = $state<string | null>(null);
	let secretCopied = $state(false);
	let urlCopied = $state(false);

	const timezones = [
		{ value: "America/New_York", label: "Eastern Time (US)" },
		{ value: "America/Chicago", label: "Central Time (US)" },
		{ value: "America/Denver", label: "Mountain Time (US)" },
		{ value: "America/Los_Angeles", label: "Pacific Time (US)" },
		{ value: "Europe/London", label: "London (UK)" },
		{ value: "Europe/Paris", label: "Paris (France)" },
		{ value: "Europe/Berlin", label: "Berlin (Germany)" },
		{ value: "Asia/Tokyo", label: "Tokyo (Japan)" },
		{ value: "Australia/Sydney", label: "Sydney (Australia)" },
	];

	function copyToClipboard(text: string, type: "url" | "secret") {
		navigator.clipboard.writeText(text);
		if (type === "url") {
			urlCopied = true;
			setTimeout(() => (urlCopied = false), 2000);
		} else {
			secretCopied = true;
			setTimeout(() => (secretCopied = false), 2000);
		}
		toast.success("Copied to clipboard!");
	}

	async function regenerateSecret() {
		isRegenerating = true;
		generatedSecret = null;

		try {
			const result = await api.post<{
				success: boolean;
				webhookSecret?: string;
				error?: string;
			}>("/api/curios/pulse/config", {});

			if (result?.success && result.webhookSecret) {
				generatedSecret = result.webhookSecret;
				toast.success("Webhook secret regenerated!", {
					description: "Copy it now — it won't be shown again.",
				});
			} else {
				toast.error("Failed to regenerate secret", { description: result?.error });
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Network error";
			toast.error("Failed to regenerate", { description: msg });
		} finally {
			isRegenerating = false;
		}
	}

	// Webhook health indicator
	const webhookHealth = $derived.by(() => {
		if (!data.lastEvent) return { color: "gray", label: "No events yet" };
		const now = Math.floor(Date.now() / 1000);
		const diff = now - data.lastEvent.occurred_at;
		if (diff < 3600) return { color: "green", label: "Healthy" };
		if (diff < 86400) return { color: "yellow", label: "Quiet" };
		return { color: "red", label: "No recent activity" };
	});
</script>

<svelte:head>
	<title>Pulse Curio - Admin</title>
</svelte:head>

<div class="pulse-config">
	<header class="page-header">
		<a href="/arbor/curios" class="back-link">
			<ChevronLeft class="back-icon" />
			<span>Back to Curios</span>
		</a>

		<div class="header-content">
			<div class="title-row">
				<Activity class="header-icon" />
				<h1>Pulse</h1>
				<Badge variant={enabled ? "default" : "secondary"}>
					{enabled ? "Enabled" : "Disabled"}
				</Badge>
			</div>
			<p class="subtitle">
				Live development heartbeat from GitHub webhooks. Real-time activity — commits flowing, PRs
				merging, issues moving.
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
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === "success") {
					toast.success("Configuration saved!", {
						description: "Your Pulse settings have been updated.",
					});
					successMessage = "Configuration saved successfully!";
					saveConfirmed = true;
					setTimeout(() => {
						saveConfirmed = false;
					}, 4000);
				} else if (result.type === "failure" && result.data) {
					const msg = (result.data as { error?: string }).error || "Failed to save";
					toast.error("Failed to save", { description: msg });
					errorMessage = msg;
				}
				await update({ reset: false });
			};
		}}
	>
		<!-- Enable/Disable -->
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
					<span class="toggle-text">Enable Pulse</span>
				</label>
				<p class="field-help">When enabled, your /pulse page shows live development activity.</p>
			</div>

			<div class="field-group">
				<label for="timezone" class="field-label">Timezone</label>
				<select id="timezone" name="timezone" bind:value={timezone} class="field-select">
					{#each timezones as tz}
						<option value={tz.value}>{tz.label}</option>
					{/each}
				</select>
			</div>
		</GlassCard>

		<!-- Webhook Setup -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Globe class="section-icon" />
				<h2>Webhook Setup</h2>
			</div>

			<div class="field-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="field-label">Webhook URL</label>
				<div class="copy-field">
					<code class="copy-value">{data.webhookUrl}</code>
					<button
						type="button"
						class="copy-btn"
						onclick={() => copyToClipboard(data.webhookUrl, "url")}
					>
						{#if urlCopied}
							<CheckCircle2 size={14} />
						{:else}
							<Copy size={14} />
						{/if}
					</button>
				</div>
				<p class="field-help">Paste this URL into your GitHub repo's webhook settings.</p>
			</div>

			{#if generatedSecret}
				<div class="field-group">
					<label class="field-label">
						Webhook Secret
						<Badge variant="secondary">New — copy now!</Badge>
					</label>
					<div class="copy-field secret-field">
						<code class="copy-value">{showSecret ? generatedSecret : "••••••••••••••••"}</code>
						<button type="button" class="copy-btn" onclick={() => (showSecret = !showSecret)}>
							{#if showSecret}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
						</button>
						<button
							type="button"
							class="copy-btn"
							onclick={() => copyToClipboard(generatedSecret!, "secret")}
						>
							{#if secretCopied}<CheckCircle2 size={14} />{:else}<Copy size={14} />{/if}
						</button>
					</div>
					<p class="field-help warning">
						This secret won't be shown again. Copy it now and paste into GitHub.
					</p>
				</div>
			{:else if data.hasWebhookSecret}
				<div class="field-group">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="field-label">Webhook Secret</label>
					<p class="secret-status">
						<CheckCircle2 size={14} class="text-green" /> Secret configured
					</p>
					<button
						type="button"
						class="regen-btn"
						disabled={isRegenerating}
						onclick={regenerateSecret}
					>
						{#if isRegenerating}
							<Loader2 size={14} class="spinning" /> Regenerating...
						{:else}
							<RefreshCw size={14} /> Regenerate Secret
						{/if}
					</button>
					<p class="field-help">
						Regenerating will invalidate the current secret. You'll need to update GitHub.
					</p>
				</div>
			{:else}
				<p class="field-help">Enable Pulse and save to generate a webhook secret.</p>
			{/if}

			<div class="setup-steps">
				<h3>Setup Instructions</h3>
				<ol>
					<li>
						Go to your GitHub repo &gt; <strong>Settings</strong> &gt; <strong>Webhooks</strong>
						&gt; <strong>Add webhook</strong>
					</li>
					<li>Paste the <strong>Webhook URL</strong> above</li>
					<li>Set content type to <code>application/json</code></li>
					<li>Paste the <strong>Webhook Secret</strong></li>
					<li>
						Select events: Pushes, Pull requests, Issues, Releases, Workflow runs, Stars, Forks
					</li>
					<li>Click <strong>Add webhook</strong></li>
				</ol>
			</div>
		</GlassCard>

		<!-- Webhook Health -->
		<GlassCard class="config-section">
			<div class="section-header">
				<BarChart3 class="section-icon" />
				<h2>Status</h2>
			</div>

			<div class="status-grid">
				<div class="status-item">
					<span class="status-label">Webhook Health</span>
					<span class="status-value">
						<span class="health-dot health-{webhookHealth.color}"></span>
						{webhookHealth.label}
					</span>
				</div>
				<div class="status-item">
					<span class="status-label">Events Today</span>
					<span class="status-value">{data.eventCountToday}</span>
				</div>
				{#if data.lastEvent}
					<div class="status-item">
						<span class="status-label">Last Event</span>
						<span class="status-value"
							>{data.lastEvent.event_type} — {new Date(
								data.lastEvent.occurred_at * 1000,
							).toLocaleString()}</span
						>
					</div>
				{/if}
			</div>
		</GlassCard>

		<!-- Repository Filtering -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Filter class="section-icon" />
				<h2>Repository Filtering</h2>
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
				<p class="field-help">Comma-separated. Leave empty to track all repos.</p>
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
				<p class="field-help">Comma-separated. These repos will be ignored.</p>
			</div>
		</GlassCard>

		<!-- Display Options -->
		<GlassCard class="config-section">
			<div class="section-header">
				<Activity class="section-icon" />
				<h2>Display Options</h2>
			</div>

			<div class="toggle-grid">
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showHeatmap"
						value="true"
						bind:checked={showHeatmap}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">Activity Heatmap</span>
				</label>
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showFeed"
						value="true"
						bind:checked={showFeed}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">Event Feed</span>
				</label>
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showStats"
						value="true"
						bind:checked={showStats}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">Stats Cards</span>
				</label>
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showTrends"
						value="true"
						bind:checked={showTrends}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">Trend Charts</span>
				</label>
				<label class="toggle-label">
					<input
						type="checkbox"
						name="showCi"
						value="true"
						bind:checked={showCi}
						class="toggle-input"
					/>
					<span class="toggle-switch"></span>
					<span class="toggle-text">CI Health</span>
				</label>
			</div>

			<input type="hidden" name="feedMaxItems" value={feedMaxItems} />
		</GlassCard>

		<!-- Save -->
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
		</div>
	</form>
</div>

<style>
	.pulse-config {
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

	.field-input,
	.field-select {
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
	.field-select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
	}

	.field-help {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.5rem;
		line-height: 1.5;
	}
	.field-help.warning {
		color: #f59e0b;
	}
	:global(.field-help code) {
		background: var(--grove-overlay-8);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
	}

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
	.toggle-input:focus-visible + .toggle-switch {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.toggle-text {
		font-weight: 500;
		color: var(--color-text);
	}

	.toggle-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.copy-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--grove-overlay-4);
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		padding: 0.5rem 0.75rem;
	}
	.copy-value {
		flex: 1;
		font-size: 0.8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}
	.copy-btn {
		flex-shrink: 0;
		padding: 0.25rem;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 0.15s;
	}
	.copy-btn:hover {
		color: var(--color-primary);
	}

	.secret-status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}
	:global(.text-green) {
		color: #22c55e;
	}

	.regen-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
		color: var(--color-error, #ef4444);
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition: background 0.15s;
	}
	.regen-btn:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.15);
	}
	.regen-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.setup-steps {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--grove-overlay-8);
	}
	.setup-steps h3 {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		color: var(--color-text);
	}
	.setup-steps ol {
		margin: 0;
		padding-left: 1.25rem;
	}
	.setup-steps li {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		padding: 0.25rem 0;
		line-height: 1.5;
	}

	.status-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.status-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}
	.status-label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.status-value {
		font-size: 0.85rem;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.health-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		display: inline-block;
	}
	.health-green {
		background: #22c55e;
	}
	.health-yellow {
		background: #f59e0b;
	}
	.health-red {
		background: #ef4444;
	}
	.health-gray {
		background: #6b7280;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}
	:global(.button-icon) {
		width: 1.125rem;
		height: 1.125rem;
		margin-right: 0.5rem;
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

	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
	}
</style>
