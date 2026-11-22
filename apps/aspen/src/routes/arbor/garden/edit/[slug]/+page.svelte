<script lang="ts">
	import { goto, beforeNavigate } from "$app/navigation";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import MarkdownEditor from "@autumnsgrove/lattice/content/editor/MarkdownEditor.svelte";
	import GutterManager from "@autumnsgrove/lattice/content/editor/GutterManager.svelte";
	import EditorRail from "@autumnsgrove/lattice/content/editor/EditorRail.svelte";
	import CdnImagePicker from "@autumnsgrove/lattice/content/editor/CdnImagePicker.svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import Dialog from "@autumnsgrove/lattice/ui/components/ui/Dialog.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { resolveTermString } from "@autumnsgrove/lattice/ui/utils/grove-term-resolve";
	import { api } from "@autumnsgrove/lattice/utils";
	import { clickOutside } from "@autumnsgrove/lattice/actions/clickOutside";
	import { navIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import { Blaze } from "@autumnsgrove/lattice/social/blazes/components";
	import { GLOBAL_BLAZE_DEFAULTS } from "@autumnsgrove/lattice/social/blazes";
	import {
		FONT_PRESETS,
		FONT_CATEGORY_LABELS,
	} from "@autumnsgrove/lattice/platform/config/presets";
	import type { GutterItem } from "@autumnsgrove/grove-markdown";

	// Canonical font list — single source of truth, keeps this select in sync
	// with the fonts actually loaded on the site (libs/engine/.../tokens/fonts.ts)
	const fontCategories = Object.keys(FONT_CATEGORY_LABELS) as Array<
		keyof typeof FONT_CATEGORY_LABELS
	>;

	let { data } = $props();

	// Form state - initialized from loaded data (synced via effect)
	let title = $state("");
	let slug = $state("");
	let description = $state("");
	let tagsInput = $state("");
	let font = $state("default");
	let content = $state("");
	let gutterItems = $state<GutterItem[]>([]);
	let status = $state("draft");
	let featuredImage = $state("");
	let originalSlug = $state("");
	let slugError = $state("");
	let selectedBlaze = $state<string | null>(null);
	let sparkPrompt = $state<string | null>(null);

	// Blaze picker — fetched from API to include tenant custom blazes
	let availableBlazes = $state<Array<{ slug: string; label: string; icon: string; color: string }>>(
		[...GLOBAL_BLAZE_DEFAULTS],
	);

	onMount(async () => {
		try {
			const res = await fetch("/api/blazes"); // csrf-ok — GET-only read
			if (res.ok) {
				const { blazes } = (await res.json()) as { blazes: typeof availableBlazes };
				if (Array.isArray(blazes) && blazes.length > 0) {
					availableBlazes = blazes;
				}
			}
		} catch {
			// Keep GLOBAL_BLAZE_DEFAULTS fallback
		}
	});

	// Sync form state when data changes (e.g., navigating to different post)
	$effect(() => {
		title = data.post.title || "";
		slug = data.post.slug || "";
		originalSlug = data.post.slug || "";
		description = data.post.description || "";
		tagsInput = Array.isArray(data.post.tags) ? data.post.tags.join(", ") : "";
		font = ((data.post as Record<string, unknown>).font as string) || "default";
		content = data.post.markdown_content || "";
		gutterItems = data.post.gutter_content ? JSON.parse(data.post.gutter_content as string) : [];
		status = ((data.post as Record<string, unknown>).status as string) || "draft";
		featuredImage = ((data.post as Record<string, unknown>).featured_image as string) || "";
		selectedBlaze = ((data.post as Record<string, unknown>).blaze as string) || null;
		sparkPrompt = ((data.post as Record<string, unknown>).spark_prompt as string) || null;
	});

	// Editor reference for anchor insertion
	interface EditorRef {
		clearDraft(): void;
		flushDraft(): void;
		getAvailableAnchors?(): string[];
		getAvailableParagraphs?(): { index: number; preview: string }[];
		insertAnchor?(name: string): void;
	}
	let editorRef = $state<EditorRef | null>(null);

	// UI state
	let saving = $state(false);
	let hasUnsavedChanges = $state(false);
	let showDeleteDialog = $state(false);
	let showRepublishDialog = $state(false);
	let showMoreMenu = $state(false);
	let coverPickerOpen = $state(false);

	// Rail — replaces the old details-accordion + toggle-below-editor Vines
	// button with a single docked panel (see docs/plans/features/planned/
	// flow-editor-progressive-details.md for the pattern this supersedes).
	let activeTab = $state<"details" | "vines" | null>(
		browser ? (localStorage.getItem("editor-rail-tab") as "details" | "vines" | null) : null,
	);
	$effect(() => {
		if (!browser) return;
		if (activeTab) {
			localStorage.setItem("editor-rail-tab", activeTab);
		} else {
			localStorage.removeItem("editor-rail-tab");
		}
	});

	// Details badge — count of filled-in fields, shown on the rail without
	// opening the panel
	let detailsHasContent = $derived.by(() => {
		let n = 0;
		if (featuredImage) n++;
		if (description.trim()) n++;
		if (parseTags(tagsInput).length > 0) n++;
		if (font && font !== "default") n++;
		if (selectedBlaze) n++;
		return n > 0;
	});

	let vinesWarning = $derived(gutterItems.some((item) => !item.anchor));

	// Track changes
	$effect(() => {
		const hasChanges =
			title !== data.post.title ||
			description !== data.post.description ||
			content !== data.post.markdown_content;
		hasUnsavedChanges = hasChanges;
	});

	function parseTags(input: string) {
		return input
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}

	function validateSlug(value: string) {
		if (!value) {
			slugError = "Slug is required";
			return;
		}
		const slugPattern = /^[a-z0-9-]+$/;
		if (!slugPattern.test(value)) {
			slugError = "Only lowercase letters, numbers, and hyphens";
			return;
		}
		slugError = "";
	}

	/** Save — for drafts, zero validation; for published, title + content required */
	async function handleSave() {
		if (status === "published") {
			if (!title.trim()) {
				toast.error("Title is required for published posts");
				return;
			}
			if (!content.trim()) {
				toast.error("Content is required for published posts");
				return;
			}
		}

		if (slugError) {
			toast.error("Please fix the slug error");
			return;
		}

		saving = true;

		try {
			const saveSlug = originalSlug; // Use original slug for the URL
			await api.put(`/api/blooms/${saveSlug}`, {
				title: title.trim() || "",
				description: description.trim(),
				tags: parseTags(tagsInput),
				font,
				markdown_content: content,
				gutter_content: JSON.stringify(gutterItems),
				status,
				featured_image: featuredImage.trim() || null,
				meadow_exclude: 0,
				slug: slug !== originalSlug ? slug : undefined,
				blaze: selectedBlaze,
				spark_prompt: sparkPrompt,
			});

			editorRef?.clearDraft();
			toast.success(`${resolveTermString("Bloom", "Post")} saved successfully!`);
			hasUnsavedChanges = false;

			// If slug changed, navigate to the new URL
			if (slug !== originalSlug) {
				originalSlug = slug;
				await goto(`/arbor/garden/edit/${slug}`, { replaceState: true });
			}
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: `Failed to update ${resolveTermString("bloom", "post")}`,
			);
		} finally {
			saving = false;
		}
	}

	/**
	 * Toggle publish status and immediately save
	 * Publishing/unpublishing is a critical action that should persist immediately
	 */
	async function handleStatusToggle() {
		const newStatus = status === "published" ? "draft" : "published";

		// Validation before publish
		if (newStatus === "published") {
			if (!title.trim()) {
				if (activeTab !== "details") activeTab = "details";
				toast.error("Title is required before publishing");
				return;
			}
			if (!content.trim()) {
				toast.error("Content is required before publishing");
				return;
			}
		}

		saving = true;
		status = newStatus; // Optimistically update UI

		try {
			const saveSlug = originalSlug;
			await api.put(`/api/blooms/${saveSlug}`, {
				title: title.trim() || "",
				description: description.trim(),
				tags: parseTags(tagsInput),
				font,
				markdown_content: content,
				gutter_content: JSON.stringify(gutterItems),
				status: newStatus,
				featured_image: featuredImage.trim() || null,
				meadow_exclude: 0,
				slug: slug !== originalSlug ? slug : undefined,
				blaze: selectedBlaze,
				spark_prompt: sparkPrompt,
			});

			editorRef?.clearDraft();

			if (newStatus === "published") {
				toast.success(`${resolveTermString("Bloom", "Post")} published!`, {
					description: `Your ${resolveTermString("bloom", "post")} is now live.`,
				});
			} else {
				toast.success(`${resolveTermString("Bloom", "Post")} unpublished`, {
					description: "Moved back to drafts.",
				});
			}
			hasUnsavedChanges = false;

			// If slug changed, navigate to the new URL
			if (slug !== originalSlug) {
				originalSlug = slug;
				await goto(`/arbor/garden/edit/${slug}`, { replaceState: true });
			}
		} catch (err) {
			// Revert on failure
			status = status === "published" ? "draft" : "published";
			toast.error(
				err instanceof Error
					? err.message
					: `Failed to ${newStatus === "published" ? "publish" : "unpublish"}`,
			);
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		showDeleteDialog = true;
	}

	async function handleDelete() {
		showDeleteDialog = false;
		saving = true;

		try {
			await api.delete(`/api/blooms/${slug}`);
			toast.success(`${resolveTermString("Bloom", "Post")} deleted successfully`);
			goto("/arbor/garden");
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: `Failed to delete ${resolveTermString("bloom", "post")}`,
			);
		} finally {
			saving = false;
		}
	}

	/** Format a Unix timestamp (seconds or ms) to a human-readable locale string */
	function formatTimestamp(val: number | string | null | undefined) {
		if (!val) return "";
		const ms = typeof val === "number" && val < 1e12 ? val * 1000 : Number(val);
		return new Date(ms).toLocaleString();
	}

	async function handleRepublish() {
		showRepublishDialog = false;
		saving = true;

		try {
			const saveSlug = originalSlug;
			await api.put(`/api/blooms/${saveSlug}`, {
				title: title.trim() || "",
				description: description.trim(),
				tags: parseTags(tagsInput),
				font,
				markdown_content: content,
				gutter_content: JSON.stringify(gutterItems),
				status,
				featured_image: featuredImage.trim() || null,
				meadow_exclude: 0,
				slug: slug !== originalSlug ? slug : undefined,
				blaze: selectedBlaze,
				spark_prompt: sparkPrompt,
				republish: true,
			});

			editorRef?.clearDraft();
			toast.success(`${resolveTermString("Bloom", "Post")} re-published!`, {
				description: "Timestamp bumped — it will appear fresh in feeds.",
			});
			hasUnsavedChanges = false;
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: `Failed to re-publish ${resolveTermString("bloom", "post")}`,
			);
		} finally {
			saving = false;
		}
	}

	async function handleRefreshLiveVersion() {
		showMoreMenu = false;
		saving = true;

		try {
			const response = await api.post(`/api/blooms/${originalSlug}/refresh`, {});
			const result = response as {
				success: boolean;
				kvCacheCleared: boolean;
				cdnCachePurged: boolean;
				message: string;
			};

			if (result.success) {
				toast.success("Live version refreshed!", {
					description: result.message,
				});
			} else {
				toast.error("Failed to refresh live version");
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to refresh live version");
		} finally {
			saving = false;
		}
	}

	// Flush draft and warn about unsaved changes on page unload
	function handleBeforeUnload(e: BeforeUnloadEvent) {
		// Always flush the draft to localStorage so content survives session expiry
		editorRef?.flushDraft();

		if (hasUnsavedChanges) {
			e.preventDefault();
			return (e.returnValue = "You have unsaved changes. Are you sure you want to leave?");
		}
	}

	// Guard SvelteKit client-side navigations (beforeunload only covers tab close / hard nav)
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

<div class="edit-post-page">
	<header class="page-header">
		<div class="header-content">
			<a href="/arbor/garden" class="back-link"
				><navIcons.arrowLeft size={14} class="inline-block" /> Back to <GroveTerm term="your-garden"
					>Garden</GroveTerm
				></a
			>
			<div class="title-row">
				<h1>Edit <GroveTerm term="blooms">Bloom</GroveTerm></h1>
				<Waystone slug="using-curios-in-content" label="Curio directives" size="sm" />
				{#if hasUnsavedChanges}
					<span class="unsaved-badge">Unsaved changes</span>
				{/if}
			</div>
		</div>
		<div class="header-actions">
			<!-- Status indicator (non-interactive) -->
			<span class="status-badge {status}">
				{#if status === "published"}
					<span class="status-dot published"></span> Published
				{:else}
					<span class="status-dot draft"></span> Draft
				{/if}
			</span>

			<!-- View Live (icon-only, only when published) -->
			{#if status === "published"}
				<Button variant="ghost" size="icon" href="/garden/{slug}" title="View live post">
					<navIcons.external size={16} />
				</Button>
			{/if}

			<!-- More menu (contains Delete) -->
			<div class="more-menu">
				<Button
					variant="ghost"
					size="icon"
					onclick={() => (showMoreMenu = !showMoreMenu)}
					title="More actions"
					aria-expanded={showMoreMenu}
					aria-haspopup="true"
				>
					<actionIcons.ellipsis size={16} />
				</Button>
				{#if showMoreMenu}
					<div
						class="more-menu-dropdown"
						role="menu"
						use:clickOutside={() => (showMoreMenu = false)}
					>
						{#if status === "published"}
							<button
								class="menu-item"
								role="menuitem"
								onclick={() => {
									showMoreMenu = false;
									showRepublishDialog = true;
								}}
							>
								<actionIcons.refresh size={14} />
								Re-publish (bump in feeds)
							</button>
							<button
								class="menu-item"
								role="menuitem"
								onclick={handleRefreshLiveVersion}
								disabled={saving}
							>
								<actionIcons.refresh size={14} />
								Refresh live version
							</button>
						{/if}
						<button
							class="menu-item danger"
							role="menuitem"
							onclick={() => {
								showMoreMenu = false;
								confirmDelete();
							}}
						>
							<actionIcons.trash size={14} />
							Delete {resolveTermString("Bloom", "Post")}
						</button>
					</div>
				{/if}
			</div>

			<!-- Publish / Unpublish -->
			{#if status === "draft"}
				<Button variant="outline" onclick={handleStatusToggle} disabled={saving}>
					{saving ? "Publishing..." : "Publish"}
				</Button>
			{:else}
				<Button variant="ghost" onclick={handleStatusToggle} disabled={saving}>
					{saving ? "Unpublishing..." : "Unpublish"}
				</Button>
			{/if}

			<!-- Save (primary action, always rightmost) -->
			<Button onclick={handleSave} disabled={saving}>
				{saving ? "Saving..." : "Save"}
			</Button>
		</div>
	</header>

	<div class="editor-layout">
		{#if sparkPrompt}
			<div class="spark-attribution">
				<span class="spark-attribution-label">Started with a spark</span>
				<span class="spark-attribution-text">"{sparkPrompt}"</span>
			</div>
		{/if}

		<!-- Inline title -->
		<input
			type="text"
			class="inline-title"
			bind:value={title}
			placeholder="Untitled"
			aria-label="Post title"
		/>

		<!-- Editor -->
		<main class="editor-main">
			<div class="editor-with-gutter">
				<div class="editor-section">
					<MarkdownEditor
						bind:this={editorRef}
						bind:content
						{saving}
						onSave={handleSave}
						draftKey={`edit-${slug}`}
						serverDraftSlug={`edit-${slug}`}
						previewTitle={title}
						previewTags={parseTags(tagsInput)}
						{gutterItems}
						flags={data?.flags ?? {}}
						configuredCurios={data?.curios ?? []}
						uploadAccessUrl={data.uploadAccessUrl ?? null}
					/>
				</div>

				<EditorRail
					bind:activeTab
					detailsBadge={detailsHasContent}
					vinesCount={gutterItems.length}
					{vinesWarning}
				>
					{#snippet detailsPanel()}
						<div class="details-fields">
							<div class="form-group field-description">
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
									placeholder="A brief summary of your bloom (120-160 chars for SEO)..."
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

							<div class="form-group field-cover">
								<span id="featured-image-label" class="label">Cover Image</span>
								{#if featuredImage}
									<button
										type="button"
										class="cover-thumb"
										onclick={() => (coverPickerOpen = true)}
										aria-labelledby="featured-image-label"
									>
										<img src={featuredImage} alt="Cover preview" loading="lazy" decoding="async" />
										<span class="cover-thumb-overlay">Change</span>
									</button>
								{:else}
									<button
										type="button"
										class="cover-empty"
										onclick={() => (coverPickerOpen = true)}
										aria-labelledby="featured-image-label"
									>
										<actionIcons.imageIcon size={20} />
										<span>Choose a cover image</span>
									</button>
								{/if}
								<span class="form-hint">
									<a href="/arbor/images" target="_blank"
										>Upload more in Images <navIcons.arrowRight size={12} class="inline-block" /></a
									>
								</span>
							</div>

							<div class="form-group">
								<label for="tags">Tags</label>
								<input
									type="text"
									id="tags"
									bind:value={tagsInput}
									placeholder="tag1, tag2, tag3"
									class="form-input"
								/>
								<span class="form-hint">Separate tags with commas</span>
								{#if tagsInput}
									<div class="tags-preview">
										{#each parseTags(tagsInput) as tag}
											<span class="tag-preview">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>

							<div class="form-group">
								<label for="slug">Slug</label>
								<div class="slug-input-wrapper">
									<span class="slug-prefix">/garden/</span>
									<input
										id="slug"
										type="text"
										bind:value={slug}
										oninput={() => validateSlug(slug)}
										class="slug-input"
										placeholder="my-post-slug"
									/>
								</div>
								{#if slugError}
									<span class="form-hint form-error">{slugError}</span>
								{:else if slug !== originalSlug}
									<span class="form-hint slug-changed"
										>URL will change from <code>/{originalSlug}</code> to <code>/{slug}</code></span
									>
								{:else}
									<span class="form-hint">Lowercase letters, numbers, and hyphens only</span>
								{/if}
							</div>

							<div class="form-group">
								<label for="font">Font</label>
								<select id="font" bind:value={font} class="form-input">
									<option value="default">Default (Site Setting)</option>
									{#each fontCategories as category (category)}
										<optgroup label={FONT_CATEGORY_LABELS[category]}>
											{#each FONT_PRESETS.filter((f) => f.category === category) as preset (preset.id)}
												<option value={preset.id}>{preset.name}</option>
											{/each}
										</optgroup>
									{/each}
								</select>
								<span class="form-hint">Choose a font for this bloom's content</span>
							</div>

							<div class="form-group field-full">
								<span id="blaze-label" class="label">Blaze</span>
								<span class="form-hint" style="margin-top: 0; margin-bottom: 0.5rem;"
									>A small marker that tells readers what this post is about.</span
								>
								<div class="blaze-picker" role="group" aria-labelledby="blaze-label">
									{#each availableBlazes as blazeDef}
										<button
											type="button"
											class="blaze-option"
											class:selected={selectedBlaze === blazeDef.slug}
											aria-label="{blazeDef.label} blaze{selectedBlaze === blazeDef.slug
												? ' (selected)'
												: ''}"
											aria-pressed={selectedBlaze === blazeDef.slug}
											onclick={() => {
												selectedBlaze = selectedBlaze === blazeDef.slug ? null : blazeDef.slug;
											}}
										>
											<Blaze definition={blazeDef} />
										</button>
									{/each}
								</div>
							</div>

							<!-- Lifecycle metadata -->
							<div class="metadata-info field-full">
								{#if "created_at" in data.post && data.post.created_at}
									<p class="info-item">
										<span class="info-label">Created:</span>
										<span class="info-value">
											{formatTimestamp(
												(data.post as Record<string, unknown>).created_at as number | string | null,
											)}
										</span>
									</p>
								{/if}
								{#if "published_at" in data.post && data.post.published_at}
									<p class="info-item">
										<span class="info-label">Published:</span>
										<span class="info-value">
											{formatTimestamp(
												(data.post as Record<string, unknown>).published_at as number | string | null,
											)}
										</span>
									</p>
								{/if}
								{#if "updated_at" in data.post && data.post.updated_at}
									<p class="info-item">
										<span class="info-label">Last updated:</span>
										<span class="info-value">
											{formatTimestamp(
												(data.post as Record<string, unknown>).updated_at as number | string | null,
											)}
										</span>
									</p>
								{/if}
								{#if "last_synced" in data.post && data.post.last_synced}
									<p class="info-item">
										<span class="info-label">Last synced:</span>
										<span class="info-value">
											{new Date(
												(data.post as Record<string, unknown>).last_synced as string | number,
											).toLocaleString()}
										</span>
									</p>
								{/if}
							</div>
						</div>
					{/snippet}

					{#snippet vinesPanel()}
						<GutterManager
							bind:gutterItems
							availableAnchors={editorRef?.getAvailableAnchors?.() || []}
							availableParagraphs={editorRef?.getAvailableParagraphs?.() || []}
							onInsertAnchor={(name: string) => editorRef?.insertAnchor?.(name)}
						/>
					{/snippet}
				</EditorRail>
			</div>
		</main>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog bind:open={showDeleteDialog} title={`Delete ${resolveTermString("Bloom", "Post")}`}>
	<p>Are you sure you want to delete "{title}"? This cannot be undone.</p>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
	{/snippet}
</Dialog>

<!-- Re-publish Confirmation Dialog -->
<Dialog bind:open={showRepublishDialog} title={`Re-publish ${resolveTermString("Bloom", "Post")}`}>
	<p>
		This will update the publish date to right now, bumping "{title}" to the top of RSS feeds.
	</p>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showRepublishDialog = false)}>Cancel</Button>
		<Button onclick={handleRepublish}>Re-publish</Button>
	{/snippet}
</Dialog>

<!-- Cover image picker -->
<CdnImagePicker
	bind:open={coverPickerOpen}
	onSelect={(url) => (featuredImage = url)}
	title="Select cover image"
/>

<style>
	.edit-post-page {
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
		color: var(--grove-accent);
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
	.status-badge.draft {
		background: rgba(245, 158, 11, 0.1);
		color: #92400e;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
	.status-badge.published {
		background: rgba(16, 185, 129, 0.1); /* accent-ok: published status indicator */
		color: #065f46;
		border: 1px solid rgba(16, 185, 129, 0.3); /* accent-ok: published status indicator */
	}
	:global(.dark) .status-badge.draft {
		background: rgba(251, 191, 36, 0.12);
		color: #fcd34d;
		border-color: rgba(251, 191, 36, 0.25);
	}
	:global(.dark) .status-badge.published {
		background: rgba(16, 185, 129, 0.12); /* accent-ok: published status indicator */
		color: #6ee7b7;
		border-color: rgba(16, 185, 129, 0.25); /* accent-ok: published status indicator */
	}
	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.status-dot.draft {
		background: #f59e0b;
	}
	.status-dot.published {
		background: var(--grove-accent);
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
		min-width: 180px;
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

	/* Editor Layout — vertical flow, no sidebar */
	.editor-layout {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	/* Spark attribution — quiet record of the prompt that started this draft */
	.spark-attribution {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.5rem 0 1rem;
		font-size: 0.8rem;
	}
	.spark-attribution-label {
		color: var(--color-primary);
		font-weight: 600;
	}
	.spark-attribution-text {
		color: var(--color-text-subtle);
		font-style: italic;
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

	/* Details panel fields — single column, lives inside EditorRail's ~340px panel */
	.details-fields {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.cover-thumb,
	.cover-empty {
		position: relative;
		width: 100%;
		border-radius: var(--border-radius-small);
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		cursor: pointer;
		padding: 0;
		overflow: hidden;
		transition: border-color 0.15s ease;
	}
	.cover-thumb:hover,
	.cover-empty:hover {
		border-color: var(--color-primary);
	}
	.cover-thumb {
		height: 120px;
	}
	.cover-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cover-thumb-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.45);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 500;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.cover-thumb:hover .cover-thumb-overlay,
	.cover-thumb:focus-visible .cover-thumb-overlay {
		opacity: 1;
	}
	.cover-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: 100px;
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		border-style: dashed;
	}

	/* Form fields (shared) */
	.form-group {
		margin-bottom: 0;
	}
	.form-group label,
	.form-group .label {
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
	.slug-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		transition:
			background-color 0.3s,
			border-color 0.3s;
		overflow: hidden;
	}
	.slug-input-wrapper:focus-within {
		border-color: var(--user-accent, var(--color-primary));
	}
	.slug-prefix {
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		padding-left: 0.75rem;
		flex-shrink: 0;
		transition: color 0.3s;
	}
	.slug-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--color-text);
		font-family: monospace;
		font-size: 0.85rem;
		padding: 0.5rem 0.75rem 0.5rem 0.25rem;
		outline: none;
		min-width: 0;
	}
	.form-error {
		color: var(--color-danger, #ef4444) !important;
	}
	.slug-changed {
		color: var(--color-info, #3b82f6) !important;
	}
	.slug-changed code {
		font-size: 0.7rem;
		background: var(--color-bg-secondary);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
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
	.tags-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}
	.tag-preview {
		padding: 0.2rem 0.6rem;
		background: var(--grove-accent-70);
		backdrop-filter: blur(4px);
		color: white;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
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
	.editor-with-gutter {
		display: flex;
		gap: 0.75rem;
		flex: 1;
		min-height: 0;
		align-items: stretch;
	}
	.editor-section {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.edit-post-page {
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

	/* Blaze picker */
	.blaze-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.blaze-option {
		border: 2px solid transparent;
		border-radius: 999px;
		background: transparent;
		cursor: pointer;
		padding: 2px;
		opacity: 0.5;
		transition:
			opacity 0.15s ease,
			border-color 0.15s ease;
		min-height: 32px;
	}
	.blaze-option:hover {
		opacity: 0.8;
	}
	.blaze-option.selected {
		opacity: 1;
		border-color: var(--color-primary);
	}
	.blaze-option:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-primary);
		border-radius: 999px;
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
		.toggle-vines-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.75rem;
		}
	}
</style>
