<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, GlassConfirmDialog, toast } from "$lib/ui/components/ui";
	import { BookMarked, Plus, Trash2, Settings, ChevronDown, ChevronUp } from "lucide-svelte";
	import { api } from "$lib/utils/api";

	let { data, form } = $props();
	let editingShelf = $state<string | null>(null);
	let editingItem = $state<string | null>(null);
	let addingItemTo = $state<string | null>(null);
	let pendingDeleteShelf = $state<{ id: string; name: string; itemCount: number } | null>(null);
	let deleteConfirmOpen = $state(false);
	let deleteFormEl: HTMLFormElement;

	// URL unfurling state
	let unfurling = $state(false);
	let unfurlError = $state<string | null>(null);

	let deleteMessage = $derived(
		pendingDeleteShelf
			? pendingDeleteShelf.itemCount > 0
				? `"${pendingDeleteShelf.name}" has ${pendingDeleteShelf.itemCount} item${pendingDeleteShelf.itemCount === 1 ? "" : "s"}. Deleting this shelf removes everything on it — we can't recover deleted shelves.`
				: `Are you sure you want to delete "${pendingDeleteShelf.name}"? We can't recover deleted shelves.`
			: "",
	);

	function confirmDeleteShelf() {
		if (pendingDeleteShelf && deleteFormEl) {
			deleteFormEl.requestSubmit();
		}
		pendingDeleteShelf = null;
	}

	function cancelDeleteShelf() {
		pendingDeleteShelf = null;
	}

	// Toast feedback on form results
	$effect(() => {
		if (form?.success) {
			if (form.shelfAdded) toast.success("Shelf created!");
			if (form.itemAdded) toast.success("Item added!");
			if (form.shelfUpdated) toast.success("Shelf updated!");
			if (form.itemUpdated) toast.success("Item updated!");
			if (form.shelfRemoved) toast.success("Shelf removed");
			if (form.itemRemoved) toast.success("Item removed");
		}
		if (form?.error) {
			toast.error(form.error);
		}
	});

	function getPresetDefaults(preset: string) {
		const map: Record<string, { displayMode: string; material: string }> = {
			books: { displayMode: "spines", material: "wood" },
			links: { displayMode: "cover-grid", material: "none" },
			custom: { displayMode: "cover-grid", material: "none" },
		};
		return map[preset] ?? map.custom;
	}

	async function handleUrlBlur(e: FocusEvent) {
		const input = e.target as HTMLInputElement;
		const url = input.value.trim();
		if (!url) return;

		// Validate URL client-side first
		try {
			new URL(url);
		} catch {
			return;
		}

		const formEl = input.closest("form");
		if (!formEl) return;

		unfurling = true;
		unfurlError = null;

		try {
			const result = await api.post<{
				success: boolean;
				data?: { title?: string; description?: string; image?: string };
			}>("/api/curios/shelves/unfurl", { url });

			if (!result?.success || !result.data) {
				unfurlError = "Couldn't fetch page info \u2014 fill in details manually";
				return;
			}

			const { title, description, image } = result.data;

			// Pre-fill EMPTY fields only — never overwrite user input
			const titleInput = formEl.querySelector<HTMLInputElement>('[name="title"]');
			if (titleInput && !titleInput.value.trim() && title) {
				titleInput.value = title;
			}

			const descInput = formEl.querySelector<HTMLInputElement>('[name="description"]');
			if (descInput && !descInput.value.trim() && description) {
				descInput.value = description;
			}

			const coverInput = formEl.querySelector<HTMLInputElement>('[name="coverUrl"]');
			if (coverInput && !coverInput.value.trim() && image) {
				coverInput.value = image;
			}
		} catch {
			unfurlError = "Couldn't fetch page info \u2014 fill in details manually";
		} finally {
			unfurling = false;
		}
	}

	function getDisplayModeLabel(mode: string): string {
		return data.displayModeOptions.find((o: { value: string }) => o.value === mode)?.label ?? mode;
	}

	function getMaterialLabel(mat: string): string {
		return data.materialOptions.find((o: { value: string }) => o.value === mat)?.label ?? mat;
	}
</script>

<svelte:head>
	<title>Shelves - Admin</title>
</svelte:head>

<div class="shelves-admin">
	<header class="page-header">
		<div class="title-row">
			<BookMarked class="header-icon" />
			<h1>Shelves</h1>
		</div>
		<p class="subtitle">
			Curate collections of books, links, and more. Choose a preset for smart defaults, or go
			custom.
		</p>
	</header>

	<!-- Create New Shelf -->
	<GlassCard class="create-section">
		<h2 class="section-title">
			<Plus class="section-icon" />
			Create a Shelf
		</h2>
		<form method="POST" action="?/addShelf" use:enhance class="create-form">
			<div class="form-row">
				<label class="form-label">
					Preset
					<select
						name="preset"
						class="form-select"
						onchange={(e) => {
							const target = e.target as HTMLSelectElement;
							const defaults = getPresetDefaults(target.value);
							const dmSelect = target.form?.querySelector(
								'[name="displayMode"]',
							) as HTMLSelectElement | null;
							const matSelect = target.form?.querySelector(
								'[name="material"]',
							) as HTMLSelectElement | null;
							if (dmSelect) dmSelect.value = defaults.displayMode;
							if (matSelect) matSelect.value = defaults.material;
						}}
					>
						{#each data.presetOptions.filter((o: { available: boolean }) => o.available) as option}
							<option value={option.value}>{option.label}</option>
						{/each}
						{#each data.presetOptions.filter((o: { available: boolean }) => !o.available) as option}
							<option value={option.value} disabled>{option.label} (coming soon)</option>
						{/each}
					</select>
				</label>
				<label class="form-label">
					Name
					<input
						type="text"
						name="name"
						required
						placeholder="My Reading List"
						class="form-input"
					/>
				</label>
			</div>
			<div class="form-row">
				<label class="form-label">
					Display Mode
					<select name="displayMode" class="form-select">
						{#each data.displayModeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				<label class="form-label">
					Material
					<select name="material" class="form-select">
						{#each data.materialOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
			<label class="form-label">
				Description (optional)
				<input
					type="text"
					name="description"
					placeholder="A short description"
					class="form-input"
				/>
			</label>
			<GlassButton type="submit" variant="accent">Create Shelf</GlassButton>
		</form>
	</GlassCard>

	<!-- Existing Shelves -->
	{#if data.shelves.length === 0}
		<GlassCard class="empty-state">
			<p>No shelves yet. Create one above to get started!</p>
		</GlassCard>
	{:else}
		{#each data.shelves as shelf (shelf.id)}
			<GlassCard class="shelf-card">
				<div class="shelf-card-header">
					<div class="shelf-card-info">
						<h2 class="shelf-card-title">{shelf.name}</h2>
						{#if shelf.description}
							<p class="shelf-card-desc">{shelf.description}</p>
						{/if}
						<div class="shelf-card-chips">
							<span class="chip">{shelf.preset}</span>
							<span class="chip">{getDisplayModeLabel(shelf.displayMode)}</span>
							<span class="chip">{getMaterialLabel(shelf.material)}</span>
							<span class="chip chip--muted">{shelf.items.length} items</span>
						</div>
					</div>
					<div class="shelf-card-actions">
						<button
							class="icon-btn"
							title="Edit shelf"
							onclick={() => (editingShelf = editingShelf === shelf.id ? null : shelf.id)}
						>
							{#if editingShelf === shelf.id}
								<ChevronUp />
							{:else}
								<Settings />
							{/if}
						</button>
						<button
							class="icon-btn icon-btn--danger"
							title="Delete shelf"
							onclick={() => {
								pendingDeleteShelf = {
									id: shelf.id,
									name: shelf.name,
									itemCount: shelf.items.length,
								};
								deleteConfirmOpen = true;
							}}
						>
							<Trash2 />
						</button>
					</div>
				</div>

				<!-- Shelf Edit Form -->
				{#if editingShelf === shelf.id}
					<form method="POST" action="?/updateShelf" use:enhance class="edit-form">
						<input type="hidden" name="shelfId" value={shelf.id} />
						<div class="form-row">
							<label class="form-label">
								Name
								<input type="text" name="name" value={shelf.name} class="form-input" />
							</label>
							<label class="form-label">
								Description
								<input
									type="text"
									name="description"
									value={shelf.description ?? ""}
									class="form-input"
								/>
							</label>
						</div>
						<div class="form-row">
							<label class="form-label">
								Display Mode
								<select name="displayMode" class="form-select">
									{#each data.displayModeOptions as option}
										<option value={option.value} selected={option.value === shelf.displayMode}
											>{option.label}</option
										>
									{/each}
								</select>
							</label>
							<label class="form-label">
								Material
								<select name="material" class="form-select">
									{#each data.materialOptions as option}
										<option value={option.value} selected={option.value === shelf.material}
											>{option.label}</option
										>
									{/each}
								</select>
							</label>
						</div>
						<div class="form-row">
							<label class="form-label">
								{shelf.creatorLabel} Label
								<input
									type="text"
									name="creatorLabel"
									value={shelf.creatorLabel}
									class="form-input"
								/>
							</label>
							<label class="form-label">
								Status 1 Label
								<input
									type="text"
									name="status1Label"
									value={shelf.status1Label}
									class="form-input"
								/>
							</label>
							<label class="form-label">
								Status 2 Label
								<input
									type="text"
									name="status2Label"
									value={shelf.status2Label}
									class="form-input"
								/>
							</label>
						</div>
						<GlassButton type="submit" variant="accent">Save Changes</GlassButton>
					</form>
				{/if}

				<!-- Items List -->
				{#if shelf.items.length > 0}
					<div class="items-list">
						{#each shelf.items as item (item.id)}
							<div class="item-row">
								<div class="item-info">
									<span class="item-title">{item.title}</span>
									{#if item.creator}
										<span class="item-creator">{item.creator}</span>
									{/if}
									{#if item.rating}
										<span class="item-rating"
											>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span
										>
									{/if}
								</div>
								<div class="item-actions">
									<button
										class="icon-btn icon-btn--small"
										title="Edit item"
										onclick={() => (editingItem = editingItem === item.id ? null : item.id)}
									>
										<Settings />
									</button>
									<form method="POST" action="?/removeItem" use:enhance>
										<input type="hidden" name="itemId" value={item.id} />
										<button
											type="submit"
											class="icon-btn icon-btn--small icon-btn--danger"
											title="Remove item"
										>
											<Trash2 />
										</button>
									</form>
								</div>
							</div>
							{#if editingItem === item.id}
								<form
									method="POST"
									action="?/updateItem"
									use:enhance
									class="edit-form edit-form--inline"
								>
									<input type="hidden" name="itemId" value={item.id} />
									<div class="form-row">
										<label class="form-label">
											Title
											<input type="text" name="title" value={item.title} class="form-input" />
										</label>
										<label class="form-label">
											URL
											<input type="url" name="url" value={item.url} class="form-input" />
										</label>
									</div>
									<div class="form-row">
										<label class="form-label">
											{shelf.creatorLabel}
											<input
												type="text"
												name="creator"
												value={item.creator ?? ""}
												class="form-input"
											/>
										</label>
										<label class="form-label">
											Category
											<input
												type="text"
												name="category"
												value={item.category ?? ""}
												class="form-input"
											/>
										</label>
										<label class="form-label">
											Rating (1-5)
											<input
												type="number"
												name="rating"
												min="1"
												max="5"
												value={item.rating ?? ""}
												class="form-input"
											/>
										</label>
									</div>
									<label class="form-label">
										Note
										<textarea name="note" rows="2" class="form-textarea">{item.note ?? ""}</textarea
										>
									</label>
									<GlassButton type="submit" variant="accent">Update Item</GlassButton>
								</form>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Add Item Toggle -->
				<div class="add-item-section">
					{#if addingItemTo === shelf.id}
						<form method="POST" action="?/addItem" use:enhance class="add-item-form">
							<input type="hidden" name="shelfId" value={shelf.id} />
							{#if shelf.preset === "links"}
								<div class="form-row">
									<label class="form-label">
										URL
										<div class="url-input-wrapper">
											<input
												type="url"
												name="url"
												required
												placeholder="https://example.com"
												class="form-input"
												onblur={handleUrlBlur}
											/>
											{#if unfurling}
												<svg
													class="unfurl-spinner"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path
														d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
													/>
												</svg>
											{/if}
										</div>
										{#if unfurlError}
											<span class="unfurl-hint">{unfurlError}</span>
										{/if}
									</label>
									<label class="form-label">
										Title
										<input
											type="text"
											name="title"
											required
											placeholder="Site Name"
											class="form-input"
										/>
									</label>
								</div>
							{:else}
								<div class="form-row">
									<label class="form-label">
										Title
										<input
											type="text"
											name="title"
											required
											placeholder="Item title"
											class="form-input"
										/>
									</label>
									<label class="form-label">
										{shelf.creatorLabel}
										<input
											type="text"
											name="creator"
											placeholder={shelf.creatorLabel}
											class="form-input"
										/>
									</label>
								</div>
								<label class="form-label">
									URL (optional)
									<div class="url-input-wrapper">
										<input
											type="url"
											name="url"
											placeholder="https://..."
											class="form-input"
											onblur={handleUrlBlur}
										/>
										{#if unfurling}
											<svg
												class="unfurl-spinner"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path
													d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
												/>
											</svg>
										{/if}
									</div>
									{#if unfurlError}
										<span class="unfurl-hint">{unfurlError}</span>
									{/if}
								</label>
							{/if}
							<div class="form-row">
								<label class="form-label">
									Cover URL (optional)
									<input type="url" name="coverUrl" placeholder="https://..." class="form-input" />
								</label>
								<label class="form-label">
									Category
									<input
										type="text"
										name="category"
										placeholder="e.g. Fiction"
										class="form-input"
									/>
								</label>
							</div>
							<div class="form-row">
								<label class="form-label">
									Description
									<input
										type="text"
										name="description"
										placeholder="Optional note"
										class="form-input"
									/>
								</label>
								<label class="form-label">
									Rating (1-5)
									<input type="number" name="rating" min="1" max="5" class="form-input" />
								</label>
							</div>
							<div class="form-row form-row--checkboxes">
								<label class="checkbox-label">
									<input type="checkbox" name="isStatus1" />
									{shelf.status1Label}
								</label>
								<label class="checkbox-label">
									<input type="checkbox" name="isStatus2" />
									{shelf.status2Label}
								</label>
							</div>
							<div class="form-actions">
								<GlassButton type="submit" variant="accent">Add Item</GlassButton>
								<GlassButton variant="ghost" onclick={() => (addingItemTo = null)}
									>Cancel</GlassButton
								>
							</div>
						</form>
					{:else}
						<GlassButton variant="ghost" onclick={() => (addingItemTo = shelf.id)}>
							<Plus class="btn-icon" />
							Add Item
						</GlassButton>
					{/if}
				</div>
			</GlassCard>
		{/each}
	{/if}

	<!-- Hidden form for programmatic shelf deletion -->
	<form bind:this={deleteFormEl} method="POST" action="?/removeShelf" use:enhance hidden>
		<input type="hidden" name="shelfId" value={pendingDeleteShelf?.id ?? ""} />
	</form>

	<GlassConfirmDialog
		bind:open={deleteConfirmOpen}
		title="Delete Shelf?"
		message={deleteMessage}
		confirmLabel="Delete Shelf"
		variant="danger"
		onconfirm={confirmDeleteShelf}
		oncancel={cancelDeleteShelf}
	/>
</div>

<style>
	.shelves-admin {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		margin-bottom: 0.5rem;
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
		margin: 0;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: 1.6;
	}

	:global(.create-section),
	:global(.shelf-card),
	:global(.empty-state) {
		padding: 1.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem;
	}

	:global(.section-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-primary);
	}

	/* Forms */
	.create-form,
	.edit-form,
	.add-item-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.edit-form {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--grove-overlay-8);
	}
	.edit-form--inline {
		margin: 0.5rem 0;
		padding: 0.75rem;
		background: var(--grove-overlay-4);
		border-radius: 0.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
	}

	.form-row--checkboxes {
		display: flex;
		gap: 1.5rem;
	}

	.form-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.form-input,
	.form-select,
	.form-textarea {
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--grove-overlay-16);
		border-radius: 0.375rem;
		background: var(--grove-overlay-4);
		color: var(--color-text);
		font-size: 0.875rem;
		font-family: inherit;
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: -1px;
	}

	.form-textarea {
		resize: vertical;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Shelf Card */
	.shelf-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.shelf-card-info {
		flex: 1;
		min-width: 0;
	}

	.shelf-card-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.shelf-card-desc {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		opacity: 0.7;
	}

	.shelf-card-chips {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}

	.chip {
		padding: 0.125rem 0.5rem;
		background: var(--grove-overlay-8);
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.chip--muted {
		opacity: 0.7;
	}

	.shelf-card-actions {
		display: flex;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: var(--grove-overlay-8);
		border-radius: 0.375rem;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.icon-btn:hover {
		background: var(--grove-overlay-16);
	}

	.icon-btn--danger:hover {
		background: rgba(239, 68, 68, 0.15);
		color: rgb(239, 68, 68);
	}

	.icon-btn--small {
		width: 1.5rem;
		height: 1.5rem;
	}

	.icon-btn :global(svg) {
		width: 1rem;
		height: 1rem;
	}
	.icon-btn--small :global(svg) {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Items List */
	.items-list {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		gap: 0.5rem;
	}

	.item-row:hover {
		background: var(--grove-overlay-4);
	}

	.item-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.item-title {
		font-size: 0.875rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-creator {
		font-size: 0.75rem;
		opacity: 0.6;
		white-space: nowrap;
	}

	.item-rating {
		font-size: 0.75rem;
		color: rgb(234, 179, 8);
		flex-shrink: 0;
	}

	.item-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.add-item-section {
		margin-top: 0.75rem;
	}

	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
	}

	/* URL unfurl */
	.url-input-wrapper {
		position: relative;
	}

	.url-input-wrapper .form-input {
		width: 100%;
	}

	.unfurl-spinner {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-primary);
		animation: unfurl-spin 1s linear infinite;
	}

	@keyframes unfurl-spin {
		to {
			transform: translateY(-50%) rotate(360deg);
		}
	}

	.unfurl-hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		opacity: 0.8;
		margin-top: 0.125rem;
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
