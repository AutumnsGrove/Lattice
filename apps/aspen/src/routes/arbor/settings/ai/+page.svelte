<script lang="ts">
	import { authIcons, phaseIcons } from "@autumnsgrove/prism/icons";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";

	let { data, form } = $props();

	const Sparkles = phaseIcons.sparkles;
	const Key = authIcons.key;

	const savedHere = $derived(data.keySource === "settings");
	const savedInTimeline = $derived(data.keySource === "timeline");
</script>

<svelte:head>
	<title>AI - Settings</title>
</svelte:head>

<ArborSection
	title="AI"
	description="One key, used by every AI feature in your grove."
	icon={Sparkles}
	backHref="/arbor/settings"
	backLabel="Back to Settings"
>
	<GlassCard class="ai-card">
		<div class="section-header">
			<Key class="section-icon" />
			<h2>OpenRouter</h2>
			{#if savedHere}
				<span class="badge">Saved</span>
			{:else if savedInTimeline}
				<span class="badge badge-legacy">Using your timeline key</span>
			{:else}
				<span class="badge badge-empty">Not set</span>
			{/if}
		</div>

		<p class="explainer">
			Grove's AI features run on your own OpenRouter key, so the spending is yours and the
			requests are billed to you — not to the grove. Get a key from
			<a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
				openrouter.ai/keys
			</a>.
		</p>

		{#if savedInTimeline}
			<p class="note">
				Your timeline saved this key before this page existed, so it is the one in use. Saving
				one here takes over for every feature; the timeline's own key stops being read.
			</p>
		{/if}

		{#if !data.kekConfigured}
			<p class="note note-warn">
				This deployment cannot hold secrets right now (no encryption key configured), so a key
				cannot be saved. That is a server problem, not yours.
			</p>
		{/if}

		<form method="POST" action="?/save" class="key-form">
			<label for="openrouterKey" class="field-label">
				{savedHere ? "Replace your key" : "Your key"}
			</label>
			<input
				type="password"
				id="openrouterKey"
				name="openrouterKey"
				placeholder={data.keySource ? "sk-or-... (a new key)" : "sk-or-..."}
				autocomplete="off"
				spellcheck="false"
				class="field-input"
			/>
			<p class="field-hint">
				Pasted once and never shown again. Grove stores it encrypted and cannot read it back to
				you.
			</p>
			<button type="submit" class="btn btn-primary">Save key</button>
		</form>

		{#if data.keySource}
			<form method="POST" action="?/remove" class="remove-form">
				<button type="submit" class="btn btn-quiet">Remove key</button>
				<span class="field-hint">
					AI features stop working until you add one. Your key itself is unaffected — it is
					still at openrouter.ai.
				</span>
			</form>
		{/if}

		{#if form?.error}
			<p class="result result-error" role="alert">{form.error}</p>
		{:else if form?.success}
			<p class="result result-ok" role="status">{form.success}</p>
		{/if}
	</GlassCard>
</ArborSection>

<style>
	/* Classes handed to a component are not visible to Svelte's CSS pruning, so
	   they are global the way `.card-icon` is on the settings hub. */
	:global(.ai-card) {
		padding: 1.5rem;
		max-width: 44rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: 1.05rem;
		font-weight: 600;
		margin: 0;
	}

	:global(.section-icon) {
		width: 1.1rem;
		height: 1.1rem;
		color: var(--color-text-muted);
	}

	.badge {
		margin-left: auto;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}

	.badge-legacy {
		color: var(--color-text);
	}

	.badge-empty {
		border-style: dashed;
	}

	.explainer,
	.note {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		margin: 0 0 1rem;
	}

	.explainer a {
		color: var(--color-text);
		text-decoration: underline;
	}

	.note {
		border-left: 2px solid var(--color-border);
		padding-left: 0.75rem;
	}

	.note-warn {
		color: var(--color-text);
	}

	.key-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.field-input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		background: var(--color-surface);
		color: inherit;
		font-family: inherit;
		font-size: 0.95rem;
	}

	.field-input:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.field-hint {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		margin: 0;
	}

	.btn {
		align-self: flex-start;
		margin-top: 0.25rem;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-standard, 0.5rem);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: inherit;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.btn-quiet {
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.remove-form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}

	.remove-form .field-hint {
		flex: 1 1 14rem;
	}

	.result {
		margin: 1rem 0 0;
		font-size: 0.9rem;
	}

	.result-ok {
		color: var(--color-text);
	}

	.result-error {
		color: var(--color-error, #b3261e);
	}
</style>
