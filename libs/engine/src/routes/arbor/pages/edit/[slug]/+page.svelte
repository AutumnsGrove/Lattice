<script>
	import { goto, beforeNavigate } from "$app/navigation";
	import { browser } from "$app/environment";
	import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
	import { Button } from "$lib/ui";
	import Dialog from "$lib/ui/components/ui/Dialog.svelte";
	import { toast } from "$lib/ui/components/ui/toast";
	import { api } from "$lib/utils";
	import { clickOutside } from "$lib/actions/clickOutside";
	import { ExternalLink, Ellipsis, Trash2, ChevronRight, ArrowLeft } from "lucide-svelte";
	import Waystone from "$lib/ui/components/ui/Waystone.svelte";

	/**
	 * @typedef {Object} PageData
	 * @property {string} slug
	 * @property {string} title
	 * @property {string} description
	 * @property {string} markdown_content
	 * @property {{ title?: string; subtitle?: string; cta?: { text: string; link: string } } | null} hero
	 * @property {string} gutter_content
	 * @property {string | null} font
	 * @property {number} show_in_nav
	 * @property {number | string | null} created_at
	 * @property {number | string | null} updated_at
	 */

	/**
	 * @type {{ data: { page: PageData, curios?: { slug: string, name: string, enabled: boolean }[] } }}
	 */
	let { data } = $props();

	/** System pages that cannot be deleted */
	const PROTECTED_SLUGS = ["home", "about"];

	// Form state - initialized from loaded data (synced via effect)
	let title = $state("");
	let slug = $state("");
	let description = $state("");
	let content = $state("");
	let font = $state("default");
	let showInNav = $state(false);

	// Hero section state
	let heroTitle = $state("");
	let heroSubtitle = $state("");
	let heroCtaText = $state("");
	let heroCtaLink = $state("");
	let hasHero = $state(false);

	// Sync form state when data changes
	$effect(() => {
		title = data.page.title || "";
		slug = data.page.slug || "";
		description = data.page.description || "";
		content = data.page.markdown_content || "";
		font = data.page.font || "default";
		showInNav = data.page.show_in_nav === 1;
		heroTitle = data.page.hero?.title || "";
		heroSubtitle = data.page.hero?.subtitle || "";
		heroCtaText = data.page.hero?.cta?.text || "";
		heroCtaLink = data.page.hero?.cta?.link || "";
		hasHero = !!data.page.hero;
	});

	// Editor reference for anchor insertion
	/** @type {any} */
	let editorRef = $state(null);

	// UI state
	let saving = $state(false);
	let hasUnsavedChanges = $state(false);
	let showDeleteDialog = $state(false);
	let showMoreMenu = $state(false);
	let detailsExpanded = $state(
		browser ? localStorage.getItem("page-editor-details-collapsed") === "false" : false,
	);

	// Details summary — shows populated metadata at a glance when collapsed
	let detailsSummary = $derived.by(() => {
		/** @type {string[]} */
		const parts = [];
		if (description.trim()) parts.push("description");
		if (font && font !== "default") parts.push(font);
		if (showInNav) parts.push("in nav");
		if (hasHero) parts.push("hero");
		return parts.join(" \u00b7 ");
	});

	function toggleDetails() {
		detailsExpanded = !detailsExpanded;
		if (browser) {
			localStorage.setItem("page-editor-details-collapsed", String(!detailsExpanded));
		}
	}

	// Track changes
	$effect(() => {
		const hasChanges =
			title !== (data.page.title || "") ||
			description !== (data.page.description || "") ||
			content !== (data.page.markdown_content || "") ||
			font !== (data.page.font || "default") ||
			showInNav !== (data.page.show_in_nav === 1) ||
			heroTitle !== (data.page.hero?.title || "") ||
			heroSubtitle !== (data.page.hero?.subtitle || "") ||
			heroCtaText !== (data.page.hero?.cta?.text || "") ||
			heroCtaLink !== (data.page.hero?.cta?.link || "");
		hasUnsavedChanges = hasChanges;
	});

	/** Format a timestamp (unix seconds, unix ms, or ISO string) to locale string */
	/** @param {number | string | null | undefined} val */
	function formatTimestamp(val) {
		if (!val) return "";
		if (typeof val === "number") {
			return new Date(val < 1e12 ? val * 1000 : val).toLocaleString();
		}
		return new Date(val).toLocaleString();
	}

	/** Whether this is a protected system page */
	let isProtected = $derived(PROTECTED_SLUGS.includes(slug));

	async function handleSave() {
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}
		if (!content.trim()) {
			toast.error("Content is required");
			return;
		}

		saving = true;

		try {
			// Build hero object if enabled
			/** @type {{ title: string; subtitle: string; cta?: { text: string; link: string } } | null} */
			let hero = null;
			if (hasHero && heroTitle.trim()) {
				hero = {
					title: heroTitle.trim(),
					subtitle: heroSubtitle.trim(),
				};
				if (heroCtaText.trim() && heroCtaLink.trim()) {
					hero.cta = {
						text: heroCtaText.trim(),
						link: heroCtaLink.trim(),
					};
				}
			}

			await api.put(`/api/pages/${slug}`, {
				title: title.trim(),
				description: description.trim(),
				markdown_content: content,
				hero: hero ? JSON.stringify(hero) : null,
				font,
				show_in_nav: showInNav,
			});

			editorRef?.clearDraft();
			toast.success("Page saved successfully!");
			hasUnsavedChanges = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update page");
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		showDeleteDialog = false;
		saving = true;

		try {
			await api.delete(`/api/pages/${slug}`);
			toast.success("Page deleted successfully");
			goto("/arbor/pages");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete page");
		} finally {
			saving = false;
		}
	}

	// Flush draft and warn about unsaved changes on page unload
	/** @param {BeforeUnloadEvent} e */
	function handleBeforeUnload(e) {
		editorRef?.flushDraft();

		if (hasUnsavedChanges) {
			e.preventDefault();
			return (e.returnValue = "You have unsaved changes. Are you sure you want to leave?");
		}
	}

	// Guard SvelteKit client-side navigations
	beforeNavigate((navigation) => {
		editorRef?.flushDraft();

		if (hasUnsavedChanges) {
			if (!confirm("You have unsaved changes. Leave this page?")) {
				navigation.cancel();
			}
		}
	});
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<div class="edit-page-container">
	<header class="page-header">
		<div class="header-content">
			<a href="/arbor/pages" class="back-link">
				<ArrowLeft size={14} class="inline-block" /> Back to Pages
			</a>
			<div class="title-row">
				<h1>Edit Page</h1>
				<Waystone slug="using-curios-in-content" label="Curio directives" size="sm" />
				{#if hasUnsavedChanges}
					<span class="unsaved-badge">Unsaved changes</span>
				{/if}
			</div>
		</div>
		<div class="header-actions">
			<!-- Status indicator (pages are always live) -->
			<span class="status-badge live">
				<span class="status-dot"></span> Live
			</span>

			<!-- View Live -->
			<Button
				variant="ghost"
				size="icon"
				href={slug === "home" ? "/" : `/${slug}`}
				title="View live page"
			>
				<ExternalLink size={16} />
			</Button>

			<!-- More menu (contains Delete) -->
			{#if !isProtected}
				<div class="more-menu">
					<Button
						variant="ghost"
						size="icon"
						onclick={() => (showMoreMenu = !showMoreMenu)}
						title="More actions"
						aria-expanded={showMoreMenu}
						aria-haspopup="true"
					>
						<Ellipsis size={16} />
					</Button>
					{#if showMoreMenu}
						<div
							class="more-menu-dropdown"
							role="menu"
							use:clickOutside={() => (showMoreMenu = false)}
						>
							<button
								class="menu-item danger"
								role="menuitem"
								onclick={() => {
									showMoreMenu = false;
									showDeleteDialog = true;
								}}
							>
								<Trash2 size={14} />
								Delete Page
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Save (primary action, always rightmost) -->
			<Button onclick={handleSave} disabled={saving || !hasUnsavedChanges}>
				{saving ? "Saving..." : "Save"}
			</Button>
		</div>
	</header>

	<div class="editor-layout">
		<!-- Inline title -->
		<input
			type="text"
			class="inline-title"
			bind:value={title}
			placeholder="Untitled"
			aria-label="Page title"
		/>

		<!-- Details strip -->
		<div class="details-strip">
			<button class="details-toggle" onclick={toggleDetails}>
				<ChevronRight size={16} class="details-chevron {detailsExpanded ? 'rotated' : ''}" />
				<span class="details-label">Page details</span>
				{#if !detailsExpanded && detailsSummary}
					<span class="details-summary">{detailsSummary}</span>
				{/if}
			</button>

			{#if detailsExpanded}
				<div class="details-fields">
					<div class="form-group field-full">
						<label for="description">
							Description
							<span
								class="char-count"
								class:warning={description.length > 160}
								class:good={description.length >= 120 && description.length <= 160}
							>
								{description.length}/160
							</span>
						</label>
						<textarea
							id="description"
							bind:value={description}
							placeholder="A brief description of this page (120-160 chars for SEO)..."
							rows="3"
							class="form-input form-textarea"
							class:char-warning={description.length > 160}
						></textarea>
						{#if description.length > 160}
							<span class="form-warning">Description exceeds recommended SEO length</span>
						{:else if description.length > 0 && description.length < 120}
							<span class="form-hint"
								>Add {120 - description.length} more chars for optimal SEO</span
							>
						{/if}
					</div>

					<div class="form-group">
						<label for="font">Font</label>
						<select id="font" bind:value={font} class="form-input">
							<option value="default">Default (Site Setting)</option>
							<optgroup label="Accessibility">
								<option value="lexend">Lexend (Default)</option>
								<option value="atkinson">Atkinson Hyperlegible</option>
								<option value="opendyslexic">OpenDyslexic</option>
								<option value="luciole">Luciole</option>
								<option value="nunito">Nunito</option>
							</optgroup>
							<optgroup label="Modern Sans">
								<option value="quicksand">Quicksand</option>
								<option value="manrope">Manrope</option>
								<option value="instrument-sans">Instrument Sans</option>
								<option value="plus-jakarta-sans">Plus Jakarta Sans</option>
							</optgroup>
							<optgroup label="Serifs">
								<option value="cormorant">Cormorant</option>
								<option value="bodoni-moda">Bodoni Moda</option>
								<option value="lora">Lora</option>
								<option value="eb-garamond">EB Garamond</option>
								<option value="merriweather">Merriweather</option>
								<option value="fraunces">Fraunces</option>
							</optgroup>
							<optgroup label="Monospace">
								<option value="ibm-plex-mono">IBM Plex Mono</option>
								<option value="cozette">Cozette</option>
							</optgroup>
							<optgroup label="Display & Special">
								<option value="alagard">Alagard</option>
								<option value="calistoga">Calistoga</option>
								<option value="caveat">Caveat</option>
							</optgroup>
						</select>
						<span class="form-hint">Choose a font for this page's content</span>
					</div>

					<div class="form-group">
						<label class="nav-toggle">
							<input type="checkbox" bind:checked={showInNav} />
							<span class="nav-toggle-text">
								<span class="nav-toggle-title">Display in navigation</span>
								<span class="nav-toggle-hint"
									>This page will appear in your site's navigation menu.</span
								>
							</span>
						</label>
					</div>

					<!-- Hero Section -->
					<div class="form-group field-full">
						<label class="nav-toggle">
							<input type="checkbox" bind:checked={hasHero} />
							<span class="nav-toggle-text">
								<span class="nav-toggle-title">Enable Hero Section</span>
								<span class="nav-toggle-hint"
									>Add a prominent header area with optional call-to-action.</span
								>
							</span>
						</label>

						{#if hasHero}
							<div class="hero-fields">
								<div class="form-group">
									<label for="heroTitle">Hero Title</label>
									<input
										type="text"
										id="heroTitle"
										bind:value={heroTitle}
										placeholder="Welcome to..."
										class="form-input"
									/>
								</div>

								<div class="form-group">
									<label for="heroSubtitle">Hero Subtitle</label>
									<input
										type="text"
										id="heroSubtitle"
										bind:value={heroSubtitle}
										placeholder="A brief tagline"
										class="form-input"
									/>
								</div>

								<div class="cta-fields">
									<div class="form-group">
										<label for="heroCtaText">CTA Button Text</label>
										<input
											type="text"
											id="heroCtaText"
											bind:value={heroCtaText}
											placeholder="Learn More"
											class="form-input"
										/>
									</div>

									<div class="form-group">
										<label for="heroCtaLink">CTA Button Link</label>
										<input
											type="text"
											id="heroCtaLink"
											bind:value={heroCtaLink}
											placeholder="/blog"
											class="form-input"
										/>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Lifecycle metadata -->
					<div class="metadata-info field-full">
						{#if data.page.created_at}
							<p class="info-item">
								<span class="info-label">Created:</span>
								<span class="info-value">
									{formatTimestamp(data.page.created_at)}
								</span>
							</p>
						{/if}
						{#if data.page.updated_at}
							<p class="info-item">
								<span class="info-label">Last updated:</span>
								<span class="info-value">
									{formatTimestamp(data.page.updated_at)}
								</span>
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Editor -->
		<main class="editor-main">
			<MarkdownEditor
				bind:this={editorRef}
				bind:content
				{saving}
				onSave={handleSave}
				draftKey="page-{slug}"
				configuredCurios={data?.curios ?? []}
			/>
		</main>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog bind:open={showDeleteDialog} title="Delete Page">
	<p>Are you sure you want to delete "{title}"? This cannot be undone.</p>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
	{/snippet}
</Dialog>

<style>
	.edit-page-container {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 8rem);
		min-height: 600px;
	}
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		flex-shrink: 0;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.header-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.back-link {
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
		opacity: 0.8;
	}
	.back-link:hover {
		color: var(--color-primary);
		opacity: 1;
	}
	:global(.dark) .back-link {
		color: #86efac;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.page-header h1 {
		margin: 0;
		font-size: 1.75rem;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.unsaved-badge {
		padding: 0.2rem 0.6rem;
		background: #ffeef0;
		color: #cf222e;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 500;
	}
	:global(.dark) .unsaved-badge {
		background: rgba(248, 81, 73, 0.15);
		color: #ff7b72;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	/* Status badge (non-interactive indicator) */
	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 500;
		user-select: none;
	}
	.status-badge.live {
		background: rgba(16, 185, 129, 0.1);
		color: #065f46;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}
	:global(.dark) .status-badge.live {
		background: rgba(16, 185, 129, 0.12);
		color: #6ee7b7;
		border-color: rgba(16, 185, 129, 0.25);
	}
	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		background: #10b981;
	}

	/* More menu (overflow) */
	.more-menu {
		position: relative;
	}
	.more-menu-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.25rem;
		min-width: 160px;
		padding: 0.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 50;
	}
	:global(.dark) .more-menu-dropdown {
		background: var(--color-bg-secondary);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: calc(var(--border-radius-small) - 2px);
		background: transparent;
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--color-text);
		transition: background 0.15s ease;
	}
	.menu-item:hover {
		background: var(--color-bg-secondary);
	}
	.menu-item.danger {
		color: #dc2626;
	}
	.menu-item.danger:hover {
		background: rgba(220, 38, 38, 0.08);
	}
	:global(.dark) .menu-item.danger {
		color: #f87171;
	}
	:global(.dark) .menu-item.danger:hover {
		background: rgba(248, 113, 113, 0.1);
	}

	/* Editor Layout — vertical flow */
	.editor-layout {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	/* Inline title — big, clean, heading-style */
	.inline-title {
		font-size: 2rem;
		font-weight: 700;
		font-family: var(--font-heading, "Lexend", sans-serif);
		border: none;
		background: transparent;
		width: 100%;
		padding: 0.25rem 0;
		outline: none;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.inline-title::placeholder {
		color: var(--color-text-muted);
		opacity: 0.5;
	}
	.inline-title:focus {
		border-bottom: 2px solid var(--color-primary);
	}

	/* Details strip */
	.details-strip {
		margin: 0.5rem 0 1rem;
	}
	.details-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.15s ease;
		width: 100%;
		text-align: left;
	}
	.details-toggle:hover {
		color: var(--color-primary);
	}
	:global(.details-chevron) {
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}
	:global(.details-chevron.rotated) {
		transform: rotate(90deg);
	}
	.details-label {
		flex-shrink: 0;
	}
	.details-summary {
		color: var(--color-text-subtle);
		font-size: 0.8rem;
		font-weight: 400;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Details fields — responsive grid */
	.details-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--color-border);
		transition: border-color 0.3s ease;
	}
	.field-full {
		grid-column: 1 / -1;
	}

	/* Form fields */
	.form-group {
		margin-bottom: 0;
	}
	.form-group label {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-muted);
		transition: color 0.3s ease;
	}
	.form-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		font-size: 0.9rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		transition:
			border-color 0.2s,
			background-color 0.3s,
			color 0.3s;
	}
	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.form-textarea {
		resize: vertical;
		min-height: 80px;
		font-family: inherit;
	}
	.form-hint {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-text-subtle);
		transition: color 0.3s ease;
	}
	.form-warning {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
		color: #e07030;
		transition: color 0.3s ease;
	}
	.char-count {
		font-size: 0.75rem;
		font-weight: normal;
		color: var(--color-text-subtle);
		margin-left: 0.5rem;
	}
	.char-count.good {
		color: var(--accent-success);
	}
	.char-count.warning {
		color: #e07030;
	}
	.form-input.char-warning {
		border-color: #e07030;
	}

	/* Nav toggle */
	.nav-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		cursor: pointer;
	}
	.nav-toggle input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: var(--color-primary);
		margin-top: 2px;
		flex-shrink: 0;
	}
	.nav-toggle-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.nav-toggle-title {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.nav-toggle-hint {
		font-size: 0.75rem;
		color: var(--color-text-subtle);
	}

	/* Hero fields */
	.hero-fields {
		margin-top: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: var(--border-radius-small);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition:
			background-color 0.3s ease,
			border-color 0.3s ease;
	}
	:global(.dark) .hero-fields {
		background: rgba(30, 41, 59, 0.4);
		border-color: rgba(71, 85, 105, 0.3);
	}
	.hero-fields .form-group {
		margin-bottom: 0;
	}
	.cta-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	/* Lifecycle metadata */
	.metadata-info {
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
		transition: border-color 0.3s;
	}
	.info-item {
		margin: 0.5rem 0;
		font-size: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.info-label {
		color: var(--color-text-subtle);
		transition: color 0.3s;
	}
	.info-value {
		color: var(--color-text-muted);
		font-family: monospace;
		font-size: 0.75rem;
		transition: color 0.3s;
	}

	/* Editor Main */
	.editor-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.details-fields {
			grid-template-columns: 1fr;
		}
		.cta-fields {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 900px) {
		.edit-page-container {
			height: auto;
			min-height: auto;
		}
		.inline-title {
			font-size: 1.5rem;
		}
		.editor-main {
			min-height: 500px;
		}
		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}

	/* Mobile-specific refinements */
	@media (max-width: 600px) {
		.page-header {
			gap: 0.5rem;
			margin-bottom: 1rem;
		}
		.page-header h1 {
			font-size: 1.35rem;
		}
		.inline-title {
			font-size: 1.35rem;
		}
		.header-actions {
			gap: 0.35rem;
		}
		.status-badge {
			font-size: 0.7rem;
			padding: 0.2rem 0.5rem;
		}
		.details-strip {
			margin: 0.25rem 0 0.75rem;
		}
	}
</style>
