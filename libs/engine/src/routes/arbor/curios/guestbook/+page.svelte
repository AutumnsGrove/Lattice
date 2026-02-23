<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { GlassCard, GlassButton, Badge, toast } from "$lib/ui/components/ui";
	import {
		BookOpen,
		Check,
		X,
		Trash2,
		Clock,
		MessageSquare,
		Shield,
		ArrowLeft,
		Palette,
		Plus,
		RotateCcw,
	} from "lucide-svelte";
	import {
		formatRelativeTime,
		type GuestbookStyle,
		type GuestbookWallBacking,
		type GuestbookSigningStyle,
		type GuestbookCtaStyle,
		type GuestbookInlineMode,
		VALID_SIGNING_STYLES,
		DEFAULT_COLOR_PALETTE,
		isValidHexColor,
	} from "$lib/curios/guestbook";

	let { data, form } = $props();

	// Config form state
	let enabled = $state(false);
	let style = $state<GuestbookStyle>("cozy");
	let entriesPerPage = $state(20);
	let requireApproval = $state(true);
	let allowEmoji = $state(true);
	let maxMessageLength = $state(500);
	let customPrompt = $state("");
	let isSubmitting = $state(false);

	// Enhancement config state
	let wallBacking = $state<GuestbookWallBacking>("none");
	let ctaStyle = $state<GuestbookCtaStyle>("button");
	let inlineMode = $state<GuestbookInlineMode>("compact");
	let allowedStyles = $state<GuestbookSigningStyle[]>([...VALID_SIGNING_STYLES]);
	let colorPalette = $state<string[]>([...DEFAULT_COLOR_PALETTE]);
	let newColorInput = $state("#8b5e3c");

	// Moderation state
	let pendingEntries = $state<
		{
			id: string;
			name: string;
			message: string;
			emoji: string | null;
			createdAt: string;
			entryStyle: string | null;
			entryColor: string | null;
		}[]
	>([]);
	let loadingPending = $state(false);
	let activeTab = $state<"settings" | "moderation">("settings");

	// Sync form state with loaded data
	$effect(() => {
		if (data.config) {
			enabled = data.config.enabled ?? false;
			style = (data.config.style as GuestbookStyle) ?? "cozy";
			entriesPerPage = data.config.entriesPerPage ?? 20;
			requireApproval = data.config.requireApproval ?? true;
			allowEmoji = data.config.allowEmoji ?? true;
			maxMessageLength = data.config.maxMessageLength ?? 500;
			customPrompt = data.config.customPrompt ?? "";
			wallBacking = (data.config.wallBacking as GuestbookWallBacking) ?? "none";
			ctaStyle = (data.config.ctaStyle as GuestbookCtaStyle) ?? "button";
			inlineMode = (data.config.inlineMode as GuestbookInlineMode) ?? "compact";
			allowedStyles = data.config.allowedStyles ?? [...VALID_SIGNING_STYLES];
			colorPalette = data.config.colorPalette ?? [...DEFAULT_COLOR_PALETTE];
		}
	});

	// Show toast on form result
	$effect(() => {
		if (form?.success) {
			toast.success("Guestbook settings saved!");
		} else if (form?.error) {
			toast.error("Failed to save", { description: form.error });
		}
	});

	async function loadPendingEntries() {
		loadingPending = true;
		try {
			const res = await fetch("/api/curios/guestbook/pending"); // csrf-ok
			if (res.ok) {
				const data = (await res.json()) as { entries: typeof pendingEntries };
				pendingEntries = data.entries;
			}
		} catch {
			toast.error("Failed to load pending entries");
		} finally {
			loadingPending = false;
		}
	}

	async function approveEntry(id: string) {
		try {
			const res = await fetch(`/api/curios/guestbook/${id}`, {
				// csrf-ok
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ approved: true }),
			});
			if (res.ok) {
				pendingEntries = pendingEntries.filter((e) => e.id !== id);
				toast.success("Entry approved!");
				invalidateAll();
			}
		} catch {
			toast.error("Failed to approve entry");
		}
	}

	async function deleteEntry(id: string) {
		try {
			const res = await fetch(`/api/curios/guestbook/${id}`, {
				// csrf-ok
				method: "DELETE",
			});
			if (res.ok) {
				pendingEntries = pendingEntries.filter((e) => e.id !== id);
				toast.success("Entry deleted");
				invalidateAll();
			}
		} catch {
			toast.error("Failed to delete entry");
		}
	}

	function toggleSigningStyle(s: GuestbookSigningStyle) {
		if (allowedStyles.includes(s)) {
			// Don't allow removing the last style
			if (allowedStyles.length > 1) {
				allowedStyles = allowedStyles.filter((x) => x !== s);
			}
		} else {
			allowedStyles = [...allowedStyles, s];
		}
	}

	function addColor() {
		const color = newColorInput.trim();
		if (isValidHexColor(color) && !colorPalette.includes(color)) {
			colorPalette = [...colorPalette, color];
		}
	}

	function removeColor(color: string) {
		if (colorPalette.length > 1) {
			colorPalette = colorPalette.filter((c) => c !== color);
		}
	}

	function resetPalette() {
		colorPalette = [...DEFAULT_COLOR_PALETTE];
	}

	function switchTab(tab: "settings" | "moderation") {
		activeTab = tab;
		if (tab === "moderation" && pendingEntries.length === 0) {
			loadPendingEntries();
		}
	}
</script>

<svelte:head>
	<title>Guestbook - Admin</title>
</svelte:head>

<div class="guestbook-admin">
	<header class="page-header">
		<div class="header-top">
			<GlassButton href="/arbor/curios" variant="ghost" class="back-link">
				<ArrowLeft class="w-4 h-4" />
				Back to Curios
			</GlassButton>
		</div>
		<div class="title-row">
			<BookOpen class="header-icon" />
			<h1>Guestbook</h1>
		</div>
		<p class="subtitle">Let visitors sign your guestbook. The classic personal web element.</p>
	</header>

	<!-- Stats -->
	<div class="stats-row">
		<GlassCard class="stat-card">
			<div class="stat-value">{data.stats.approvedEntries}</div>
			<div class="stat-label">Approved</div>
		</GlassCard>
		<GlassCard class="stat-card">
			<div class="stat-value pending-value">{data.stats.pendingEntries}</div>
			<div class="stat-label">Pending</div>
		</GlassCard>
		<GlassCard class="stat-card">
			<div class="stat-value">{data.stats.totalEntries}</div>
			<div class="stat-label">Total</div>
		</GlassCard>
	</div>

	<!-- Tabs -->
	<div class="tab-bar">
		<button
			class="tab"
			class:active={activeTab === "settings"}
			onclick={() => switchTab("settings")}
		>
			Settings
		</button>
		<button
			class="tab"
			class:active={activeTab === "moderation"}
			onclick={() => switchTab("moderation")}
		>
			Moderation
			{#if data.stats.pendingEntries > 0}
				<Badge variant="destructive" class="pending-badge">{data.stats.pendingEntries}</Badge>
			{/if}
		</button>
	</div>

	<!-- Settings Tab -->
	{#if activeTab === "settings"}
		<GlassCard class="settings-card">
			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- Enable Toggle -->
				<div class="form-section">
					<h3>General</h3>
					<label class="toggle-row">
						<span class="toggle-label">
							<strong>Enable Guestbook</strong>
							<span class="toggle-hint">Make the guestbook visible on your site</span>
						</span>
						<input
							type="checkbox"
							name="enabled"
							value="true"
							bind:checked={enabled}
							class="toggle-input"
						/>
					</label>
				</div>

				<!-- Display Style -->
				<div class="form-section">
					<h3>Display Style</h3>
					<div class="style-grid">
						{#each data.styleOptions as option}
							<label class="style-option" class:selected={style === option.value}>
								<input type="radio" name="style" value={option.value} bind:group={style} />
								<span class="style-name">{option.label}</span>
								<span class="style-desc">{option.description}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Wall Backing -->
				<div class="form-section">
					<h3>Wall Backing</h3>
					<p class="section-hint">The texture behind your guestbook entries</p>
					<div class="style-grid">
						{#each data.wallBackingOptions as option}
							<label class="style-option" class:selected={wallBacking === option.value}>
								<input
									type="radio"
									name="wallBacking"
									value={option.value}
									bind:group={wallBacking}
								/>
								<span class="style-name">{option.label}</span>
								<span class="style-desc">{option.description}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Signing Styles -->
				<div class="form-section">
					<h3>Signing Styles</h3>
					<p class="section-hint">
						Which entry styles visitors can use. At least one must be enabled.
					</p>
					<div class="signing-styles-grid">
						{#each data.signingStyleOptions as option}
							<button
								type="button"
								class="signing-chip"
								class:active={allowedStyles.includes(option.value)}
								onclick={() => toggleSigningStyle(option.value)}
								aria-pressed={allowedStyles.includes(option.value)}
							>
								<span class="signing-chip-name">{option.label}</span>
								<span class="signing-chip-desc">{option.description}</span>
							</button>
						{/each}
					</div>
					<input type="hidden" name="allowedStyles" value={JSON.stringify(allowedStyles)} />
				</div>

				<!-- Color Palette -->
				<div class="form-section">
					<h3>Color Palette</h3>
					<p class="section-hint">
						Accent colors visitors can choose from. Used for entry highlights, not text.
					</p>
					<div class="palette-editor">
						<div class="palette-swatches">
							{#each colorPalette as color}
								<button
									type="button"
									class="palette-swatch"
									style:--swatch-color={color}
									onclick={() => removeColor(color)}
									aria-label="Remove color {color}"
									title="Click to remove"
								>
									{#if colorPalette.length > 1}
										<span class="swatch-remove"><X class="w-3 h-3" /></span>
									{/if}
								</button>
							{/each}
							<div class="palette-add">
								<input
									type="color"
									bind:value={newColorInput}
									class="color-input"
									aria-label="Pick a new color"
								/>
								<button type="button" class="add-color-btn" onclick={addColor}>
									<Plus class="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
						<button type="button" class="reset-palette-btn" onclick={resetPalette}>
							<RotateCcw class="w-3.5 h-3.5" />
							Reset to defaults
						</button>
					</div>
					<input type="hidden" name="colorPalette" value={JSON.stringify(colorPalette)} />
				</div>

				<!-- Inline Widget Mode -->
				<div class="form-section">
					<h3>Inline Widget</h3>
					<label class="toggle-row">
						<span class="toggle-label">
							<strong>Styled mini-collage</strong>
							<span class="toggle-hint"
								>Show signing styles in the inline widget instead of compact list</span
							>
						</span>
						<input
							type="checkbox"
							name="inlineMode"
							value="styled"
							checked={inlineMode === "styled"}
							onchange={(e) => {
								inlineMode = e.currentTarget.checked ? "styled" : "compact";
							}}
							class="toggle-input"
						/>
					</label>
				</div>

				<!-- Moderation -->
				<div class="form-section">
					<h3>Moderation</h3>
					<label class="toggle-row">
						<span class="toggle-label">
							<strong>Require Approval</strong>
							<span class="toggle-hint">Review entries before they appear publicly</span>
						</span>
						<input
							type="checkbox"
							name="requireApproval"
							value="true"
							bind:checked={requireApproval}
							class="toggle-input"
						/>
					</label>
				</div>

				<!-- Features -->
				<div class="form-section">
					<h3>Features</h3>
					<label class="toggle-row">
						<span class="toggle-label">
							<strong>Allow Emoji</strong>
							<span class="toggle-hint">Let visitors pick an emoji for their entry</span>
						</span>
						<input
							type="checkbox"
							name="allowEmoji"
							value="true"
							bind:checked={allowEmoji}
							class="toggle-input"
						/>
					</label>
				</div>

				<!-- Limits -->
				<div class="form-section">
					<h3>Limits</h3>
					<div class="input-group">
						<label class="input-label" for="entriesPerPage"> Entries per page </label>
						<input
							id="entriesPerPage"
							type="number"
							name="entriesPerPage"
							bind:value={entriesPerPage}
							min="10"
							max="100"
							class="number-input"
						/>
					</div>
					<div class="input-group">
						<label class="input-label" for="maxMessageLength"> Max message length </label>
						<input
							id="maxMessageLength"
							type="number"
							name="maxMessageLength"
							bind:value={maxMessageLength}
							min="50"
							max="2000"
							class="number-input"
						/>
					</div>
				</div>

				<!-- Custom Prompt -->
				<div class="form-section">
					<h3>Custom Prompt</h3>
					<div class="input-group">
						<label class="input-label" for="customPrompt"> Prompt text shown above the form </label>
						<input
							id="customPrompt"
							type="text"
							name="customPrompt"
							bind:value={customPrompt}
							placeholder="Leave a message!"
							class="text-input"
						/>
					</div>
				</div>

				<div class="form-actions">
					<GlassButton type="submit" variant="accent" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Save Configuration"}
					</GlassButton>
				</div>
			</form>
		</GlassCard>
	{/if}

	<!-- Moderation Tab -->
	{#if activeTab === "moderation"}
		<GlassCard class="moderation-card">
			{#if loadingPending}
				<div class="loading-state">
					<Clock class="w-5 h-5 spin" />
					<span>Loading pending entries...</span>
				</div>
			{:else if pendingEntries.length === 0}
				<div class="empty-state">
					<Shield class="w-8 h-8" />
					<p>No entries awaiting approval</p>
					<span class="empty-hint"
						>New entries will appear here when visitors sign your guestbook</span
					>
				</div>
			{:else}
				<div class="pending-list">
					{#each pendingEntries as entry}
						<div class="pending-entry">
							<div class="entry-header">
								<span class="entry-name">
									{#if entry.emoji}<span class="entry-emoji">{entry.emoji}</span>{/if}
									{entry.name}
								</span>
								<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
							</div>
							<p class="entry-message">{entry.message}</p>
							{#if entry.entryStyle || entry.entryColor}
								<div class="entry-meta-badges">
									{#if entry.entryStyle}
										<span class="meta-badge">{entry.entryStyle}</span>
									{/if}
									{#if entry.entryColor}
										<span class="meta-color-dot" style:background={entry.entryColor}></span>
									{/if}
								</div>
							{/if}
							<div class="entry-actions">
								<button
									class="action-btn approve"
									onclick={() => approveEntry(entry.id)}
									aria-label="Approve entry from {entry.name}"
								>
									<Check class="w-4 h-4" />
									Approve
								</button>
								<button
									class="action-btn delete"
									onclick={() => deleteEntry(entry.id)}
									aria-label="Delete entry from {entry.name}"
								>
									<Trash2 class="w-4 h-4" />
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	{/if}
</div>

<style>
	.guestbook-admin {
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

	/* Stats */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	:global(.stat-card) {
		text-align: center;
		padding: 1.25rem !important;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.stat-value.pending-value {
		color: var(--color-primary);
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	/* Tabs */
	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
		margin-bottom: 1.5rem;
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 0.95rem;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 500;
	}

	:global(.pending-badge) {
		font-size: 0.7rem !important;
		padding: 0.1rem 0.4rem !important;
		min-width: 1.25rem;
		text-align: center;
	}

	/* Settings Card */
	:global(.settings-card) {
		padding: 1.5rem !important;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.form-section:last-of-type {
		border-bottom: none;
		margin-bottom: 1rem;
	}

	.form-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 1rem;
	}

	/* Toggle rows */
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
	}

	.toggle-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.toggle-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.toggle-input {
		width: 2.5rem;
		height: 1.25rem;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	/* Style grid */
	.style-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.style-option {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.style-option:hover {
		border-color: var(--color-primary);
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
	}

	.style-option.selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.style-option input[type="radio"] {
		display: none;
	}

	.style-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.style-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Input groups */
	.input-group {
		margin-bottom: 1rem;
	}

	.input-group:last-child {
		margin-bottom: 0;
	}

	.input-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.number-input,
	.text-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text);
		background: hsl(var(--background));
		transition: border-color 0.2s ease;
	}

	.number-input:focus,
	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	.number-input {
		max-width: 150px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 1rem;
	}

	/* Section hints */
	.section-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: -0.5rem 0 1rem;
	}

	/* Signing styles toggle chips */
	.signing-styles-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.signing-chip {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.625rem 1rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.signing-chip:hover {
		border-color: var(--color-primary);
	}

	.signing-chip.active {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.signing-chip-name {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.signing-chip-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Color palette editor */
	.palette-editor {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.palette-swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.palette-swatch {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		background: var(--swatch-color);
		border: 2px solid transparent;
		cursor: pointer;
		position: relative;
		transition: all 0.15s ease;
	}

	.palette-swatch:hover {
		transform: scale(1.1);
		border-color: var(--color-text);
	}

	.swatch-remove {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 50%;
		color: white;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.palette-swatch:hover .swatch-remove {
		opacity: 1;
	}

	.palette-add {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.color-input {
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 50%;
		padding: 0;
		cursor: pointer;
		background: none;
	}

	.color-input::-webkit-color-swatch-wrapper {
		padding: 2px;
	}

	.color-input::-webkit-color-swatch {
		border: none;
		border-radius: 50%;
	}

	.add-color-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: 1px dashed var(--color-border, #e5e7eb);
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
		color: var(--color-text-muted);
		transition: all 0.15s ease;
	}

	.add-color-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.reset-palette-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		transition: all 0.15s ease;
		align-self: flex-start;
	}

	.reset-palette-btn:hover {
		color: var(--color-text);
		border-color: var(--color-text);
	}

	/* Entry meta badges in moderation */
	.entry-meta-badges {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.meta-badge {
		font-size: 0.7rem;
		font-weight: 500;
		padding: 0.15rem 0.5rem;
		border-radius: 2rem;
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.06));
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.meta-color-dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	/* Moderation Card */
	:global(.moderation-card) {
		padding: 1.5rem !important;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.empty-hint {
		font-size: 0.85rem;
		opacity: 0.7;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.spin) {
			animation: none;
		}
	}

	/* Pending entries */
	.pending-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pending-entry {
		padding: 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.entry-name {
		font-weight: 600;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.entry-emoji {
		font-size: 1.1em;
	}

	.entry-date {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.entry-message {
		font-size: 0.9rem;
		color: var(--color-text);
		line-height: 1.5;
		margin: 0 0 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.entry-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s ease;
	}

	.action-btn.approve {
		color: hsl(var(--grove-600, 142 76% 36%));
	}

	.action-btn.approve:hover {
		background: hsl(var(--grove-600, 142 76% 36%) / 0.1);
		border-color: hsl(var(--grove-600, 142 76% 36%));
	}

	.action-btn.delete {
		color: hsl(var(--destructive));
	}

	.action-btn.delete:hover {
		background: hsl(var(--destructive) / 0.1);
		border-color: hsl(var(--destructive));
	}

	:global(.dark) .action-btn.approve:hover {
		background: rgb(6 78 59 / 0.3);
	}

	:global(.dark) .action-btn.delete:hover {
		background: rgb(127 29 29 / 0.3);
	}

	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.style-grid {
			grid-template-columns: 1fr;
		}

		.title-row {
			flex-wrap: wrap;
		}

		.toggle-row {
			flex-wrap: wrap;
		}

		.tab {
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
		}

		.signing-styles-grid {
			gap: 0.375rem;
		}

		.signing-chip {
			padding: 0.5rem 0.75rem;
		}

		.palette-swatches {
			gap: 0.375rem;
		}

		.entry-header {
			flex-wrap: wrap;
		}

		.entry-actions {
			flex-wrap: wrap;
		}
	}
</style>
