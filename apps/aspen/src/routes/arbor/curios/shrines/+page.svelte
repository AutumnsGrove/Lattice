<script lang="ts">
	import { enhance } from "$app/forms";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { Heart, Plus, Trash2, Eye, EyeOff, Pencil, X, RotateCcw, Save } from "@lucide/svelte";
	import ShrineCanvas from "@autumnsgrove/lattice/curios/shrines/ShrineCanvas.svelte";
	import type { ShrineContentItem, ShrineSize, FrameStyle } from "@autumnsgrove/lattice/curios/shrines";

	let { data, form } = $props();

	let showAddForm = $state(false);

	// Editor state
	let editingShrineId = $state<string | null>(null);
	let editorItems = $state<ShrineContentItem[]>([]);
	let editingItemIndex = $state<number | null>(null);

	// New item form
	let newItemType = $state<string>("text");
	let showAddItem = $state(false);

	// Get the shrine currently being edited
	let editingShrine = $derived(
		editingShrineId ? data.shrines.find((s: { id: string }) => s.id === editingShrineId) : null,
	);

	function startEditing(shrine: { id: string; contents: ShrineContentItem[] }) {
		editingShrineId = shrine.id;
		editorItems = JSON.parse(JSON.stringify(shrine.contents));
		editingItemIndex = null;
		showAddItem = false;
	}

	/** Element ref for returning focus on close */
	let editTriggerRef = $state<HTMLElement | null>(null);

	function stopEditing() {
		const trigger = editTriggerRef;
		editingShrineId = null;
		editorItems = [];
		editingItemIndex = null;
		showAddItem = false;
		editTriggerRef = null;
		// Return focus to the edit button that opened the editor
		if (trigger) {
			requestAnimationFrame(() => trigger.focus());
		}
	}

	function addItem() {
		const centerX = 50;
		const centerY = 50;
		let newItem: ShrineContentItem;

		switch (newItemType) {
			case "text":
				newItem = {
					type: "text",
					x: centerX,
					y: centerY,
					data: { text: "Your text here", font: "sans" },
				};
				break;
			case "icon":
				newItem = { type: "icon", x: centerX, y: centerY, data: { icon: "Heart", label: "Heart" } };
				break;
			case "date":
				newItem = {
					type: "date",
					x: centerX,
					y: centerY,
					data: { date: new Date().toISOString().split("T")[0] },
				};
				break;
			case "quote":
				newItem = {
					type: "quote",
					x: centerX,
					y: centerY,
					data: { text: "A meaningful quote", attribution: "" },
				};
				break;
			case "decoration":
				newItem = { type: "decoration", x: centerX, y: centerY, data: { style: "sparkle" } };
				break;
			default:
				return;
		}

		editorItems = [...editorItems, newItem];
		editingItemIndex = editorItems.length - 1;
		showAddItem = false;
	}

	function removeItem(index: number) {
		editorItems = editorItems.filter((_: ShrineContentItem, i: number) => i !== index);
		if (editingItemIndex === index) editingItemIndex = null;
		else if (editingItemIndex !== null && editingItemIndex > index) editingItemIndex--;
	}

	function updateItemField(index: number, field: string, value: unknown) {
		const updated = [...editorItems];
		if (field === "x" || field === "y") {
			const num = Math.max(0, Math.min(100, Number(value)));
			updated[index] = { ...updated[index], [field]: num };
		} else {
			updated[index] = { ...updated[index], data: { ...updated[index].data, [field]: value } };
		}
		editorItems = updated;
	}

	$effect(() => {
		if (form?.shrineAdded) {
			toast.success("Shrine created with template");
			showAddForm = false;
		} else if (form?.publishToggled) {
			toast.success("Shrine visibility updated");
		} else if (form?.shrineRemoved) {
			toast.success("Shrine removed");
		} else if (form?.contentsUpdated) {
			toast.success("Shrine contents saved");
			stopEditing();
		} else if (form?.templateLoaded) {
			toast.success("Template loaded");
			stopEditing();
		} else if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>Personal Shrines - Curios</title>
</svelte:head>

<div class="shrines-page">
	<header class="page-header">
		<div class="title-row">
			<Heart class="header-icon" aria-hidden="true" />
			<h1>Personal Shrines</h1>
		</div>
		<p class="subtitle">
			Sacred spaces for things you love — never performative, always sincere. Dedicate them to
			memories, fandoms, or gratitude.
		</p>
	</header>

	<!-- Add Shrine Form -->
	<section class="add-section">
		{#if !showAddForm}
			<GlassButton variant="accent" onclick={() => (showAddForm = true)}>
				<Plus class="btn-icon" />
				Create a Shrine
			</GlassButton>
		{:else}
			<GlassCard class="add-form-card">
				<h2>New Shrine</h2>
				<form method="POST" action="?/add" use:enhance>
					<div class="form-grid">
						<div class="form-field full-width">
							<label for="title">Title</label>
							<input
								type="text"
								id="title"
								name="title"
								placeholder="A shrine for..."
								required
								maxlength="100"
								class="glass-input"
							/>
						</div>

						<div class="form-field">
							<label for="shrineType">Type</label>
							<select id="shrineType" name="shrineType" class="glass-input" required>
								{#each data.shrineTypeOptions as option}
									<option value={option.value}>{option.label} — {option.description}</option>
								{/each}
							</select>
							<span class="field-hint">Choosing a type pre-fills a starting template</span>
						</div>

						<div class="form-field">
							<label for="size">Size</label>
							<select id="size" name="size" class="glass-input" required>
								{#each data.sizeOptions as option}
									<option value={option.value}>{option.label} ({option.dimensions})</option>
								{/each}
							</select>
						</div>

						<div class="form-field">
							<label for="frameStyle">Frame Style</label>
							<select id="frameStyle" name="frameStyle" class="glass-input" required>
								{#each data.frameStyleOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-field">
							<label for="description">Description <span class="optional">(optional)</span></label>
							<input
								type="text"
								id="description"
								name="description"
								placeholder="What this shrine means to you"
								maxlength="500"
								class="glass-input"
							/>
						</div>
					</div>

					<div class="form-actions">
						<GlassButton type="submit" variant="accent">
							<Plus class="btn-icon" />
							Create Shrine
						</GlassButton>
						<GlassButton variant="ghost" onclick={() => (showAddForm = false)}>Cancel</GlassButton>
					</div>
				</form>
			</GlassCard>
		{/if}
	</section>

	<!-- Shrine Editor (when editing) -->
	{#if editingShrine}
		<section class="editor-section">
			<GlassCard class="editor-card">
				<div class="editor-header">
					<h2>Editing: {editingShrine.title}</h2>
					<GlassButton variant="ghost" onclick={stopEditing} aria-label="Close editor">
						<X class="btn-icon" />
					</GlassButton>
				</div>

				<div class="editor-layout">
					<!-- Live preview -->
					<div class="editor-preview">
						<div class="preview-label">Preview</div>
						<ShrineCanvas
							items={editorItems}
							size={editingShrine.size as ShrineSize}
							frameStyle={editingShrine.frameStyle as FrameStyle}
							title={editingShrine.title}
						/>
					</div>

					<!-- Item list + controls -->
					<div class="editor-controls">
						<div class="controls-header">
							<span class="controls-label">Items ({editorItems.length})</span>
							<div class="controls-actions">
								<form method="POST" action="?/loadTemplate" use:enhance>
									<input type="hidden" name="shrineId" value={editingShrine.id} />
									<input type="hidden" name="shrineType" value={editingShrine.shrineType} />
									<GlassButton
										type="submit"
										variant="ghost"
										title="Reset to template"
										aria-label="Reset to template"
									>
										<RotateCcw class="btn-icon" />
									</GlassButton>
								</form>
							</div>
						</div>

						<!-- Item list -->
						<div class="item-list" role="listbox" aria-label="Shrine content items">
							{#each editorItems as item, i}
								<div
									class="item-row"
									class:active={editingItemIndex === i}
									role="option"
									aria-selected={editingItemIndex === i}
									tabindex="0"
									onclick={() => (editingItemIndex = editingItemIndex === i ? null : i)}
									onkeydown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											editingItemIndex = editingItemIndex === i ? null : i;
										}
									}}
								>
									<span class="item-type-badge">{item.type}</span>
									<span class="item-position">({Math.round(item.x)}, {Math.round(item.y)})</span>
									<button
										type="button"
										class="item-remove"
										onclick={(e) => {
											e.stopPropagation();
											removeItem(i);
										}}
										aria-label="Remove {item.type} item at position {Math.round(
											item.x,
										)}, {Math.round(item.y)}"
									>
										<X size={14} />
									</button>
								</div>
							{/each}
						</div>

						<!-- Selected item editor -->
						{#if editingItemIndex !== null && editorItems[editingItemIndex]}
							{@const item = editorItems[editingItemIndex]}
							<div class="item-editor">
								<h4>Edit {item.type}</h4>

								<div class="position-fields">
									<div class="form-field">
										<label for="item-x">X %</label>
										<input
											type="number"
											id="item-x"
											min="0"
											max="100"
											step="1"
											value={Math.round(item.x)}
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"x",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
									<div class="form-field">
										<label for="item-y">Y %</label>
										<input
											type="number"
											id="item-y"
											min="0"
											max="100"
											step="1"
											value={Math.round(item.y)}
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"y",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
								</div>

								{#if item.type === "text"}
									<div class="form-field">
										<label for="item-text">Text</label>
										<input
											type="text"
											id="item-text"
											value={item.data.text ?? ""}
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"text",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
									<div class="form-field">
										<label for="item-font">Font</label>
										<select
											id="item-font"
											value={item.data.font ?? "sans"}
											onchange={(e) =>
												updateItemField(
													editingItemIndex!,
													"font",
													(e.target as HTMLSelectElement).value,
												)}
											class="glass-input"
										>
											<option value="sans">Sans-serif</option>
											<option value="serif">Serif (formal)</option>
										</select>
									</div>
								{:else if item.type === "icon"}
									<div class="form-field">
										<label for="item-icon">Icon</label>
										<select
											id="item-icon"
											value={item.data.icon ?? "Heart"}
											onchange={(e) =>
												updateItemField(
													editingItemIndex!,
													"icon",
													(e.target as HTMLSelectElement).value,
												)}
											class="glass-input"
										>
											<option value="Heart">Heart</option>
											<option value="Star">Star</option>
											<option value="Flame">Candle</option>
											<option value="Sparkles">Sparkles</option>
											<option value="Trophy">Trophy</option>
											<option value="Flower2">Flower</option>
										</select>
									</div>
								{:else if item.type === "date"}
									<div class="form-field">
										<label for="item-date">Date</label>
										<input
											type="date"
											id="item-date"
											value={item.data.date ?? ""}
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"date",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
								{:else if item.type === "quote"}
									<div class="form-field">
										<label for="item-quote-text">Quote</label>
										<input
											type="text"
											id="item-quote-text"
											value={item.data.text ?? ""}
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"text",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
									<div class="form-field">
										<label for="item-attribution"
											>Attribution <span class="optional">(optional)</span></label
										>
										<input
											type="text"
											id="item-attribution"
											value={item.data.attribution ?? ""}
											placeholder="— Someone wise"
											oninput={(e) =>
												updateItemField(
													editingItemIndex!,
													"attribution",
													(e.target as HTMLInputElement).value,
												)}
											class="glass-input"
										/>
									</div>
								{:else if item.type === "decoration"}
									<div class="form-field">
										<label for="item-deco-style">Style</label>
										<select
											id="item-deco-style"
											value={item.data.style ?? "sparkle"}
											onchange={(e) =>
												updateItemField(
													editingItemIndex!,
													"style",
													(e.target as HTMLSelectElement).value,
												)}
											class="glass-input"
										>
											<option value="sparkle">Sparkle</option>
											<option value="glow">Glow</option>
											<option value="flower">Flower</option>
										</select>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Add item -->
						{#if showAddItem}
							<div class="add-item-bar">
								<label for="new-item-type" class="sr-only">Item type</label>
								<select id="new-item-type" bind:value={newItemType} class="glass-input">
									{#each data.contentTypeOptions as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
								<GlassButton variant="accent" onclick={addItem}>Add</GlassButton>
								<GlassButton variant="ghost" onclick={() => (showAddItem = false)}>
									<X class="btn-icon" />
								</GlassButton>
							</div>
						{:else}
							<GlassButton
								variant="ghost"
								onclick={() => (showAddItem = true)}
								class="add-item-btn"
							>
								<Plus class="btn-icon" />
								Add Item
							</GlassButton>
						{/if}

						<!-- Save — inject editorItems at submit time to avoid stale hidden input values -->
						<form
							method="POST"
							action="?/updateContents"
							use:enhance={({ formData }) => {
								formData.set("contents", JSON.stringify(editorItems));
							}}
							class="save-form"
						>
							<input type="hidden" name="shrineId" value={editingShrine.id} />
							<GlassButton type="submit" variant="accent" class="save-btn">
								<Save class="btn-icon" />
								Save Contents
							</GlassButton>
						</form>
					</div>
				</div>
			</GlassCard>
		</section>
	{/if}

	<!-- Shrine List -->
	<section class="shrines-section">
		{#if data.shrines.length === 0}
			<GlassCard class="empty-card">
				<Heart class="empty-icon" aria-hidden="true" />
				<p>No shrines yet.</p>
				<p class="empty-hint">Create a shrine to dedicate space for something meaningful.</p>
			</GlassCard>
		{:else}
			<div class="shrine-list">
				{#each data.shrines as shrine}
					<GlassCard class="shrine-card {editingShrineId === shrine.id ? 'editing' : ''}">
						<div class="shrine-header">
							<div>
								<h3>{shrine.title}</h3>
								<div class="shrine-meta">
									<Badge variant="secondary">{shrine.shrineType}</Badge>
									<span class="meta-detail">{shrine.size} &middot; {shrine.frameStyle}</span>
									{#if shrine.isPublished}
										<Badge variant="default">Published</Badge>
									{:else}
										<Badge variant="secondary">Draft</Badge>
									{/if}
								</div>
								{#if shrine.description}
									<p class="shrine-description">{shrine.description}</p>
								{/if}
							</div>
							<div class="shrine-actions">
								<GlassButton
									variant="ghost"
									onclick={(e: MouseEvent) => {
										if (editingShrineId === shrine.id) {
											stopEditing();
										} else {
											editTriggerRef = e.currentTarget as HTMLElement;
											startEditing(shrine);
										}
									}}
									title={editingShrineId === shrine.id ? "Close editor" : "Edit contents"}
									aria-label={editingShrineId === shrine.id
										? `Close editor for ${shrine.title}`
										: `Edit contents of ${shrine.title}`}
								>
									{#if editingShrineId === shrine.id}
										<X class="btn-icon" />
									{:else}
										<Pencil class="btn-icon" />
									{/if}
								</GlassButton>
								<form method="POST" action="?/togglePublish" use:enhance>
									<input type="hidden" name="shrineId" value={shrine.id} />
									<input type="hidden" name="isPublished" value={String(shrine.isPublished)} />
									<GlassButton
										type="submit"
										variant="ghost"
										title={shrine.isPublished ? "Unpublish" : "Publish"}
										aria-label={shrine.isPublished
											? `Unpublish ${shrine.title}`
											: `Publish ${shrine.title}`}
									>
										{#if shrine.isPublished}
											<EyeOff class="btn-icon" />
										{:else}
											<Eye class="btn-icon" />
										{/if}
									</GlassButton>
								</form>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="shrineId" value={shrine.id} />
									<GlassButton
										type="submit"
										variant="ghost"
										class="remove-btn"
										title="Remove shrine"
										aria-label={`Remove ${shrine.title}`}
									>
										<Trash2 class="btn-icon" />
									</GlassButton>
								</form>
							</div>
						</div>
						<div class="shrine-contents-info">
							{shrine.contents.length} item{shrine.contents.length !== 1 ? "s" : ""} placed
						</div>
					</GlassCard>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.shrines-page {
		max-width: 900px;
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
	.add-section {
		margin-bottom: 2rem;
	}
	:global(.add-form-card) {
		padding: 1.5rem;
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
		color: var(--bark-700, #8b7355);
	}
	:global(.dark) .form-field label {
		color: var(--bark-600, #ccb59c);
	}
	.optional {
		font-weight: 400;
		opacity: 0.7;
	}
	.field-hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
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
	.glass-input:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
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

	/* Editor */
	.editor-section {
		margin-bottom: 2rem;
	}
	:global(.editor-card) {
		padding: 1.5rem;
	}
	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.editor-header h2 {
		margin: 0;
	}
	.editor-layout {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
	}
	.editor-preview {
		flex-shrink: 0;
	}
	.preview-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}
	.editor-controls {
		flex: 1;
		min-width: 0;
	}
	.controls-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.controls-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}

	/* Item list */
	.item-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		max-height: 320px;
		overflow-y: auto;
	}
	.item-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		background: var(--grove-overlay-4);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.1s ease;
		font-size: 0.8rem;
		color: var(--color-text);
		width: 100%;
		text-align: left;
	}
	.item-row:hover {
		background: var(--grove-overlay-8);
	}
	.item-row:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	.item-row.active {
		border-color: var(--color-primary);
		background: var(--grove-overlay-8);
	}
	.item-type-badge {
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-primary);
	}
	.item-position {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}
	.item-remove {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted);
		padding: 0.5rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
	}
	.item-remove:hover {
		color: var(--color-error, #ef4444);
		background: rgba(239, 68, 68, 0.1);
	}
	.item-remove:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	/* Item editor */
	.item-editor {
		padding: 0.75rem;
		background: var(--grove-overlay-4);
		border-radius: 8px;
		margin-bottom: 0.75rem;
	}
	.item-editor h4 {
		font-size: 0.8rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: var(--color-text);
		text-transform: capitalize;
	}
	.position-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	/* Add item */
	.add-item-bar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.add-item-bar .glass-input {
		flex: 1;
	}
	:global(.add-item-btn) {
		width: 100%;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	/* Save */
	.save-form {
		margin-top: 0.5rem;
	}
	:global(.save-btn) {
		width: 100%;
		justify-content: center;
	}

	/* Shrine list */
	.shrine-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	:global(.shrine-card) {
		padding: 1.25rem;
	}
	:global(.shrine-card.editing) {
		border-color: var(--color-primary);
	}
	.shrine-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.shrine-header h3 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.shrine-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.375rem;
	}
	.meta-detail {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.shrine-description {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0.375rem 0 0;
	}
	.shrine-actions {
		display: flex;
		gap: 0.25rem;
	}
	.shrine-contents-info {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--grove-overlay-8);
	}
	:global(.remove-btn) {
		min-width: 2.75rem;
		min-height: 2.75rem;
	}

	/* Screen reader only utility */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@media (max-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
		.title-row {
			flex-wrap: wrap;
		}
		.shrine-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		.shrine-actions {
			flex-wrap: wrap;
		}
		.editor-layout {
			flex-direction: column;
		}
		.editor-preview {
			align-self: center;
		}
	}
</style>
