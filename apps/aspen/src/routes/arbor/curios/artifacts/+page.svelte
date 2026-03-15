<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import GlassConfirmDialog from "@autumnsgrove/lattice/ui/components/ui/GlassConfirmDialog.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { chromeIcons, actionIcons, stateIcons, phaseIcons, featureIcons } from "@autumnsgrove/prism/icons";
	import { api } from "@autumnsgrove/lattice/utils/api";
	import ArtifactConfigForm from "@autumnsgrove/lattice/curios/components/artifacts/ArtifactConfigForm.svelte";
	import ArtifactShowcase from "@autumnsgrove/lattice/curios/components/artifacts/ArtifactShowcase.svelte";
	import { summarizeConfig } from "@autumnsgrove/lattice/curios/artifacts";
	import type { ArtifactType, ArtifactDisplay } from "@autumnsgrove/lattice/curios/artifacts";

	let { data, form } = $props();

	let showAddForm = $state(false);
	let selectedType = $state("");
	let addName = $state("");

	// Inline editing
	let editingArtifact = $state<string | null>(null);
	let editName = $state("");
	let editPlacement = $state("");
	let editVisibility = $state("");
	let editRevealAnimation = $state("");
	let editContainer = $state("");
	let editConfig = $state<Record<string, unknown>>({});
	let saving = $state(false);

	// Preview showcase
	let previewOpen = $state(false);
	let previewIndex = $state(0);

	/** Map admin artifact data to ArtifactDisplay for the showcase */
	const showcaseArtifacts = $derived<ArtifactDisplay[]>(
		data.artifacts.map((a) => ({
			id: a.id,
			name: a.name ?? "",
			artifactType: a.artifactType as ArtifactDisplay["artifactType"],
			placement: a.placement as ArtifactDisplay["placement"],
			config: a.config,
			visibility: a.visibility as ArtifactDisplay["visibility"],
			discoveryRules: [],
			revealAnimation: a.revealAnimation as ArtifactDisplay["revealAnimation"],
			container: a.container as ArtifactDisplay["container"],
			positionX: null,
			positionY: null,
			zIndex: 10,
			fallbackZone: "floating" as const,
		})),
	);

	function openPreview(index: number) {
		previewIndex = index;
		previewOpen = true;
	}

	// Delete confirmation
	let pendingDelete = $state<{ id: string; name: string } | null>(null);
	let deleteConfirmOpen = $state(false);
	let deleteFormEl: HTMLFormElement;

	let deleteMessage = $derived(
		pendingDelete
			? `Are you sure you want to delete "${pendingDelete.name || "this artifact"}"? This can't be undone.`
			: "",
	);

	$effect(() => {
		if (form?.artifactAdded) {
			toast.success("Artifact added");
			showAddForm = false;
			selectedType = "";
			addName = "";
		} else if (form?.artifactRemoved) {
			toast.success("Artifact removed");
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	const typesByCategory = $derived(() => {
		const grouped: Record<string, typeof data.artifactTypes> = {};
		for (const t of data.artifactTypes) {
			if (!grouped[t.category]) grouped[t.category] = [];
			grouped[t.category].push(t);
		}
		return grouped;
	});

	const categoryLabels: Record<string, string> = {
		mystical: "Mystical",
		interactive: "Interactive",
		classic: "Classic Web",
		nature: "Nature & Atmosphere",
		whimsical: "Personal & Whimsical",
	};

	function getTypeName(type: string): string {
		return data.artifactTypes.find((t) => t.value === type)?.label ?? type;
	}

	function getVisibilityLabel(v: string): string {
		return data.visibilityOptions?.find((o) => o.value === v)?.label ?? v;
	}

	function startEdit(artifact: (typeof data.artifacts)[number]) {
		editingArtifact = artifact.id;
		editName = artifact.name ?? "";
		editPlacement = artifact.placement;
		editVisibility = artifact.visibility;
		editRevealAnimation = artifact.revealAnimation;
		editContainer = artifact.container;
		editConfig = { ...artifact.config };
	}

	function cancelEdit() {
		editingArtifact = null;
	}

	async function saveEdit(artifactId: string, artifactType: string) {
		saving = true;
		try {
			// Read serialized config from the hidden input in the edit form
			const configInput = document.querySelector<HTMLInputElement>(
				`#edit-form-${artifactId} input[name="config"]`,
			);
			const configStr = configInput?.value ?? "{}";
			const config = JSON.parse(configStr);

			await api.patch(`/api/curios/artifacts/${artifactId}`, {
				name: editName,
				placement: editPlacement,
				visibility: editVisibility,
				revealAnimation: editRevealAnimation,
				container: editContainer,
				config,
			});
			toast.success("Artifact updated");
			editingArtifact = null;
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Update failed");
		} finally {
			saving = false;
		}
	}

	function requestDelete(artifact: (typeof data.artifacts)[number]) {
		pendingDelete = { id: artifact.id, name: artifact.name || getTypeName(artifact.artifactType) };
		deleteConfirmOpen = true;
	}

	function confirmDelete() {
		if (pendingDelete && deleteFormEl) {
			deleteFormEl.requestSubmit();
		}
		pendingDelete = null;
	}

	function cancelDelete() {
		pendingDelete = null;
	}
</script>

<svelte:head>
	<title>Artifacts - Curios</title>
</svelte:head>

<div class="artifacts-page">
	<header class="page-header">
		<div class="title-row">
			<chromeIcons.wand class="header-icon" />
			<h1>Artifacts</h1>
		</div>
		<p class="subtitle">
			A personal cabinet of curiosities. Magic 8-Balls, fortune cookies, mood candles, snow globes,
			and more — small, weird, wonderful things that bring your site to life.
		</p>
	</header>

	<section class="add-section">
		{#if !showAddForm}
			<div class="action-buttons">
				<GlassButton variant="accent" onclick={() => (showAddForm = true)}>
					<actionIcons.plus class="btn-icon" />
					Add Artifact
				</GlassButton>
				{#if data.artifacts.length > 0}
					<GlassButton variant="ghost" onclick={() => openPreview(0)}>
						<stateIcons.eye class="btn-icon" />
						Preview Gallery
					</GlassButton>
				{/if}
			</div>
		{:else}
			<GlassCard class="add-form-card">
				<h2>Add an Artifact</h2>
				<form method="POST" action="?/add" use:enhance>
					<!-- Name field -->
					<div class="form-field name-field">
						<label for="add-name">Name</label>
						<input
							id="add-name"
							type="text"
							name="name"
							class="glass-input"
							placeholder="e.g. My Fortune Cookie"
							maxlength="80"
							bind:value={addName}
						/>
						<span class="help-text"
							>Optional — used for inline syntax like ::artifacts[My Cookie]::</span
						>
					</div>

					<!-- Type picker grouped by category -->
					<div class="type-grid">
						{#each Object.entries(typesByCategory()) as [category, types]}
							<div class="category-group">
								<h3 class="category-label">{categoryLabels[category] ?? category}</h3>
								<div class="type-pills">
									{#each types as type}
										<label class="type-pill" class:selected={selectedType === type.value}>
											<input
												type="radio"
												name="artifactType"
												value={type.value}
												bind:group={selectedType}
												class="sr-only"
											/>
											<span class="pill-label">{type.label}</span>
											<span class="pill-desc">{type.description}</span>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>

					<!-- Dynamic config form -->
					{#if selectedType}
						<ArtifactConfigForm artifactType={selectedType as ArtifactType} config={{}} />
					{:else}
						<input type="hidden" name="config" value={"{}"} />
					{/if}

					<!-- Settings row -->
					<div class="form-grid">
						<div class="form-field">
							<label for="placement">Zone</label>
							<select id="placement" name="placement" class="glass-input">
								{#each data.placementOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-field">
							<label for="visibility">
								<stateIcons.eye class="field-icon" />
								Visibility
							</label>
							<select id="visibility" name="visibility" class="glass-input">
								{#each data.visibilityOptions ?? [] as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-field">
							<label for="revealAnimation">
								<phaseIcons.sparkles class="field-icon" />
								Reveal
							</label>
							<select id="revealAnimation" name="revealAnimation" class="glass-input">
								{#each data.revealAnimationOptions ?? [] as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-field">
							<label for="container">
								<featureIcons.box class="field-icon" />
								Container
							</label>
							<select id="container" name="container" class="glass-input">
								{#each data.containerOptions ?? [] as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="form-actions">
						<GlassButton type="submit" variant="accent" disabled={!selectedType}>
							<actionIcons.plus class="btn-icon" />
							Add
						</GlassButton>
						<GlassButton
							variant="ghost"
							onclick={() => {
								showAddForm = false;
								selectedType = "";
								addName = "";
							}}
						>
							Cancel
						</GlassButton>
					</div>
				</form>
			</GlassCard>
		{/if}
	</section>

	<section class="artifacts-list">
		{#if data.artifacts.length === 0}
			<GlassCard class="empty-card">
				<chromeIcons.wand class="empty-icon" />
				<p>No artifacts yet.</p>
				<p class="empty-hint">Add some interactive objects to bring your site to life.</p>
			</GlassCard>
		{:else}
			<div class="artifact-cards">
				{#each data.artifacts as artifact, artIdx (artifact.id)}
					<GlassCard class={`artifact-card${editingArtifact === artifact.id ? " editing" : ""}`}>
						{#if editingArtifact === artifact.id}
							<!-- Edit mode -->
							<div class="edit-form" id="edit-form-{artifact.id}">
								<h3 class="edit-title">Edit Artifact</h3>

								<div class="form-field">
									<label for="edit-name-{artifact.id}">Name</label>
									<input
										id="edit-name-{artifact.id}"
										type="text"
										class="glass-input"
										placeholder="e.g. My Fortune Cookie"
										maxlength="80"
										bind:value={editName}
									/>
								</div>

								<ArtifactConfigForm
									artifactType={artifact.artifactType as ArtifactType}
									config={editConfig}
								/>

								<div class="form-grid">
									<div class="form-field">
										<label for="edit-placement-{artifact.id}">Zone</label>
										<select
											id="edit-placement-{artifact.id}"
											class="glass-input"
											bind:value={editPlacement}
										>
											{#each data.placementOptions as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>

									<div class="form-field">
										<label for="edit-visibility-{artifact.id}">Visibility</label>
										<select
											id="edit-visibility-{artifact.id}"
											class="glass-input"
											bind:value={editVisibility}
										>
											{#each data.visibilityOptions ?? [] as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>

									<div class="form-field">
										<label for="edit-reveal-{artifact.id}">Reveal</label>
										<select
											id="edit-reveal-{artifact.id}"
											class="glass-input"
											bind:value={editRevealAnimation}
										>
											{#each data.revealAnimationOptions ?? [] as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>

									<div class="form-field">
										<label for="edit-container-{artifact.id}">Container</label>
										<select
											id="edit-container-{artifact.id}"
											class="glass-input"
											bind:value={editContainer}
										>
											{#each data.containerOptions ?? [] as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>
								</div>

								<div class="form-actions">
									<GlassButton
										variant="accent"
										disabled={saving}
										onclick={() => saveEdit(artifact.id, artifact.artifactType)}
									>
										{saving ? "Saving…" : "Save"}
									</GlassButton>
									<GlassButton variant="ghost" onclick={cancelEdit}>Cancel</GlassButton>
								</div>
							</div>
						{:else}
							<!-- Display mode -->
							<div class="artifact-header">
								<div class="artifact-info">
									<h3>{artifact.name || getTypeName(artifact.artifactType)}</h3>
									{#if artifact.name}
										<span class="type-subtitle">{getTypeName(artifact.artifactType)}</span>
									{/if}
									<div class="meta-tags">
										<span class="meta-tag">{artifact.placement}</span>
										{#if artifact.visibility !== "always"}
											<span class="meta-tag meta-tag--discovery"
												>{getVisibilityLabel(artifact.visibility)}</span
											>
										{/if}
										{#if artifact.container === "glass-card"}
											<span class="meta-tag meta-tag--container">Glass card</span>
										{/if}
										{#each summarizeConfig(artifact.config) as tag}
											<span class="meta-tag meta-tag--config">{tag}</span>
										{/each}
									</div>
								</div>
								<div class="card-actions">
									<GlassButton
										variant="ghost"
										class="preview-btn"
										title="Preview artifact"
										onclick={() => openPreview(artIdx)}
									>
										<stateIcons.eye class="btn-icon-solo" />
									</GlassButton>
									<GlassButton
										variant="ghost"
										class="edit-btn"
										title="Edit artifact"
										onclick={() => startEdit(artifact)}
									>
										<actionIcons.edit class="btn-icon-solo" />
									</GlassButton>
									<GlassButton
										variant="ghost"
										class="remove-btn"
										title="Remove artifact"
										onclick={() => requestDelete(artifact)}
									>
										<actionIcons.trash class="btn-icon-solo" />
									</GlassButton>
								</div>
							</div>
						{/if}
					</GlassCard>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Hidden form for programmatic deletion -->
	<form bind:this={deleteFormEl} method="POST" action="?/remove" use:enhance hidden>
		<input type="hidden" name="artifactId" value={pendingDelete?.id ?? ""} />
	</form>

	<GlassConfirmDialog
		bind:open={deleteConfirmOpen}
		title="Delete Artifact?"
		message={deleteMessage}
		confirmLabel="Delete Artifact"
		variant="danger"
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>

	<ArtifactShowcase
		artifacts={showcaseArtifacts}
		bind:open={previewOpen}
		currentIndex={previewIndex}
		adminMode={true}
	/>
</div>

<style>
	.artifacts-page {
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
	.action-buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.add-section {
		margin-bottom: 2rem;
	}
	:global(.add-form-card) {
		padding: 1.5rem;
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.25rem 0;
		color: var(--color-text);
	}
	.name-field {
		margin-bottom: 1rem;
	}
	.help-text {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		opacity: 0.7;
		margin-top: 0.25rem;
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
	.type-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.type-pill {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition: all 0.2s;
		background: var(--grove-overlay-4);
	}
	.type-pill:hover {
		border-color: var(--color-primary);
	}
	.type-pill.selected {
		border-color: var(--color-primary);
		background: var(--grove-overlay-8);
	}
	.pill-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.pill-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
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
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
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
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	:global(.field-icon) {
		width: 0.85rem;
		height: 0.85rem;
		opacity: 0.6;
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
	.form-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}
	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
	}
	:global(.btn-icon-solo) {
		width: 1rem;
		height: 1rem;
	}
	:global(.empty-card) {
		padding: 3rem 1.5rem;
		text-align: center;
	}
	:global(.empty-icon) {
		width: 3rem;
		height: 3rem;
		color: var(--color-text-muted);
		opacity: 0.5;
		margin-bottom: 1rem;
	}
	.empty-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		opacity: 0.7;
	}
	.artifact-cards {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	:global(.artifact-card) {
		padding: 1rem 1.25rem;
	}
	:global(.artifact-card.editing) {
		padding: 1.25rem;
	}
	.artifact-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.artifact-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.artifact-info h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.type-subtitle {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.meta-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.25rem;
	}
	.meta-tag {
		font-size: 0.7rem;
		padding: 0.125rem 0.5rem;
		background: var(--grove-overlay-8);
		border-radius: 999px;
		color: var(--color-text-muted);
	}
	.meta-tag--discovery {
		background: rgba(147, 51, 234, 0.12);
		color: rgb(147, 51, 234);
	}
	.meta-tag--container {
		background: rgba(59, 130, 246, 0.12);
		color: rgb(59, 130, 246);
	}
	.meta-tag--config {
		background: rgba(16, 185, 129, 0.12);
		color: rgb(16, 185, 129);
	}
	.card-actions {
		display: flex;
		gap: 0.25rem;
	}
	:global(.preview-btn),
	:global(.edit-btn),
	:global(.remove-btn) {
		min-width: 2.5rem;
		min-height: 2.5rem;
	}
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.edit-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
		.form-actions {
			flex-wrap: wrap;
		}
		.artifact-header {
			flex-direction: column;
			gap: 0.75rem;
		}
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
