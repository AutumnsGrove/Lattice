<script lang="ts" module>
	import type { GalleryItem } from "@autumnsgrove/grove-markdown/directives";

	/** A photo in the arrange step, with a stable id so keyed rows (and focus) survive reordering. */
	export interface GalleryRow extends GalleryItem {
		id: number;
	}
</script>

<script lang="ts">
	import { tick } from "svelte";
	import { navIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import PostCarousel from "$lib/ui/components/gallery/PostCarousel.svelte";

	/**
	 * GalleryBuilder - the arrange step of the photo modal
	 *
	 * Reorder photos, remove them, write alt text and captions in plain fields,
	 * and see a live preview of the carousel readers will get. It is only the
	 * body: PhotoPicker hosts it, and supplies the dialog, the buttons, and the
	 * focus handling, so there is one modal rather than a dialog on a dialog.
	 *
	 * @prop {GalleryRow[]} rows - the photos in gallery order (bindable)
	 */
	interface Props {
		rows: GalleryRow[];
	}

	let { rows = $bindable() }: Props = $props();

	let announcement = $state("");
	let panelRef: HTMLDivElement | null = $state(null);

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
		remaining?.[Math.min(index, remaining.length - 1)]?.focus();
	}
</script>

<div bind:this={panelRef} class="builder-panel">
	<div aria-live="polite" aria-atomic="true" class="sr-only">{announcement}</div>

	<p class="builder-intro">
		Photos swipe in this order. Describe each one in a few words so everyone can enjoy it, including
		people using a screen reader. Captions show under the photo.
	</p>

	<div class="builder-body">
		{#if rows.length === 0}
			<p class="builder-empty">No photos left. Go back to pick some.</p>
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
</div>

<style>
	/* Fills the space the photo modal gives it: the intro takes what it needs and
	   the list scrolls in between, so nothing is cut off when text wraps on a phone. */
	.builder-panel {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
	}

	.builder-intro {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text-muted);
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

	.builder-input:focus-visible,
	.builder-icon-btn:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	/* Wide screens: the preview sits beside the list and stays in view while the
	   list scrolls, instead of hiding below it where nobody would see it */
	@media (min-width: 900px) {
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
