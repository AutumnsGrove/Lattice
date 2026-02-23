<script lang="ts">
	import { GlassCard, GlassButton } from "$lib/ui/components/ui";
	import GuestbookEntryCollage from "$lib/curios/guestbook/GuestbookEntryCollage.svelte";
	import { Send, BookOpen, ChevronDown, Loader2, Palette } from "lucide-svelte";
	import {
		DEFAULT_COLOR_PALETTE,
		GUESTBOOK_SIGNING_STYLES,
		type GuestbookSigningStyle,
	} from "$lib/curios/guestbook";

	let { data } = $props();

	// Form state
	let name = $state("");
	let message = $state("");
	let selectedEmoji = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formMessage = $state<{ type: "success" | "error"; text: string } | null>(null);
	let showEmojiPicker = $state(false);

	// Personalization state
	let selectedStyle = $state<GuestbookSigningStyle | null>(null);
	let selectedColor = $state<string | null>(null);
	let showPersonalize = $state(false);

	// Resolve available styles and colors from config
	const availableStyles = $derived(
		data.config.allowedStyles && data.config.allowedStyles.length > 0
			? GUESTBOOK_SIGNING_STYLES.filter((s) => data.config.allowedStyles!.includes(s.value))
			: GUESTBOOK_SIGNING_STYLES,
	);
	const availableColors = $derived(
		data.config.colorPalette && data.config.colorPalette.length > 0
			? data.config.colorPalette
			: DEFAULT_COLOR_PALETTE,
	);

	// Pagination state
	// svelte-ignore state_referenced_locally
	let entries = $state([...data.entries]);
	let hasMore = $derived(entries.length < data.total);
	let loadingMore = $state(false);
	let currentOffset = $derived(entries.length);

	const charCount = $derived(message.length);
	const charLimit = $derived(data.config.maxMessageLength);
	const isOverLimit = $derived(charCount > charLimit);

	async function submitEntry() {
		if (!message.trim() || isOverLimit) return;

		isSubmitting = true;
		formMessage = null;

		try {
			const res = await fetch("/api/curios/guestbook", {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim() || undefined,
					message: message.trim(),
					emoji: selectedEmoji,
					entryStyle: selectedStyle || undefined,
					entryColor: selectedColor || undefined,
				}),
			});

			if (res.ok) {
				const result = (await res.json()) as {
					requiresApproval: boolean;
					entry: {
						id: string;
						name: string;
						message: string;
						emoji: string | null;
						entryStyle: GuestbookSigningStyle;
						entryColor: string;
					};
				};
				if (result.requiresApproval) {
					formMessage = {
						type: "success",
						text: "Thanks for signing! Your entry will appear after approval.",
					};
				} else {
					formMessage = {
						type: "success",
						text: "Thanks for signing the guestbook!",
					};
					// Add to displayed entries immediately
					entries = [
						{
							id: result.entry.id,
							name: result.entry.name,
							message: result.entry.message,
							emoji: result.entry.emoji,
							entryStyle: result.entry.entryStyle,
							entryColor: result.entry.entryColor,
							createdAt: new Date().toISOString(),
						},
						...entries,
					];
				}
				// Reset form
				name = "";
				message = "";
				selectedEmoji = null;
				selectedStyle = null;
				selectedColor = null;
				showEmojiPicker = false;
				showPersonalize = false;
			} else if (res.status === 429) {
				formMessage = {
					type: "error",
					text: "You've signed recently — please wait a bit before signing again.",
				};
			} else {
				formMessage = {
					type: "error",
					text: "Something went wrong. Please try again.",
				};
			}
		} catch {
			formMessage = {
				type: "error",
				text: "Couldn't reach the server. Please try again.",
			};
		} finally {
			isSubmitting = false;
		}
	}

	async function loadMore() {
		loadingMore = true;
		try {
			const res = await fetch(
				// csrf-ok
				`/api/curios/guestbook?limit=${data.config.entriesPerPage}&offset=${currentOffset}`,
			);
			if (res.ok) {
				const result = (await res.json()) as {
					entries: typeof entries;
					pagination: { hasMore: boolean };
				};
				entries = [...entries, ...result.entries];
				currentOffset += result.entries.length;
				hasMore = result.pagination.hasMore;
			}
		} catch {
			// Silently fail — user can try again
		} finally {
			loadingMore = false;
		}
	}

	function selectEmoji(emoji: string) {
		selectedEmoji = selectedEmoji === emoji ? null : emoji;
		showEmojiPicker = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showEmojiPicker) {
			e.preventDefault();
			showEmojiPicker = false;
			return;
		}
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			submitEntry();
		}
	}
</script>

<svelte:head>
	<title>Guestbook</title>
	<meta name="description" content="Sign the guestbook — leave a message, say hello." />
</svelte:head>

<div class="guestbook-page guestbook-{data.config.style}">
	<header class="guestbook-header">
		<BookOpen class="header-icon" />
		<h1>Guestbook</h1>
		<p class="entry-count">{data.total} {data.total === 1 ? "signature" : "signatures"}</p>
	</header>

	<!-- Sign the Guestbook Form -->
	<GlassCard class="sign-card">
		<h2 class="sign-title">
			{data.config.customPrompt || "Leave a message!"}
		</h2>

		<form
			class="sign-form"
			onsubmit={(e) => {
				e.preventDefault();
				submitEntry();
			}}
		>
			<div class="form-row">
				<div class="input-wrapper name-input">
					<label for="gb-name">Name</label>
					<input
						id="gb-name"
						type="text"
						bind:value={name}
						placeholder="Anonymous Wanderer"
						maxlength="50"
						autocomplete="name"
					/>
				</div>

				{#if data.config.allowEmoji}
					<div class="input-wrapper emoji-input">
						<label for="gb-emoji">Emoji</label>
						<button
							id="gb-emoji"
							type="button"
							class="emoji-trigger"
							onclick={() => (showEmojiPicker = !showEmojiPicker)}
							aria-expanded={showEmojiPicker}
							aria-haspopup="listbox"
						>
							{selectedEmoji || "Pick"}
							<ChevronDown class="w-3 h-3" />
						</button>

						{#if showEmojiPicker}
							<div class="emoji-dropdown" role="listbox" aria-label="Choose an emoji">
								{#each data.emoji as emoji}
									<button
										type="button"
										class="emoji-option"
										class:selected={selectedEmoji === emoji}
										onclick={() => selectEmoji(emoji)}
										role="option"
										aria-selected={selectedEmoji === emoji}
									>
										{emoji}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="input-wrapper message-input">
				<label for="gb-message">Message</label>
				<textarea
					id="gb-message"
					bind:value={message}
					placeholder="Say hello, share a thought, leave your mark..."
					rows="3"
					maxlength={charLimit}
					onkeydown={handleKeydown}
					required
				></textarea>
				<div class="char-counter" class:over={isOverLimit}>
					{charCount}/{charLimit}
				</div>
			</div>

			<!-- Personalize your entry -->
			<details class="personalize-section" bind:open={showPersonalize}>
				<summary class="personalize-toggle">
					<Palette class="w-4 h-4" />
					Personalize your entry
				</summary>

				<div class="personalize-content">
					<!-- Style picker -->
					<div class="picker-group">
						<span class="picker-label">Signing style</span>
						<div class="style-picker" role="radiogroup" aria-label="Choose a signing style">
							{#each availableStyles as styleOpt}
								<button
									type="button"
									class="style-chip"
									class:active={selectedStyle === styleOpt.value}
									onclick={() =>
										(selectedStyle = selectedStyle === styleOpt.value ? null : styleOpt.value)}
									role="radio"
									aria-checked={selectedStyle === styleOpt.value}
									aria-label={styleOpt.label}
									title={styleOpt.description}
								>
									<span class="style-preview style-preview-{styleOpt.value}"></span>
									<span class="style-chip-label">{styleOpt.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Color picker -->
					<div class="picker-group">
						<span class="picker-label">Accent color</span>
						<div class="color-picker" role="radiogroup" aria-label="Choose an accent color">
							{#each availableColors as color}
								<button
									type="button"
									class="color-swatch"
									class:active={selectedColor === color}
									style="--swatch-color: {color}"
									onclick={() => (selectedColor = selectedColor === color ? null : color)}
									role="radio"
									aria-checked={selectedColor === color}
									aria-label="Color {color}"
								></button>
							{/each}
						</div>
					</div>

					<p class="personalize-note">
						Leave blank for a random style — zero friction, still personal.
					</p>
				</div>
			</details>

			<div class="form-footer">
				{#if formMessage}
					<p class="form-message {formMessage.type}" role="status" aria-live="polite">
						{formMessage.text}
					</p>
				{/if}

				<GlassButton
					type="submit"
					variant="accent"
					disabled={isSubmitting || !message.trim() || isOverLimit}
				>
					{#if isSubmitting}
						<Loader2 class="w-4 h-4 spin" />
						Signing...
					{:else}
						<Send class="w-4 h-4" />
						Sign the Guestbook
					{/if}
				</GlassButton>
			</div>
		</form>
	</GlassCard>

	<!-- Entries Collage -->
	<GuestbookEntryCollage
		{entries}
		style={data.config.style}
		wallBacking={data.config.wallBacking ?? "none"}
		allowedStyles={data.config.allowedStyles}
		colorPalette={data.config.colorPalette}
		allowEmoji={data.config.allowEmoji}
	/>

	{#if entries.length === 0}
		<GlassCard class="empty-state">
			<p>No signatures yet — be the first!</p>
		</GlassCard>
	{/if}

	<!-- Load More -->
	{#if hasMore}
		<div class="load-more">
			<GlassButton variant="ghost" onclick={loadMore} disabled={loadingMore}>
				{#if loadingMore}
					<Loader2 class="w-4 h-4 spin" />
					Loading...
				{:else}
					Load more signatures
				{/if}
			</GlassButton>
		</div>
	{/if}
</div>

<style>
	.guestbook-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.guestbook-header {
		text-align: center;
		padding: 2rem 1rem 1.5rem;
	}

	:global(.header-icon) {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-primary);
		margin: 0 auto 0.75rem;
		display: block;
	}

	.guestbook-header h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem 0;
		color: var(--color-foreground);
	}

	.entry-count {
		color: var(--color-muted-foreground);
		margin: 0;
		font-size: 0.95rem;
	}

	/* ─── Sign Form ─── */
	:global(.sign-card) {
		padding: 1.5rem !important;
		margin-bottom: 2rem;
	}

	.sign-title {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-foreground);
		margin: 0 0 1.25rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		position: relative;
	}

	.input-wrapper label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-muted-foreground);
	}

	.name-input {
		flex: 1;
	}

	.emoji-input {
		flex-shrink: 0;
		min-width: 5rem;
	}

	.message-input {
		margin-bottom: 1rem;
	}

	input[type="text"],
	textarea {
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-foreground);
		background: var(--color-background, #fff);
		transition: border-color 0.2s ease;
		font-family: inherit;
		width: 100%;
	}

	input[type="text"]:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	textarea {
		resize: vertical;
		min-height: 80px;
	}

	.char-counter {
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		text-align: right;
		margin-top: 0.25rem;
	}

	.char-counter.over {
		color: #dc2626;
		font-weight: 600;
	}

	/* ─── Emoji Picker ─── */
	.emoji-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--color-background, #fff);
		cursor: pointer;
		font-size: 1.1rem;
		min-height: 2.5rem;
		transition: border-color 0.2s ease;
	}

	.emoji-trigger:hover {
		border-color: var(--color-primary);
	}

	.emoji-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 50;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.25rem;
		padding: 0.75rem;
		background: var(--color-background, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		box-shadow:
			0 10px 25px rgba(0, 0, 0, 0.1),
			0 4px 10px rgba(0, 0, 0, 0.05);
		margin-top: 0.25rem;
		min-width: 220px;
	}

	.emoji-option {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.15s ease;
	}

	.emoji-option:hover {
		background: var(--color-muted, #f3f4f6);
		transform: scale(1.2);
	}

	.emoji-option.selected {
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
		outline: 2px solid var(--color-primary);
		outline-offset: -1px;
	}

	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.form-message {
		font-size: 0.85rem;
		margin: 0;
		flex: 1;
	}

	.form-message.success {
		color: #059669;
	}

	.form-message.error {
		color: #dc2626;
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

		.emoji-option:hover {
			transform: none;
		}
	}

	:global(.empty-state) {
		text-align: center;
		padding: 3rem 2rem !important;
		color: var(--color-muted-foreground);
	}

	.load-more {
		display: flex;
		justify-content: center;
		padding: 2rem 0;
	}

	/* ─── Personalization Picker ─── */
	.personalize-section {
		margin-bottom: 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.personalize-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-muted-foreground);
		list-style: none;
		user-select: none;
		transition: color 0.15s ease;
	}

	.personalize-toggle::-webkit-details-marker {
		display: none;
	}

	.personalize-toggle:hover {
		color: var(--color-foreground);
	}

	.personalize-content {
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.picker-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.picker-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-muted-foreground);
	}

	.style-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.style-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 2rem;
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-foreground);
		transition: all 0.15s ease;
	}

	.style-chip:hover {
		border-color: var(--color-primary);
	}

	.style-chip.active {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.style-preview {
		width: 1rem;
		height: 1rem;
		border-radius: 0.125rem;
		flex-shrink: 0;
	}

	.style-preview-sticky {
		background: #e8d5a3;
		transform: rotate(-3deg);
	}

	.style-preview-note {
		background: #fff;
		border-left: 2px solid #e88f7a;
		border-top: 1px solid var(--color-border, #ddd);
	}

	.style-preview-line {
		width: 1.25rem;
		height: 3px;
		background: var(--color-primary);
		border-radius: 2px;
	}

	.style-preview-letter {
		background: #fff;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 0.125rem;
		position: relative;
	}

	.style-preview-letter::after {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #c4a7d7;
	}

	.style-preview-postcard {
		background: linear-gradient(to bottom, #8cb8d4 40%, #fff 40%);
		border: 1px solid var(--color-border, #ddd);
	}

	.style-preview-doodle {
		background: #fff;
		border: 1.5px dashed #a3c4a3;
	}

	.color-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.color-swatch {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: 2px solid transparent;
		background: var(--swatch-color);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.color-swatch:hover {
		transform: scale(1.15);
	}

	.color-swatch.active {
		border-color: var(--color-foreground);
		box-shadow:
			0 0 0 2px var(--color-background, #fff),
			0 0 0 4px var(--swatch-color);
	}

	.personalize-note {
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		margin: 0;
		font-style: italic;
	}

	/* ═════════════════════════════════════════════════════════════
     PAGE CHROME STYLES (header, form, load-more theming)
     Entry rendering is now per-entry via signing styles above.
     ═════════════════════════════════════════════════════════════ */

	/* COZY: warm rounded chrome */
	.guestbook-cozy .guestbook-header h1 {
		font-family: "Caveat", cursive;
		font-size: 3rem;
	}

	/* CLASSIC: old-web chrome */
	.guestbook-classic .guestbook-header h1 {
		border-bottom: 2px solid var(--color-border, #e5e7eb);
		padding-bottom: 0.5rem;
	}

	/* PIXEL: retro chrome */
	.guestbook-pixel .guestbook-header h1 {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-family: "Courier New", Courier, monospace;
	}

	/* ─── Reduced Motion ─── */
	@media (prefers-reduced-motion: reduce) {
		.color-swatch:hover {
			transform: none;
		}

		.style-chip,
		.color-swatch,
		.personalize-toggle {
			transition: none;
		}
	}

	/* ─── Responsive ─── */
	@media (max-width: 640px) {
		.guestbook-header h1 {
			font-size: 2rem;
		}

		/* Signing form */
		.form-row {
			flex-direction: column;
			gap: 0.75rem;
		}

		.emoji-dropdown {
			left: 0;
			right: auto;
		}

		.form-footer {
			flex-direction: column;
			align-items: stretch;
		}

		.form-message {
			text-align: center;
		}

		/* Personalization picker stacks nicely */
		.style-picker {
			gap: 0.375rem;
		}

		.style-chip {
			padding: 0.3rem 0.6rem;
			font-size: 0.75rem;
		}
	}
</style>
