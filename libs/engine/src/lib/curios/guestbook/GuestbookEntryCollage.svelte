<script lang="ts">
	import {
		formatRelativeTime,
		getEntryRotation,
		getDeterministicStyle,
		DEFAULT_COLOR_PALETTE,
		type GuestbookDisplayEntry,
		type GuestbookStyle,
		type GuestbookWallBacking,
		type GuestbookSigningStyle,
	} from "$lib/curios/guestbook";

	let {
		entries,
		style,
		wallBacking = "none",
		allowedStyles = null,
		colorPalette = null,
		allowEmoji = true,
	}: {
		entries: GuestbookDisplayEntry[];
		style: GuestbookStyle;
		wallBacking?: GuestbookWallBacking;
		allowedStyles?: GuestbookSigningStyle[] | null;
		colorPalette?: string[] | null;
		allowEmoji?: boolean;
	} = $props();

	function resolveEntryStyle(entry: GuestbookDisplayEntry): GuestbookSigningStyle {
		if (entry.entryStyle) return entry.entryStyle;
		return getDeterministicStyle(entry.id, allowedStyles ?? null);
	}

	function resolveEntryColor(entry: GuestbookDisplayEntry): string {
		if (entry.entryColor) return entry.entryColor;
		const palette = colorPalette ?? DEFAULT_COLOR_PALETTE;
		let hash = 0;
		for (let i = 0; i < entry.id.length; i++) {
			hash = (hash << 5) - hash + entry.id.charCodeAt(i);
			hash |= 0;
		}
		return palette[Math.abs(hash) % palette.length];
	}
</script>

<div class="collage-wrapper guestbook-{style} wall-{wallBacking}">
	<div class="entries-collage">
		{#each entries as entry (entry.id)}
			{@const entryStyle = resolveEntryStyle(entry)}
			{@const color = resolveEntryColor(entry)}
			{@const rotation = getEntryRotation(entry.id)}

			{#if entryStyle === "line"}
				<!-- Quick Line: inline, no card -->
				<div class="entry-line" style="--entry-color: {color}">
					<span class="line-accent"></span>
					<span class="line-body">
						{#if allowEmoji && entry.emoji}<span class="entry-emoji">{entry.emoji}</span>{/if}
						<span class="entry-name">{entry.name}</span>
						<span class="line-msg">{entry.message}</span>
						<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
					</span>
				</div>
			{:else if entryStyle === "letter"}
				<!-- Letter: folded envelope, unfolds via <details> -->
				<details class="entry-letter" style="--entry-color: {color}">
					<summary class="letter-envelope">
						<span class="letter-seal"></span>
						<span class="letter-from">
							{#if allowEmoji && entry.emoji}<span class="entry-emoji">{entry.emoji}</span>{/if}
							{entry.name}
						</span>
						<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
					</summary>
					<div class="letter-content">
						<p class="entry-message">{entry.message}</p>
					</div>
				</details>
			{:else}
				<!-- Card styles: sticky, note, postcard, doodle -->
				<div
					class="entry-card entry-{entryStyle}"
					style="--entry-color: {color}; --entry-rotation: {rotation}deg"
				>
					{#if entryStyle === "postcard"}
						<div class="postcard-header"></div>
					{/if}
					<div class="entry-meta">
						{#if allowEmoji && entry.emoji}
							<span class="entry-emoji" class:doodle-emoji={entryStyle === "doodle"}
								>{entry.emoji}</span
							>
						{/if}
						<span class="entry-name">{entry.name}</span>
						<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
					</div>
					<p class="entry-message">{entry.message}</p>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* ─── Entries Collage Grid ─── */
	.entries-collage {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	/* Shared entry base styles */
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

	/* ─── Sticky Note ─── */
	.entry-sticky {
		background: var(--entry-color, #e8d5a3);
		padding: 1.25rem;
		border-radius: 0.25rem;
		transform: rotate(var(--entry-rotation, 0deg));
		box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.1);
		font-family: "Caveat", cursive;
	}

	.entry-sticky .entry-message {
		font-size: 1.05rem;
		font-family: "Caveat", cursive;
	}

	.entry-sticky .entry-name {
		font-family: "Caveat", cursive;
		font-size: 1rem;
	}

	.entry-sticky .entry-date {
		font-family: inherit;
		font-size: 0.7rem;
	}

	/* ─── Written Note ─── */
	.entry-note {
		background: var(--color-background, #fff);
		padding: 1.25rem 1.25rem 1.25rem 2.5rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.25rem;
		border-left: 3px solid #e88f7a;
		background-image: repeating-linear-gradient(
			transparent,
			transparent 1.5rem,
			var(--color-border, #e5e7eb) 1.5rem,
			var(--color-border, #e5e7eb) calc(1.5rem + 1px)
		);
		font-family: "Caveat", cursive;
	}

	.entry-note .entry-message {
		color: var(--entry-color, currentColor);
		font-family: "Caveat", cursive;
		font-size: 1.05rem;
	}

	.entry-note .entry-name {
		font-family: "Caveat", cursive;
	}

	/* ─── Quick Line ─── */
	.entry-line {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.line-accent {
		width: 3px;
		min-height: 1.25rem;
		align-self: stretch;
		background: var(--entry-color, var(--color-primary));
		border-radius: 2px;
		flex-shrink: 0;
	}

	.line-body {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.9rem;
	}

	.line-msg {
		color: var(--color-foreground);
	}

	.line-body .entry-date {
		margin-left: 0;
	}

	/* ─── Letter ─── */
	.entry-letter {
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		overflow: hidden;
		background: var(--color-background, #fff);
	}

	.letter-envelope {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}

	.letter-envelope::-webkit-details-marker {
		display: none;
	}

	.letter-seal {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--entry-color, #c4a7d7);
		flex-shrink: 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

	.letter-from {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-foreground);
	}

	.letter-envelope .entry-date {
		margin-left: auto;
	}

	.letter-content {
		padding: 0 1.25rem 1.25rem;
		display: grid;
		grid-template-rows: 1fr;
	}

	.entry-letter:not([open]) .letter-content {
		grid-template-rows: 0fr;
		padding: 0;
		overflow: hidden;
	}

	/* ─── Postcard ─── */
	.entry-postcard {
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--color-background, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	}

	.postcard-header {
		height: 3rem;
		background: var(--entry-color, #8cb8d4);
		opacity: 0.7;
	}

	.entry-postcard .entry-meta,
	.entry-postcard .entry-message {
		padding: 0 1.25rem;
	}

	.entry-postcard .entry-meta {
		padding-top: 1rem;
	}

	.entry-postcard .entry-message {
		padding-bottom: 1.25rem;
	}

	/* ─── Doodle Card ─── */
	.entry-doodle {
		background: var(--color-background, #fff);
		padding: 1.25rem;
		border: 2px dashed var(--entry-color, #a3c4a3);
		border-radius: 0.75rem;
	}

	.doodle-emoji {
		font-size: 2em;
	}

	/* ═══════════════════════════════════════════════
	   WALL BACKINGS — Room layer CSS
	   ═══════════════════════════════════════════════ */

	/* Frosted Glass */
	.wall-glass .entries-collage {
		background: rgba(255, 255, 255, 0.35);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	:global(.dark) .wall-glass .entries-collage {
		background: rgba(0, 0, 0, 0.25);
		border-color: rgba(255, 255, 255, 0.1);
	}

	/* Cork Board */
	.wall-cork .entries-collage {
		background:
			radial-gradient(circle at 20% 30%, rgba(180, 140, 90, 0.15) 0%, transparent 50%),
			radial-gradient(circle at 70% 60%, rgba(160, 120, 70, 0.12) 0%, transparent 50%),
			radial-gradient(circle at 50% 80%, rgba(190, 150, 100, 0.1) 0%, transparent 50%), #c4a882;
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.wall-cork .entry-card::before {
		content: "\1F4CC";
		position: absolute;
		top: -0.5rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.9rem;
	}

	.wall-cork .entry-card {
		position: relative;
	}

	:global(.dark) .wall-cork .entries-collage {
		background:
			radial-gradient(circle at 20% 30%, rgba(100, 80, 50, 0.2) 0%, transparent 50%),
			radial-gradient(circle at 70% 60%, rgba(90, 70, 45, 0.15) 0%, transparent 50%), #5a4a35;
	}

	/* Cream Paper */
	.wall-paper .entries-collage {
		background: #fdf6e3;
		background-image: repeating-linear-gradient(
			transparent,
			transparent 1.75rem,
			rgba(0, 0, 0, 0.04) 1.75rem,
			rgba(0, 0, 0, 0.04) calc(1.75rem + 1px)
		);
		border-radius: 0.5rem;
		padding: 1.5rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .wall-paper .entries-collage {
		background: #2a2520;
		background-image: repeating-linear-gradient(
			transparent,
			transparent 1.75rem,
			rgba(255, 255, 255, 0.04) 1.75rem,
			rgba(255, 255, 255, 0.04) calc(1.75rem + 1px)
		);
	}

	/* ─── Reduced Motion ─── */
	@media (prefers-reduced-motion: reduce) {
		.entry-sticky {
			transform: none !important;
		}

		.entry-letter .letter-content {
			transition: none;
		}
	}

	/* ─── Responsive ─── */
	@media (max-width: 640px) {
		.entries-collage {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.entry-sticky {
			transform: none;
		}

		.entry-line {
			grid-column: auto;
		}

		.entry-sticky,
		.entry-note,
		.entry-doodle {
			padding: 1rem;
		}

		.postcard-header {
			height: 2.25rem;
		}

		.wall-glass .entries-collage,
		.wall-cork .entries-collage,
		.wall-paper .entries-collage {
			padding: 1rem;
		}
	}
</style>
