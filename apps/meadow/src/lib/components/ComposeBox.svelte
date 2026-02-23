<!--
  ComposeBox — Leave a note in the meadow.

  Collapsed: a single-line glass prompt.
  Expanded: NoteEditor with character counter, optional tags, submit button.
  Wires to POST /api/notes, emits oncreated with the new post.
-->
<script lang="ts">
	import type { MeadowPost } from "$lib/types/post";
	import { NoteEditor } from "@autumnsgrove/lattice/ui/editor";
	import { Blaze } from "@autumnsgrove/lattice/ui/indicators";
	import { GLOBAL_BLAZE_DEFAULTS } from "@autumnsgrove/lattice/blazes";
	import { uploadNoteImage } from "$lib/utils/note-upload";

	interface Props {
		userName: string | null;
		/** Whether user has a grove (tenant) — enables image uploads */
		hasGrove?: boolean;
		oncreated: (post: MeadowPost) => void;
	}

	const { userName, hasGrove = false, oncreated }: Props = $props();

	const MAX_BODY = 1000;
	const WARN_AT = 900;
	const MAX_TAGS = 5;

	let expanded = $state(false);
	let html = $state("");
	let text = $state("");
	let charCount = $state(0);
	let tagInput = $state("");
	let tags = $state<string[]>([]);
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);
	let noteEditor: ReturnType<typeof NoteEditor> | undefined = $state();
	let selectedBlaze = $state<string | null>(null);

	// Blaze picker — fetched from API to include tenant custom blazes
	let availableBlazes = $state<Array<{ slug: string; label: string; icon: string; color: string }>>(
		[...GLOBAL_BLAZE_DEFAULTS],
	);
	let blazesFetched = $state(false);

	const isOverLimit = $derived(charCount > MAX_BODY);
	const isNearLimit = $derived(charCount >= WARN_AT && !isOverLimit);
	const canSubmit = $derived(text.trim().length > 0 && !isOverLimit && !submitting);

	async function fetchBlazes() {
		if (blazesFetched) return;
		blazesFetched = true;
		try {
			const res = await fetch("/api/blazes");
			if (res.ok) {
				const { blazes } = await res.json();
				if (Array.isArray(blazes) && blazes.length > 0) {
					availableBlazes = blazes;
				}
			}
		} catch {
			// Keep GLOBAL_BLAZE_DEFAULTS fallback
		}
	}

	function expand() {
		expanded = true;
		fetchBlazes();
		// Focus the editor after DOM updates
		requestAnimationFrame(() => noteEditor?.focus());
	}

	function collapse() {
		expanded = false;
		html = "";
		text = "";
		charCount = 0;
		tags = [];
		tagInput = "";
		selectedBlaze = null;
		errorMsg = null;
		noteEditor?.clearContent();
	}

	function handleEditorUpdate(newHtml: string, newText: string, newCharCount: number) {
		html = newHtml;
		text = newText;
		charCount = newCharCount;
	}

	function addTag() {
		const tag = tagInput.trim().slice(0, 30);
		if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
			tags = [...tags, tag];
		}
		tagInput = "";
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addTag();
		}
	}

	async function submit() {
		if (!canSubmit) return;
		submitting = true;
		errorMsg = null;

		// Determine if note has any rich content beyond plain text
		const hasRichContent = html !== `<p>${text}</p>` && html !== "<p></p>" && html.trim() !== "";

		try {
			const res = await fetch("/api/notes", {
				// csrf-ok
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					body: text.trim(),
					content_html: hasRichContent ? html : undefined,
					tags: tags.length > 0 ? tags : undefined,
					blaze: selectedBlaze || undefined,
				}),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
				errorMsg =
					(typeof errData.error_description === "string" ? errData.error_description : null) ||
					"Something went wrong. Try again?";
				return;
			}

			const data = (await res.json()) as { post: MeadowPost };
			oncreated(data.post);
			collapse();
		} catch {
			errorMsg = "Couldn't reach the meadow. Check your connection?";
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="rounded-xl border border-white/20 bg-white/60 shadow-sm backdrop-blur-md transition-all dark:border-cream-100/15 dark:bg-cream-100/40"
>
	{#if !expanded}
		<!-- Collapsed state -->
		<button
			type="button"
			class="flex w-full items-center gap-3 px-5 py-4 text-left"
			onclick={expand}
		>
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
			>
				{(userName || "?").charAt(0).toUpperCase()}
			</div>
			<span class="text-sm text-foreground-muted"> Leave a note in the meadow... </span>
		</button>
	{:else}
		<!-- Expanded state -->
		<div class="px-5 pt-4 pb-4">
			<div class="flex items-start gap-3">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
				>
					{(userName || "?").charAt(0).toUpperCase()}
				</div>
				<div class="min-w-0 flex-1">
					<NoteEditor
						bind:this={noteEditor}
						onupdate={handleEditorUpdate}
						onsubmit={submit}
						placeholder="What's on your mind?"
						maxChars={MAX_BODY}
						uploadsEnabled={hasGrove}
						uploadImage={hasGrove ? uploadNoteImage : undefined}
					/>

					<!-- Character counter -->
					<div class="mt-1 flex items-center justify-between">
						<span
							class="text-xs {isOverLimit
								? 'text-red-500 font-medium'
								: isNearLimit
									? 'text-amber-500'
									: 'text-foreground-subtle'}"
						>
							{charCount}/{MAX_BODY}
						</span>
					</div>

					<!-- Tags -->
					{#if tags.length > 0}
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each tags as tag}
								<button
									type="button"
									class="inline-flex items-center gap-1 rounded-full bg-grove-50 px-2.5 py-0.5 text-xs font-medium text-grove-700 transition-colors hover:bg-grove-100 dark:bg-cream-100/30 dark:text-cream-800 dark:hover:bg-cream-100/40"
									onclick={() => removeTag(tag)}
									aria-label="Remove tag: {tag}"
								>
									{tag}
									<span aria-hidden="true">&times;</span>
								</button>
							{/each}
						</div>
					{/if}

					<!-- Blaze picker -->
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each availableBlazes as blazeDef}
							<button
								type="button"
								class="min-h-[44px] min-w-[44px] rounded-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-400 focus-visible:ring-offset-1 {selectedBlaze ===
								blazeDef.slug
									? 'opacity-100'
									: 'opacity-50 hover:opacity-75'}"
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

					<!-- Tag input -->
					{#if tags.length < MAX_TAGS}
						<div class="mt-2">
							<input
								type="text"
								class="w-full rounded-md border-0 bg-black/5 px-2.5 py-1 text-xs text-foreground placeholder:text-foreground-subtle focus:ring-1 focus:ring-grove-400 dark:bg-white/5"
								placeholder="Add a tag (press Enter)"
								maxlength="30"
								bind:value={tagInput}
								onkeydown={handleTagKeydown}
							/>
						</div>
					{/if}

					<!-- Error -->
					{#if errorMsg}
						<p class="mt-2 text-xs text-red-500">{errorMsg}</p>
					{/if}

					<!-- Actions -->
					<div class="mt-3 flex items-center justify-between">
						<button
							type="button"
							class="rounded-md px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
							onclick={collapse}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded-lg bg-grove-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-grove-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-grove-500 dark:hover:bg-grove-600"
							disabled={!canSubmit}
							onclick={submit}
						>
							{#if submitting}
								Leaving note...
							{:else}
								Leave note
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@media (prefers-reduced-motion: reduce) {
		div {
			transition-duration: 0s !important;
		}
	}
</style>
