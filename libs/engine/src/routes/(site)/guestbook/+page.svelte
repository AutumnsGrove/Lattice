<script lang="ts">
	import { GlassCard, GlassButton } from "$lib/ui/components/ui";
	import { Send, BookOpen, ChevronDown, Loader2 } from "lucide-svelte";
	import { formatRelativeTime } from "$lib/curios/guestbook";

	let { data } = $props();

	// Form state
	let name = $state("");
	let message = $state("");
	let selectedEmoji = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formMessage = $state<{ type: "success" | "error"; text: string } | null>(null);
	let showEmojiPicker = $state(false);

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
				}),
			});

			if (res.ok) {
				const result = (await res.json()) as {
					requiresApproval: boolean;
					entry: { id: string; name: string; message: string; emoji: string | null };
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
							createdAt: new Date().toISOString(),
						},
						...entries,
					];
				}
				// Reset form
				name = "";
				message = "";
				selectedEmoji = null;
				showEmojiPicker = false;
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

	<!-- Entries -->
	<div class="entries-list">
		{#each entries as entry (entry.id)}
			<div class="guestbook-entry">
				<div class="entry-meta">
					{#if entry.emoji}
						<span class="entry-emoji">{entry.emoji}</span>
					{/if}
					<span class="entry-name">{entry.name}</span>
					<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
				</div>
				<p class="entry-message">{entry.message}</p>
			</div>
		{/each}
	</div>

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

	/* ─── Entries List ─── */
	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.guestbook-entry {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.guestbook-entry:first-child {
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.entry-emoji {
		font-size: 1.1em;
	}

	.entry-name {
		font-weight: 600;
		color: var(--color-foreground);
		font-size: 0.95rem;
	}

	.entry-date {
		color: var(--color-muted-foreground);
		font-size: 0.8rem;
		margin-left: auto;
	}

	.entry-message {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-foreground);
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
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

	/* ═════════════════════════════════════════════════════════════
     STYLE: COZY (default)
     Warm, rounded, handwriting feel
     ═════════════════════════════════════════════════════════════ */
	.guestbook-cozy .guestbook-entry {
		padding: 1.25rem;
		margin-bottom: 0.75rem;
		border: none;
		border-bottom: none;
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
		border-radius: 1rem;
	}

	.guestbook-cozy .guestbook-entry:first-child {
		border-top: none;
	}

	.guestbook-cozy .entries-list {
		gap: 0.75rem;
	}

	.guestbook-cozy .entry-message {
		font-style: italic;
	}

	/* ═════════════════════════════════════════════════════════════
     STYLE: CLASSIC
     Old-web bordered entries
     ═════════════════════════════════════════════════════════════ */
	.guestbook-classic .guestbook-entry {
		padding: 1rem;
		margin-bottom: 0.5rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0;
		background: var(--grove-overlay-2, rgba(0, 0, 0, 0.01));
	}

	.guestbook-classic .guestbook-entry:first-child {
		border-top: 2px solid var(--color-border, #e5e7eb);
	}

	.guestbook-classic .entries-list {
		gap: 0.5rem;
	}

	.guestbook-classic .entry-name {
		text-decoration: underline;
	}

	/* ═════════════════════════════════════════════════════════════
     STYLE: MODERN
     Clean cards with subtle shadows
     ═════════════════════════════════════════════════════════════ */
	.guestbook-modern .guestbook-entry {
		padding: 1.25rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		background: var(--color-background, #fff);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.guestbook-modern .guestbook-entry:first-child {
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	.guestbook-modern .entries-list {
		gap: 0.75rem;
	}

	/* ═════════════════════════════════════════════════════════════
     STYLE: PIXEL
     Retro pixelated borders, monospace text
     ═════════════════════════════════════════════════════════════ */
	.guestbook-pixel .guestbook-entry {
		padding: 1rem;
		margin-bottom: 0.5rem;
		border: 3px solid var(--color-foreground);
		border-radius: 0;
		background: var(--color-background, #fff);
		box-shadow:
			4px 4px 0 var(--color-foreground),
			-1px -1px 0 var(--color-foreground);
		font-family: "Courier New", Courier, monospace;
	}

	.guestbook-pixel .guestbook-entry:first-child {
		border-top: 3px solid var(--color-foreground);
	}

	.guestbook-pixel .entries-list {
		gap: 0.75rem;
	}

	.guestbook-pixel .entry-name {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.85rem;
	}

	.guestbook-pixel .entry-message {
		font-family: "Courier New", Courier, monospace;
		font-size: 0.85rem;
	}

	.guestbook-pixel .guestbook-header h1 {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-family: "Courier New", Courier, monospace;
	}

	/* ─── Responsive ─── */
	@media (max-width: 640px) {
		.guestbook-header h1 {
			font-size: 2rem;
		}

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
	}
</style>
