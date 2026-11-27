<script lang="ts">
	import { goto, beforeNavigate } from "$app/navigation";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import MarkdownEditor from "@autumnsgrove/lattice/content/editor/MarkdownEditor.svelte";
	import GutterManager from "@autumnsgrove/lattice/content/editor/GutterManager.svelte";
	import EditorRail from "@autumnsgrove/lattice/content/editor/EditorRail.svelte";
	import CdnImagePicker from "@autumnsgrove/lattice/content/editor/CdnImagePicker.svelte";
	import WritingPromptSpark from "@autumnsgrove/lattice/content/editor/WritingPromptSpark.svelte";
	import type { WritingPrompt } from "@autumnsgrove/lattice/content/editor/writing-prompts";
	import Glass from "@autumnsgrove/lattice/ui/components/ui/Glass.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { groveModeStore } from "@autumnsgrove/lattice/ui/stores";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { resolveTermString } from "@autumnsgrove/lattice/ui/utils/grove-term-resolve";
	import { api } from "@autumnsgrove/lattice/utils";
	import {
		navIcons,
		stateIcons,
		actionIcons,
		featureIcons,
		toolIcons,
	} from "@autumnsgrove/prism/icons";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import FiresidePanel from "../FiresidePanel.svelte";
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

	// Page data from admin layout (includes grafts cascade)
	let { data } = $props();

	// Form state
	let title = $state("");
	let slug = $state("");
	let date = $state(new Date().toISOString().split("T")[0]);
	let description = $state("");
	let tagsInput = $state("");
	let font = $state("default");
	let content = $state("");
	let gutterItems = $state<GutterItem[]>([]);
	// DESIGN SESSION: the drawer is wired with fixture state so the surface can be
	// looked at. The beta gate (isBetaDeployment) and the /api/fireside routes come with it.
	let firesideOpen = $state(false);

	function handleFiresideKey(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
			event.preventDefault();
			firesideOpen = !firesideOpen;
			return;
		}
		// Escape closes the fire — bound here, on the window, rather than on a
		// non-interactive element inside the panel.
		if (event.key === "Escape" && firesideOpen) {
			firesideOpen = false;
		}
	}
	let featuredImage = $state("");
	let selectedBlaze = $state<string | null>(null);

	// Icon components must be aliased to a capitalized local before use as a
	// tag — see WritingPromptSpark.svelte for why.
	const SparkIcon = featureIcons.pencilSparkles;
	const PinIcon = actionIcons.pin;
	const MinimizeIcon = actionIcons.minimize;

	// Spark (writing prompt) state — see docs/plans/features/planned/writing-prompts-curio.md
	// for the full design. Attribution is an explicit choice (Pin), never
	// inferred from typing: a writer can type unrelated content past a
	// showing prompt without silently crediting it.
	//
	// There's no "gone forever" state — every hide action (dismiss or
	// minimize) collapses to the small pill rather than removing Spark
	// outright, so it's never a dead end with no way back.
	let sparkMinimized = $state(false); // collapsed to a small pill, reference kept
	let pinnedPrompt = $state<string | null>(null); // committed text -> spark_prompt on save
	let activeSparkPrompt = $state<WritingPrompt | null>(null); // whichever prompt is on screen/last referenced

	// The chooser card only makes sense before anything's been pinned —
	// once pinned it collapses to the reference strip even if the draft is
	// still blank, so pinning always reads as a completed decision.
	// Global opt-out from Arbor > Settings > Features — defaults to on.
	let sparksEnabled = $derived(data.siteSettings?.sparks_enabled !== "false");
	let draftIsBlank = $derived(!title.trim() && !content.trim());
	let showSparkChooser = $derived(
		sparksEnabled && !sparkMinimized && !pinnedPrompt && draftIsBlank,
	);
	let showSparkReference = $derived(!sparkMinimized && !showSparkChooser && !!activeSparkPrompt);
	let showSparkPill = $derived(sparkMinimized && !!activeSparkPrompt);

	function pinSparkPrompt() {
		if (activeSparkPrompt) pinnedPrompt = activeSparkPrompt.text;
	}
	function unpinSparkPrompt() {
		pinnedPrompt = null;
	}

	// Blaze picker — fetched from API to include tenant custom blazes
	let availableBlazes = $state<Array<{ slug: string; label: string; icon: string; color: string }>>(
		[...GLOBAL_BLAZE_DEFAULTS],
	);

	/**
	 * Unique draft key for this "new bloom" session — sessionStorage-scoped so a
	 * tab discard/reload resumes the same draft, but a genuinely new tab or a
	 * fresh visit after saving gets a new id. Previously this was the static
	 * literal "new-bloom", which meant every unsaved new post on this browser
	 * shared one localStorage/TenantDO slot and could silently overwrite
	 * another in-progress draft (issue #1586).
	 */
	function getOrCreateDraftId(): string {
		if (!browser) return "unsaved";
		const key = "grove-new-post-draft-id";
		let id = sessionStorage.getItem(key);
		if (!id) {
			id = crypto.randomUUID();
			sessionStorage.setItem(key, id);
		}
		return id;
	}
	const draftSlug = `new-${getOrCreateDraftId()}`;

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
	let error = $state<string | null>(null);
	let slugManuallyEdited = $state(false);
	let navigatingAfterSave = $state(false);
	let coverPickerOpen = $state(false);

	// Rail — replaces the old details-accordion + toggle-below-editor Vines
	// button with a single docked panel (see docs/plans/features/planned/
	// flow-editor-progressive-details.md for the pattern this supersedes).
	let activeTab = $state<"details" | "vines" | null>(
		browser ? (localStorage.getItem("new-post-rail-tab") as "details" | "vines" | null) : null,
	);
	$effect(() => {
		if (!browser) return;
		if (activeTab) {
			localStorage.setItem("new-post-rail-tab", activeTab);
		} else {
			localStorage.removeItem("new-post-rail-tab");
		}
	});

	// Details badge — count of filled-in fields, shown on the rail without
	// opening the panel
	let detailsHasContent = $derived.by(() => {
		let n = 0;
		if (featuredImage) n++;
		if (description.trim()) n++;
		if (parseTags(tagsInput).length > 0) n++;
		if (slug && slugManuallyEdited) n++;
		if (font && font !== "default") n++;
		if (selectedBlaze) n++;
		return n > 0;
	});

	let vinesWarning = $derived(gutterItems.some((item) => !item.anchor));

	// Auto-generate slug from title
	$effect(() => {
		if (!slugManuallyEdited && title) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.replace(/^-|-$/g, "");
		}
	});

	function handleSlugInput() {
		slugManuallyEdited = true;
	}

	/** Parse tags from comma-separated input */
	function parseTags(input: string) {
		return input
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}

	/**
	 * The page's one write path.
	 *
	 * `handleSave` navigates afterwards; accepting a Fireside draft calls this first and
	 * then records the acceptance against the slug. Both go through it so autosave and
	 * the server agree — #1586's lesson was a write-only sync with no read-back losing
	 * work.
	 */
	async function saveBloom(fireside?: { sessionId: string; transcriptPublic: boolean }) {
		return api.post("/api/blooms", {
			title: title.trim() || "",
			slug: slug.trim() || "",
			date,
			description: description.trim(),
			tags: parseTags(tagsInput),
			font,
			markdown_content: content,
			gutter_content: JSON.stringify(gutterItems),
			fireside_assisted: 0,
			status: "draft",
			featured_image: featuredImage.trim() || null,
			meadow_exclude: 0,
			blaze: selectedBlaze,
			// The attribution rides on the save, so a post that exists because a
			// conversation happened cannot exist without saying so.
			...(fireside ? { fireside } : {}),
		});
	}

	/** Save as draft — zero validation, API handles untitled naming */
	async function handleSave() {
		error = null;
		saving = true;

		try {
			const result = await saveBloom();

			editorRef?.clearDraft();
			if (browser) sessionStorage.removeItem("grove-new-post-draft-id");
			navigatingAfterSave = true;

			toast.success(`Draft saved!`, {
				description: `"${result.title}" has been saved.`,
			});

			goto(`/arbor/garden/edit/${result.slug}`);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			error = errorMessage;
			toast.error(`Failed to save draft`, { description: errorMessage });
		} finally {
			saving = false;
		}
	}

	/**
	 * Accepting a Fireside draft.
	 *
	 * The merge happens here, not in the panel: the page owns the editor's content, the
	 * vine list and the save handler, and a component that wrote them would be a second
	 * writer racing autosave.
	 *
	 * `markdown_content` and `gutter_content` are written together — a draft accepted
	 * without its vines is half accepted (the spec's own words).
	 */
	async function handleAcceptDraft(
		proposal: { title: string; body: string; vines: { anchor: string; text: string }[] },
		merge: "replace" | "top",
		transcriptPublic: boolean,
		sessionId: string,
	) {
		if (merge === "replace") {
			title = proposal.title;
			content = proposal.body;
		} else {
			content = `${proposal.body}\n\n${content}`.trim();
			if (!title.trim()) title = proposal.title;
		}

		gutterItems = [
			...gutterItems,
			...proposal.vines.map((vine) => ({
				type: "comment" as const,
				anchor: vine.anchor,
				content: vine.text,
			})),
		];

		saving = true;
		try {
			// One write: the post, its marker and its link to the conversation, with the
			// transcript choice recorded behind them. This used to be a save followed by
			// `/accept`, and a failed second call left an unattributed post behind.
			const saved = await saveBloom({ sessionId, transcriptPublic });

			editorRef?.clearDraft();
			if (browser) sessionStorage.removeItem("grove-new-post-draft-id");
			navigatingAfterSave = true;
			toast.success("Fireside's draft is in", {
				description: `"${saved.title}" is saved as a draft.`,
			});
			goto(`/arbor/garden/edit/${saved.slug}`);
		} finally {
			saving = false;
		}
	}

	// Flush draft and warn about unsaved changes on page unload
	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (navigatingAfterSave) return;

		// Always flush the draft to localStorage so content survives session expiry
		editorRef?.flushDraft();

		if (content.trim() || title.trim()) {
			e.preventDefault();
			return (e.returnValue = "You have unsaved changes. Are you sure you want to leave?");
		}
	}

	// Guard SvelteKit client-side navigations (beforeunload only covers tab close / hard nav)
	beforeNavigate((navigation) => {
		editorRef?.flushDraft();

		if (navigatingAfterSave) return;

		if (content.trim() || title.trim()) {
			if (!confirm("You have unsaved changes. Leave this page?")) {
				navigation.cancel();
			}
		}
	});

	/** Publish — validates title + content before sending */
	async function handlePublish() {
		if (!title.trim()) {
			if (activeTab !== "details") activeTab = "details";
			error = "Title is required to publish";
			toast.error("Title is required to publish");
			return;
		}
		if (!content.trim()) {
			error = "Content is required to publish";
			toast.error("Content is required to publish");
			return;
		}

		error = null;
		saving = true;

		try {
			const result = await api.post("/api/blooms", {
				title: title.trim(),
				slug: slug.trim() || "",
				date,
				description: description.trim(),
				tags: parseTags(tagsInput),
				font,
				markdown_content: content,
				gutter_content: JSON.stringify(gutterItems),
				fireside_assisted: 0,
				status: "published",
				featured_image: featuredImage.trim() || null,
				meadow_exclude: 0,
				blaze: selectedBlaze,
				spark_prompt: pinnedPrompt,
			});

			editorRef?.clearDraft();
			if (browser) sessionStorage.removeItem("grove-new-post-draft-id");
			navigatingAfterSave = true;

			toast.success(`${resolveTermString("Bloom", "Post")} published!`, {
				description: `"${result.title}" is now live.`,
			});

			goto(`/arbor/garden/edit/${result.slug}`);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			error = errorMessage;
			toast.error(`Failed to publish`, { description: errorMessage });
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onbeforeunload={handleBeforeUnload} onkeydown={handleFiresideKey} />

<div class="new-post-page">
	<header class="page-header">
		<div class="header-content">
			<a href="/arbor/garden" class="back-link"
				><navIcons.arrowLeft size={14} class="inline-block" /> Back to <GroveTerm term="your-garden"
					>Garden</GroveTerm
				></a
			>
			<h1>New <GroveTerm term="blooms">Bloom</GroveTerm></h1>
			<Waystone slug="using-curios-in-content" label="Curio directives" size="sm" />
			{#if !groveModeStore.current}
				<p class="text-sm text-foreground-subtle italic mt-1 mb-0">
					(<GroveTerm term="blooms" displayOverride="grove" icon />)
				</p>
			{/if}
		</div>
		<div class="header-actions">
			<button class="save-draft-btn" onclick={handleSave} disabled={saving}>
				{saving ? "Saving..." : "Save Draft"}
			</button>
			<button class="publish-btn" onclick={handlePublish} disabled={saving}>
				{saving ? "Publishing..." : "Publish"}
			</button>
		</div>
	</header>

	{#if error}
		<Glass
			variant="accent"
			class="bg-destructive/10 border-destructive/30 p-4 rounded-lg mb-4 flex items-center gap-3"
		>
			<stateIcons.alertCircle class="w-5 h-5 text-error shrink-0" />
			<span class="flex-1 text-error">{error}</span>
			<button
				class="text-error hover:text-destructive leading-none"
				onclick={() => (error = null)}
				aria-label="Dismiss error"><stateIcons.x size={16} /></button
			>
		</Glass>
	{/if}

	<div class="editor-layout">
		{#if showSparkChooser}
			<WritingPromptSpark
				onDismiss={() => (sparkMinimized = true)}
				onPin={pinSparkPrompt}
				onPromptChange={(p) => (activeSparkPrompt = p)}
			/>
		{:else if showSparkReference && activeSparkPrompt}
			<div class="spark-reference">
				<SparkIcon class="w-3.5 h-3.5 spark-reference-icon" />
				<div class="spark-reference-body">
					{#if pinnedPrompt}
						<span class="spark-reference-label"
							>Started with <GroveTerm term="sparks">a spark</GroveTerm></span
						>
					{/if}
					<span class="spark-reference-text">"{activeSparkPrompt.text}"</span>
				</div>
				<div class="spark-reference-actions">
					{#if pinnedPrompt}
						<button type="button" class="spark-ref-btn" onclick={unpinSparkPrompt}> Unpin </button>
					{:else}
						<button
							type="button"
							class="spark-ref-btn spark-ref-btn-accent"
							onclick={pinSparkPrompt}
						>
							<PinIcon class="w-3 h-3" />
							Pin this
						</button>
					{/if}
					<button
						type="button"
						class="spark-ref-btn spark-ref-btn-icon"
						onclick={() => (sparkMinimized = true)}
						title="Minimize (find it again via the Spark pill)"
					>
						<MinimizeIcon class="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		{:else if showSparkPill}
			<button
				type="button"
				class="spark-pill"
				onclick={() => (sparkMinimized = false)}
				title="Show writing prompt"
			>
				<SparkIcon class="w-3.5 h-3.5" />
				Spark
			</button>
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
				<div
					class="editor-section"
					class:fireside-open={firesideOpen}
					class:fireside-above={firesideOpen && !!content.trim()}
					class:fireside-closed={!firesideOpen}
				>
					{#if !firesideOpen && data.firesideEnabled}
						<button
							type="button"
							class="fireside-entry"
							onclick={() => (firesideOpen = true)}
							title="Fireside (⌘⇧F)"
						>
							<toolIcons.fireside size={14} />
							<span>{content.trim() ? "Fireside" : "Start with a conversation"}</span>
						</button>
					{/if}
					<FiresidePanel
						bind:open={firesideOpen}
						mode={content.trim() ? "above" : "solo"}
						draftPreview={content}
						hasKey={data.firesideHasKey}
						onclose={() => (firesideOpen = false)}
						onaccept={handleAcceptDraft}
					/>
					<MarkdownEditor
						bind:this={editorRef}
						bind:content
						{saving}
						onSave={handleSave}
						draftKey={draftSlug}
						serverDraftSlug={draftSlug}
						bind:previewTitle={title}
						previewDate={date}
						previewTags={parseTags(tagsInput)}
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
										type="text"
										id="slug"
										bind:value={slug}
										oninput={handleSlugInput}
										placeholder="your-bloom-slug"
										class="form-input slug-input"
									/>
								</div>
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

							<div class="form-group">
								<label for="date">Date</label>
								<input type="date" id="date" bind:value={date} class="form-input" />
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

<!-- Cover image picker -->
<CdnImagePicker
	bind:open={coverPickerOpen}
	onSelect={(url) => (featuredImage = url)}
	title="Select cover image"
/>

<style>
	/* The door to Fireside, above the editor — never in the formatting toolbar,
	   where it would compete with the heading buttons for space. */
	.fireside-entry {
		display: flex;
		position: relative;
		z-index: 1;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4375rem 0.75rem;
		background: var(--color-bg-secondary, #f5f5f5);
		border: 1px solid var(--editor-border, var(--color-border));
		border-bottom: none;
		border-radius: 8px 8px 0 0;
		color: var(--grove-accent);
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
		text-align: left;
		transition: background 120ms ease;
	}

	.fireside-entry:hover {
		background: var(--grove-accent-8);
	}

	/* The editor and whatever sits above it share one frame. */
	.editor-section.fireside-closed :global(.editor-container),
	.editor-section.fireside-above :global(.editor-container) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
	.new-post-page {
		display: flex;
		flex-direction: column;
		/* Was a fixed viewport height, which capped everything below it — the fire
		   could never be taller than the space left over. The page scrolls, so let
		   it grow to whatever the editor and the conversation actually need. */
		min-height: calc(100vh - 8rem);
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
	.page-header h1 {
		margin: 0;
		font-size: 1.75rem;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.save-draft-btn {
		padding: 0.6rem 1.25rem;
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-button);
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			color 0.2s;
	}
	.save-draft-btn:hover:not(:disabled) {
		background: var(--color-bg-secondary);
		border-color: var(--color-primary);
		color: var(--color-text);
	}
	.save-draft-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.publish-btn {
		padding: 0.6rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--border-radius-button);
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
	}
	.publish-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.publish-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Editor Layout — vertical flow, no sidebar */
	.editor-layout {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	/* Spark reference strip — persistent while typing, pinned or not */
	.spark-reference {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		margin: 0.5rem 0 1rem;
		padding: 0.5rem 0.75rem;
		background: color-mix(in srgb, var(--color-primary) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
		border-radius: var(--border-radius-small, 6px);
		font-size: 0.8rem;
	}
	:global(.spark-reference-icon) {
		flex-shrink: 0;
		margin-top: 0.15rem;
		color: var(--color-primary);
	}
	.spark-reference-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem;
	}
	.spark-reference-label {
		color: var(--color-primary);
		font-weight: 600;
	}
	.spark-reference-text {
		color: var(--color-text-subtle);
		font-style: italic;
	}
	.spark-reference-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.spark-ref-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.5rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--border-radius-small, 6px);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-subtle);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.spark-ref-btn:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}
	.spark-ref-btn-accent {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
	}
	.spark-ref-btn-accent:hover {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
		color: var(--color-primary);
	}
	.spark-ref-btn-icon {
		padding: 0.3rem;
	}

	/* Spark pill — minimized state, click to bring the reference back */
	.spark-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		align-self: flex-start;
		margin: 0.5rem 0 1rem;
		padding: 0.3rem 0.65rem;
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		cursor: pointer;
		transition: background-color 0.15s ease;
	}
	.spark-pill:hover {
		background: color-mix(in srgb, var(--color-primary) 18%, transparent);
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
		overflow: hidden;
		transition:
			border-color 0.2s,
			background-color 0.3s;
	}
	.slug-input-wrapper:focus-within {
		border-color: var(--color-primary);
	}
	.slug-prefix {
		padding: 0.5rem 0.5rem 0.5rem 0.75rem;
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		background: var(--color-border);
		transition:
			background-color 0.3s,
			color 0.3s;
	}
	.slug-input {
		border: none;
		background: transparent;
		flex: 1;
	}
	.slug-input:focus {
		outline: none;
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
		color: hsl(var(--warning-foreground));
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
		color: hsl(var(--warning-foreground));
	}
	.form-input.char-warning {
		border-color: hsl(var(--warning-foreground));
	}
	.tags-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}
	.tag-preview {
		padding: 0.2rem 0.6rem;
		background: hsl(var(--success) / 0.7);
		backdrop-filter: blur(4px);
		color: white;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	/* Editor Main */
	.editor-main {
		flex: 1;
		min-width: 0;
		min-height: 0;
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
		min-height: 0;
	}

	/* ── Fireside, inside the editor ──────────────────────────────────────
	   Blank page: the conversation IS the surface, editor hidden underneath
	   (still mounted, so the draft manager never tears down).
	   Words on the page: the fire sits above them and the editor shrinks,
	   joined into one frame with squared shared corners. */
	.editor-section.fireside-open:not(.fireside-above) :global(.editor-container) {
		display: none;
	}

	.editor-section.fireside-above :global(.editor-container) {
		flex: 1;
		height: auto;
		min-height: 0;
		border-top: none;
		border-radius: 0 0 8px 8px;
	}

	.editor-section.fireside-closed :global(.editor-container) {
		border-top: none;
	}

	.field-full {
		grid-column: 1 / -1;
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

	/* Responsive */
	@media (max-width: 900px) {
		.new-post-page {
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
</style>
