<script lang="ts">
	import GuestbookEntryCollage from "./GuestbookEntryCollage.svelte";
	import {
		type GuestbookStyle,
		type GuestbookWallBacking,
		type GuestbookSigningStyle,
		type GuestbookDisplayEntry,
		VALID_SIGNING_STYLES,
		DEFAULT_COLOR_PALETTE,
	} from "$lib/curios/guestbook";

	let {
		style,
		wallBacking = "none",
		allowedStyles = null,
		colorPalette = null,
		allowEmoji = true,
		customPrompt = null,
	}: {
		style: GuestbookStyle;
		wallBacking?: GuestbookWallBacking;
		allowedStyles?: GuestbookSigningStyle[] | null;
		colorPalette?: string[] | null;
		allowEmoji?: boolean;
		customPrompt?: string | null;
	} = $props();

	// Nature-themed mock names
	const MOCK_NAMES = ["River", "Sage", "Cedar", "Wren", "Lark", "Fern"];
	const MOCK_MESSAGES = [
		"Love what you're building here! Keep going.",
		"Stopped by to say hello from across the web.",
		"This space feels like home.",
		"Found your site through a friend — beautiful work.",
		"Wishing you a wonderful day!",
		"The internet needs more places like this.",
	];
	const MOCK_EMOJI: (string | null)[] = ["🌿", "✨", "🦋", "🌸", "🫶", "🌙"];

	// Build one mock entry per enabled signing style, cycling through the palette
	const mockEntries = $derived.by(() => {
		const activeStyles =
			allowedStyles && allowedStyles.length > 0
				? VALID_SIGNING_STYLES.filter((s) => allowedStyles!.includes(s))
				: VALID_SIGNING_STYLES;
		const palette = colorPalette && colorPalette.length > 0 ? colorPalette : DEFAULT_COLOR_PALETTE;

		return activeStyles.map((signingStyle, i): GuestbookDisplayEntry => {
			const color = palette[i % palette.length];
			return {
				id: `preview-${signingStyle}-${i}`,
				name: MOCK_NAMES[i % MOCK_NAMES.length],
				message: MOCK_MESSAGES[i % MOCK_MESSAGES.length],
				emoji: allowEmoji ? MOCK_EMOJI[i % MOCK_EMOJI.length] : null,
				entryStyle: signingStyle,
				entryColor: color,
				createdAt: new Date(Date.now() - i * 3600000).toISOString(),
			};
		});
	});
</script>

<div class="guestbook-preview">
	{#if customPrompt}
		<p class="preview-prompt">{customPrompt}</p>
	{/if}
	<GuestbookEntryCollage
		entries={mockEntries}
		{style}
		{wallBacking}
		{allowedStyles}
		{colorPalette}
		{allowEmoji}
	/>
</div>

<style>
	.guestbook-preview {
		max-height: 420px;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.preview-prompt {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground);
		margin: 0 0 1rem;
		text-align: center;
	}
</style>
