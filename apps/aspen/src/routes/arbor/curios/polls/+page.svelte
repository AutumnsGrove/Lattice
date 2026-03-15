<script lang="ts">
	import { enhance } from "$app/forms";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { metricIcons, navIcons, actionIcons, featureIcons } from "@autumnsgrove/prism/icons";
	import {
		POLL_TYPE_OPTIONS,
		RESULTS_VISIBILITY_OPTIONS,
		CONTAINER_STYLE_OPTIONS,
		isPollClosed,
	} from "@autumnsgrove/lattice/curios/polls";

	let { data, form } = $props();

	let showCreateForm = $state(false);
	let question = $state("");
	let description = $state("");
	let pollType = $state("single");
	let resultsVisibility = $state("after-vote");
	let containerStyle = $state("glass");
	let isPinned = $state(false);
	let closeDate = $state("");
	let isSubmitting = $state(false);

	// Option state: text + optional emoji + optional color
	let optionInputs = $state<Array<{ text: string; emoji: string; color: string }>>([
		{ text: "", emoji: "", color: "" },
		{ text: "", emoji: "", color: "" },
		{ text: "", emoji: "", color: "" },
	]);

	// Show toast
	$effect(() => {
		if (form?.success && form?.pollCreated) {
			toast.success("Poll created!");
			showCreateForm = false;
			resetForm();
		} else if (form?.success && form?.pollRemoved) {
			toast.success("Poll deleted.");
		} else if (form?.success && form?.pollArchived) {
			toast.success("Poll archived.");
		} else if (form?.success && form?.pollDuplicated) {
			toast.success("Poll duplicated!");
		} else if (form?.error) {
			toast.error("Failed", { description: form.error });
		}
	});

	function resetForm() {
		question = "";
		description = "";
		pollType = "single";
		resultsVisibility = "after-vote";
		containerStyle = "glass";
		isPinned = false;
		closeDate = "";
		optionInputs = [
			{ text: "", emoji: "", color: "" },
			{ text: "", emoji: "", color: "" },
			{ text: "", emoji: "", color: "" },
		];
	}

	function addOption() {
		if (optionInputs.length < 20) {
			optionInputs = [...optionInputs, { text: "", emoji: "", color: "" }];
		}
	}

	function removeOption(index: number) {
		if (optionInputs.length > 2) {
			optionInputs = optionInputs.filter((_, i) => i !== index);
		}
	}

	let validOptionCount = $derived(optionInputs.filter((o) => o.text.trim()).length);
</script>

<svelte:head>
	<title>Polls - Admin</title>
</svelte:head>

<div class="polls-admin">
	<header class="page-header">
		<div class="header-top">
			<GlassButton href="/arbor/curios" variant="ghost" class="back-link">
				<ArrowLeft class="w-4 h-4" />
				Back to Curios
			</GlassButton>
		</div>
		<div class="title-row">
			<BarChart3 class="header-icon" />
			<h1>Polls</h1>
		</div>
		<p class="subtitle">Ask your visitors anything — live results, no login required.</p>
	</header>

	<div class="section-header">
		<h3>Your Polls</h3>
		<GlassButton variant="accent" onclick={() => (showCreateForm = !showCreateForm)}>
			<Plus class="w-4 h-4" />
			New Poll
		</GlassButton>
	</div>

	{#if showCreateForm}
		<GlassCard class="create-card">
			<h4>Create a Poll</h4>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- Question + Description -->
				<div class="form-section">
					<div class="input-group">
						<label class="input-label" for="question">Question</label>
						<input
							id="question"
							type="text"
							name="question"
							bind:value={question}
							placeholder="What's your favorite season?"
							maxlength="300"
							class="text-input"
							required
						/>
					</div>

					<div class="input-group">
						<label class="input-label" for="description"
							>Description <span class="optional">(optional)</span></label
						>
						<input
							id="description"
							type="text"
							name="description"
							bind:value={description}
							placeholder="A quick poll for the community..."
							maxlength="500"
							class="text-input"
						/>
					</div>
				</div>

				<!-- Options with emoji + color -->
				<div class="form-section">
					<h4>Options</h4>
					{#each optionInputs as _, i}
						<div class="option-row">
							<input
								type="text"
								name="option_{i}"
								bind:value={optionInputs[i].text}
								placeholder="Option {i + 1}"
								maxlength="200"
								class="text-input option-text-input"
							/>
							<input
								type="text"
								name="option_emoji_{i}"
								bind:value={optionInputs[i].emoji}
								placeholder="🌸"
								maxlength="4"
								class="text-input emoji-input"
								title="Emoji (optional)"
							/>
							<input
								type="color"
								name="option_color_{i}"
								bind:value={optionInputs[i].color}
								class="color-input"
								title="Bar color (optional)"
							/>
							{#if optionInputs.length > 2}
								<button
									type="button"
									class="remove-option"
									onclick={() => removeOption(i)}
									aria-label="Remove option {i + 1}"
								>
									&times;
								</button>
							{/if}
						</div>
					{/each}
					{#if optionInputs.length < 20}
						<button type="button" class="add-option-btn" onclick={addOption}> + Add Option </button>
					{/if}
				</div>

				<!-- Settings -->
				<div class="form-section settings-grid">
					<div class="input-group">
						<label class="input-label" for="pollType">Type</label>
						<select id="pollType" name="pollType" bind:value={pollType} class="select-input">
							{#each POLL_TYPE_OPTIONS as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="input-group">
						<label class="input-label" for="resultsVisibility">Results Visible</label>
						<select
							id="resultsVisibility"
							name="resultsVisibility"
							bind:value={resultsVisibility}
							class="select-input"
						>
							{#each RESULTS_VISIBILITY_OPTIONS as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="input-group">
						<label class="input-label" for="containerStyle">Style</label>
						<select
							id="containerStyle"
							name="containerStyle"
							bind:value={containerStyle}
							class="select-input"
						>
							{#each CONTAINER_STYLE_OPTIONS as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="input-group">
						<label class="input-label" for="closeDate"
							>Close Date <span class="optional">(optional)</span></label
						>
						<input
							id="closeDate"
							type="datetime-local"
							name="closeDate"
							bind:value={closeDate}
							class="text-input"
						/>
					</div>
				</div>

				<!-- Pin toggle -->
				<div class="form-section">
					<label class="toggle-label">
						<input
							type="checkbox"
							name="isPinned"
							value="true"
							bind:checked={isPinned}
							class="toggle-checkbox"
						/>
						<span class="toggle-text">Pin to top of poll list</span>
					</label>
				</div>

				<div class="form-actions">
					<GlassButton variant="ghost" onclick={() => (showCreateForm = false)}>Cancel</GlassButton>
					<GlassButton
						type="submit"
						variant="accent"
						disabled={isSubmitting || !question.trim() || validOptionCount < 2}
					>
						{isSubmitting ? "Creating..." : "Create Poll"}
					</GlassButton>
				</div>
			</form>
		</GlassCard>
	{/if}

	{#if data.polls && data.polls.length > 0}
		<div class="poll-list">
			{#each data.polls as poll (poll.id)}
				<GlassCard class="poll-card">
					<div class="poll-header">
						<div class="poll-info">
							<h4>{poll.question}</h4>
							<span class="poll-meta">
								{poll.options.length} options &middot; {poll.voteCount} vote{poll.voteCount !== 1
									? "s"
									: ""}
								{#if poll.containerStyle && poll.containerStyle !== "glass"}
									&middot; {poll.containerStyle}
								{/if}
								{#if poll.isPinned}
									&middot; Pinned
								{/if}
								{#if poll.isClosed}
									&middot; Closed
								{/if}
								{#if poll.status === "archived"}
									&middot; Archived
								{/if}
							</span>
						</div>
						<div class="poll-actions-row">
							<!-- Duplicate -->
							<form
								method="POST"
								action="?/duplicate"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
									};
								}}
							>
								<input type="hidden" name="pollId" value={poll.id} />
								<button
									type="submit"
									class="action-btn"
									title="Duplicate poll"
									aria-label="Duplicate poll"
								>
									<Copy class="w-4 h-4" />
								</button>
							</form>
							<!-- Archive -->
							{#if poll.status !== "archived"}
								<form
									method="POST"
									action="?/archive"
									use:enhance={({ cancel }) => {
										if (!confirm("Archive this poll? It will be hidden from visitors.")) {
											cancel();
											return;
										}
										return async ({ update }) => {
											await update();
										};
									}}
								>
									<input type="hidden" name="pollId" value={poll.id} />
									<button
										type="submit"
										class="action-btn"
										title="Archive poll"
										aria-label="Archive poll"
									>
										<Archive class="w-4 h-4" />
									</button>
								</form>
							{/if}
							<!-- Delete (only for archived polls — two-step destruction) -->
							{#if poll.status === "archived"}
								<form
									method="POST"
									action="?/remove"
									use:enhance={({ cancel }) => {
										if (
											!confirm("Permanently delete this poll and all votes? This cannot be undone.")
										) {
											cancel();
											return;
										}
										return async ({ update }) => {
											await update();
										};
									}}
								>
									<input type="hidden" name="pollId" value={poll.id} />
									<button type="submit" class="remove-btn" aria-label="Permanently delete poll">
										<Trash2 class="w-4 h-4" />
									</button>
								</form>
							{/if}
						</div>
					</div>
					<div class="poll-options-preview">
						{#each poll.options as option}
							<span class="option-chip">
								{#if option.emoji}{option.emoji}
								{/if}{option.text}
							</span>
						{/each}
					</div>
				</GlassCard>
			{/each}
		</div>
	{:else if !showCreateForm}
		<GlassCard class="empty-card">
			<p class="empty-state">No polls yet. Create one to start asking your visitors questions.</p>
		</GlassCard>
	{/if}
</div>

<style>
	.polls-admin {
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
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}
	.section-header h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	:global(.create-card),
	:global(.poll-card),
	:global(.empty-card) {
		padding: 1.5rem !important;
		margin-bottom: 1rem;
	}
	:global(.create-card) h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 1rem;
	}

	.form-section {
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}
	.form-section:last-of-type {
		border-bottom: none;
	}
	.form-section h4 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.75rem;
	}

	.input-group {
		margin-bottom: 0.75rem;
	}
	.input-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.375rem;
	}
	.optional {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.text-input,
	.select-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text);
		background: hsl(var(--background));
	}
	.text-input:focus,
	.select-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	.settings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.option-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}
	.option-text-input {
		flex: 1;
	}
	.emoji-input {
		width: 3.5rem;
		min-width: 3.5rem;
		text-align: center;
		padding: 0.625rem 0.25rem;
	}
	.color-input {
		width: 2.75rem;
		min-width: 2.75rem;
		height: 2.75rem;
		padding: 0.25rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		cursor: pointer;
		background: none;
	}
	.remove-option {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 1.25rem;
		border-radius: 0.25rem;
	}
	.remove-option:hover {
		color: hsl(var(--destructive));
		background: hsl(var(--destructive) / 0.1);
	}
	.add-option-btn {
		background: none;
		border: 1px dashed var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		padding: 0.5rem;
		width: 100%;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s ease;
	}
	.add-option-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* Toggle / Pin */
	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text);
	}
	.toggle-checkbox {
		accent-color: var(--color-primary);
		width: 1rem;
		height: 1rem;
	}
	.toggle-text {
		font-weight: 500;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.poll-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.poll-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.poll-info h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.25rem;
	}
	.poll-meta {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.poll-actions-row {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		background: none;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.action-btn:hover {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
	}
	.remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		background: none;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.remove-btn:hover {
		color: hsl(var(--destructive));
		background: hsl(var(--destructive) / 0.1);
		border-color: hsl(var(--destructive) / 0.2);
	}

	.poll-options-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.option-chip {
		font-size: 0.8rem;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		background: var(--grove-overlay-8, rgba(0, 0, 0, 0.06));
		color: var(--color-text-muted);
	}
	.empty-state {
		text-align: center;
		padding: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.95rem;
	}

	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
		.section-header {
			flex-wrap: wrap;
			align-items: stretch;
		}
		.settings-grid {
			grid-template-columns: 1fr;
		}
		.poll-header {
			flex-wrap: wrap;
		}
		.option-row {
			flex-wrap: wrap;
		}
		.form-actions {
			flex-wrap: wrap;
		}
	}
</style>
