<script lang="ts">
	import { tick, untrack } from "svelte";
	import { MAX_GALLERY_IMAGES, type GalleryItem } from "@autumnsgrove/grove-markdown/directives";
	import { stateIcons, navIcons, featureIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import PostCarousel from "$lib/ui/components/gallery/PostCarousel.svelte";
	import PhotoPicker from "./PhotoPicker.svelte";

	/**
	 * GalleryBuilder - arrange a gallery and describe its photos, no syntax needed
	 *
	 * Opens with the photos someone just picked (or an existing gallery they
	 * want to change). They reorder, remove, add more, and write alt text and
	 * captions in plain fields, with a live preview of the carousel readers will
	 * get. Saving hands the finished list back; the editor turns it into the
	 * ::gallery block, so nobody has to know that syntax exists.
	 *
	 * @prop {GalleryItem[]} items - the photos to start with
	 * @prop {"new" | "edit"} mode - only changes the wording (Insert vs Save)
	 * @prop {boolean} photoLibraryEnabled - whether "Add photos" can browse the library
	 * @prop {boolean} startWithPicker - open the photo picker right away (when starting empty)
	 * @prop {(items: GalleryItem[]) => void} onSave - called with the finished gallery
	 * @prop {() => void} onClose - called on Cancel or Escape; nothing is saved
	 */
	interface Props {
		items: GalleryItem[];
		mode?: "new" | "edit";
		photoLibraryEnabled?: boolean;
		startWithPicker?: boolean;
		onSave: (items: GalleryItem[]) => void;
		onClose: () => void;
	}

	let {
		items,
		mode = "new",
		photoLibraryEnabled = false,
		startWithPicker = false,
		onSave,
		onClose,
	}: Props = $props();

	/** A photo in the list, with a stable id so keyed rows (and focus) survive reordering. */
	interface Row extends GalleryItem {
		id: number;
	}

	let nextId = 0;
	const toRows = (list: GalleryItem[]): Row[] => list.map((item) => ({ ...item, id: nextId++ }));

	// The prop is only the starting point; from here the builder owns the list
	let rows = $state<Row[]>(untrack(() => toRows(items)));
	let picking = $state(untrack(() => startWithPicker && items.length === 0));
	let announcement = $state("");
	let panelRef: HTMLDivElement | null = $state(null);

	let isFull = $derived(rows.length >= MAX_GALLERY_IMAGES);
	let previewImages = $derived(rows.map(({ url, alt, caption }) => ({ url, alt, caption })));

	function announce(message: string) {
		announcement = message;
		setTimeout(() => {
			announcement = "";
		}, 1500);
	}

	async function move(index: number, delta: -1 | 1) {
		const target = index + delta;
		if (target < 0 || target >= rows.length) return;

		const next = [...rows];
		[next[index], next[target]] = [next[target], next[index]];
		rows = next;
		announce(`Photo moved to position ${target + 1} of ${rows.length}`);

		// Keep keyboard focus on the button that was just used. At either end
		// that button disables, so fall back to the opposite one.
		await tick();
		const id = next[target].id;
		const used = delta < 0 ? "up" : "down";
		const other = delta < 0 ? "down" : "up";
		const find = (dir: string) =>
			panelRef?.querySelector<HTMLButtonElement>(`[data-move-${dir}="${id}"]`);
		const button = find(used)?.disabled ? find(other) : find(used);
		button?.focus();
	}

	async function remove(index: number) {
		rows = rows.filter((_, i) => i !== index);
		announce(`Photo removed. ${rows.length} left.`);
		await tick();
		const remaining = panelRef?.querySelectorAll<HTMLButtonElement>("[data-remove]");
		(
			remaining?.[Math.min(index, remaining.length - 1)] ??
			panelRef?.querySelector<HTMLElement>("[data-add]")
		)?.focus();
	}

	/**
	 * Close the picker and take focus back. The picker is removed while it holds
	 * focus, which would drop it onto the page body, where Escape no longer
	 * reaches this dialog. Land on the first newly added photo's description
	 * (the next thing to fill in), or on Add photos if nothing was added.
	 */
	async function closePicker(focusPhotoId?: number) {
		picking = false;
		await tick();
		const add = panelRef?.querySelector<HTMLButtonElement>("[data-add]");
		const target =
			focusPhotoId !== undefined
				? panelRef?.querySelector<HTMLElement>(`#alt-${focusPhotoId}`)
				: add && !add.disabled
					? add
					: panelRef?.querySelector<HTMLElement>(".builder-alt");
		target?.focus();
	}

	function addPhotos(urls: string[]) {
		const room = MAX_GALLERY_IMAGES - rows.length;
		const added = toRows(
			urls.slice(0, Math.max(0, room)).map((url) => ({ url, alt: "", caption: "" })),
		);
		rows = [...rows, ...added];
		announce(
			added.length < urls.length
				? `Added ${added.length}. A gallery holds up to ${MAX_GALLERY_IMAGES} photos.`
				: `Added ${added.length} photo${added.length === 1 ? "" : "s"}.`,
		);
		closePicker(added[0]?.id);
	}

	function save() {
		if (rows.length === 0) return;
		onSave(rows.map(({ url, alt, caption }) => ({ url, alt, caption })));
	}

	// Start on the first thing to fill in
	$effect(() => {
		untrack(() => {
			const first =
				panelRef?.querySelector<HTMLElement>(".builder-alt") ??
				panelRef?.querySelector<HTMLElement>("[data-add]");
			first?.focus();
		});
	});

	// Keep Tab cycling inside the dialog
	$effect(() => {
		if (!panelRef) return;
		const panel = panelRef;

		function trapFocus(e: KeyboardEvent) {
			if (e.key !== "Tab") return;
			const focusable = panel.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}

		panel.addEventListener("keydown", trapFocus);
		return () => panel.removeEventListener("keydown", trapFocus);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.stopPropagation();
			onClose();
		}
	}
</script>

<!--
	No backdrop-click-to-close here, unlike the photo picker: this dialog holds
	typed-in descriptions, and a stray click shouldn't throw them away.
-->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="gallery-builder-backdrop" onkeydown={handleKeydown}>
	<div
		class="gallery-builder-panel"
		bind:this={panelRef}
		role="dialog"
		aria-modal="true"
		aria-labelledby="gallery-builder-title"
	>
		<GlassCard variant="frosted">
			<div class="builder-card">
				<div aria-live="polite" aria-atomic="true" class="sr-only">{announcement}</div>

				<div class="builder-header">
					<div id="gallery-builder-title" class="builder-title">
						<featureIcons.images class="w-[18px] h-[18px]" />
						<span>{mode === "edit" ? "Edit your gallery" : "Build your gallery"}</span>
					</div>
					<button
						type="button"
						class="builder-close"
						onclick={onClose}
						aria-label="Close gallery builder"
					>
						<stateIcons.x class="w-[18px] h-[18px]" />
					</button>
				</div>

				<p class="builder-intro">
					Photos swipe in this order. Describe each one in a few words so everyone can enjoy it,
					including people using a screen reader. Captions show under the photo.
				</p>

				<div class="builder-body">
					{#if rows.length === 0}
						<p class="builder-empty">No photos yet. Add some to get started.</p>
					{:else}
						<ol class="builder-list">
							{#each rows as row, i (row.id)}
								<li class="builder-row">
									<span class="builder-number" aria-hidden="true">{i + 1}</span>
									<img class="builder-thumb" src={row.url} alt="" loading="lazy" />

									<div class="builder-fields">
										<label class="builder-label" for="alt-{row.id}">Describe photo {i + 1}</label>
										<input
											id="alt-{row.id}"
											class="builder-input builder-alt"
											type="text"
											placeholder="e.g. Sunlight on a mossy forest path"
											bind:value={row.alt}
										/>
										<label class="builder-label" for="caption-{row.id}">Caption (optional)</label>
										<input
											id="caption-{row.id}"
											class="builder-input"
											type="text"
											placeholder="Shown under the photo"
											bind:value={row.caption}
										/>
									</div>

									<div class="builder-controls">
										<button
											type="button"
											class="builder-icon-btn"
											data-move-up={row.id}
											onclick={() => move(i, -1)}
											disabled={i === 0}
											aria-label="Move photo {i + 1} up"
										>
											<navIcons.chevronUp class="w-4 h-4" />
										</button>
										<button
											type="button"
											class="builder-icon-btn"
											data-move-down={row.id}
											onclick={() => move(i, 1)}
											disabled={i === rows.length - 1}
											aria-label="Move photo {i + 1} down"
										>
											<navIcons.chevronDown class="w-4 h-4" />
										</button>
										<button
											type="button"
											class="builder-icon-btn builder-remove"
											data-remove={row.id}
											onclick={() => remove(i)}
											aria-label="Remove photo {i + 1}"
										>
											<actionIcons.trash class="w-4 h-4" />
										</button>
									</div>
								</li>
							{/each}
						</ol>
					{/if}

					<div class="builder-preview">
						<h3 class="builder-preview-title">Preview</h3>
						{#if rows.length >= 2}
							<div
								class="grove-gallery builder-preview-frame"
								data-images={rows.length}
								data-gallery-mounted="true"
							>
								<PostCarousel images={previewImages} />
							</div>
						{:else}
							<p class="builder-hint">Add at least two photos to see it swipe.</p>
						{/if}
					</div>
				</div>

				<div class="builder-footer">
					<div class="builder-footer-left">
						<button
							type="button"
							class="builder-add"
							data-add
							onclick={() => (picking = true)}
							disabled={isFull}
						>
							<actionIcons.plus class="w-4 h-4" />
							<span>Add photos</span>
						</button>
						<span class="builder-count">
							{#if isFull}
								Full: {rows.length} of {MAX_GALLERY_IMAGES} photos
							{:else}
								{rows.length} of {MAX_GALLERY_IMAGES} photos
							{/if}
						</span>
					</div>
					<div class="builder-actions">
						<button type="button" class="builder-cancel" onclick={onClose}>Cancel</button>
						<button type="button" class="builder-save" onclick={save} disabled={rows.length === 0}>
							{mode === "edit" ? "Save changes" : "Insert gallery"}
						</button>
					</div>
				</div>
			</div>
		</GlassCard>
	</div>
</div>

<!-- A sibling, not a child: the frosted card above would trap its fixed positioning -->
{#if picking}
	<PhotoPicker
		onInsert={addPhotos}
		onClose={() => closePicker()}
		galleryEnabled={photoLibraryEnabled}
	/>
{/if}

<style>
	.gallery-builder-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.15s ease;
	}

	.gallery-builder-panel {
		width: 90%;
		max-width: 720px;
		max-height: 88vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.2s ease;
		outline: none;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-builder-backdrop,
		.gallery-builder-panel {
			animation: none;
		}
	}

	.builder-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.75rem;
	}

	.builder-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.builder-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: none;
		border-radius: 6px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.builder-intro {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	/* A flex column, so the header and footer take the height they need (it varies:
	   the intro and footer wrap on a phone) and the photo list scrolls in between.
	   The 3.5rem leaves room for the glass card's own padding. */
	.builder-card {
		display: flex;
		flex-direction: column;
		min-height: 0;
		max-height: calc(88vh - 3.5rem);
		max-height: calc(88dvh - 3.5rem);
	}

	.builder-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	.builder-empty,
	.builder-hint {
		margin: 0.5rem 0;
		font-size: 0.85rem;
		color: var(--color-text-subtle);
		font-style: italic;
	}

	.builder-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.builder-row {
		display: grid;
		grid-template-columns: auto 5rem 1fr auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--grove-overlay-8);
	}

	.builder-number {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
		padding-top: 0.25rem;
		min-width: 1rem;
	}

	.builder-thumb {
		width: 5rem;
		height: 5rem;
		object-fit: cover;
		border-radius: 6px;
		background: var(--grove-overlay-12);
	}

	.builder-fields {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.builder-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.builder-input {
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.65rem;
		font-size: 0.85rem;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}

	.builder-input::placeholder {
		color: var(--color-text-subtle);
	}

	.builder-controls {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.builder-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.builder-icon-btn:hover:not(:disabled) {
		background: var(--grove-overlay-12);
	}

	.builder-icon-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.builder-preview {
		margin-top: 1rem;
	}

	.builder-preview-title {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Keeps the 4:3 preview a sensible height inside the dialog */
	.builder-preview-frame {
		max-width: 22rem;
		margin: 0.5rem auto 0;
	}

	/* Wide screens: the preview sits beside the list and stays in view while the
	   list scrolls, instead of hiding below it where nobody would see it */
	@media (min-width: 900px) {
		.gallery-builder-panel {
			max-width: 980px;
		}

		.builder-body {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 18rem;
			gap: 1.25rem;
			align-items: start;
		}

		.builder-preview {
			position: sticky;
			top: 0;
			margin-top: 0;
		}

		.builder-preview-frame {
			max-width: none;
		}
	}

	.builder-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding-top: 0.75rem;
		margin-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.builder-footer-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.builder-count {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.builder-actions {
		display: flex;
		gap: 0.5rem;
	}

	.builder-add,
	.builder-cancel,
	.builder-save {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		border-radius: 6px;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.builder-add,
	.builder-cancel {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		transition: background 0.15s ease;
	}

	.builder-add:hover:not(:disabled),
	.builder-cancel:hover {
		background: var(--grove-overlay-8);
	}

	.builder-add:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.builder-save {
		background: var(--grove-accent);
		border: none;
		font-weight: 600;
		color: white;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}

	.builder-save:hover:not(:disabled) {
		background: var(--grove-accent-dark);
	}

	.builder-save:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.builder-close:focus-visible,
	.builder-input:focus-visible,
	.builder-icon-btn:focus-visible,
	.builder-add:focus-visible,
	.builder-cancel:focus-visible,
	.builder-save:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	/* Narrow screens: drop the thumbnail beside the fields and stack the controls in a row */
	@media (max-width: 560px) {
		.builder-row {
			grid-template-columns: auto 1fr;
		}

		.builder-thumb {
			grid-column: 2;
			width: 100%;
			height: 9rem;
		}

		.builder-fields,
		.builder-controls {
			grid-column: 1 / -1;
		}

		.builder-controls {
			flex-direction: row;
		}
	}
</style>
