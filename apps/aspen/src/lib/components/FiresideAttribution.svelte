<script lang="ts">
	/**
	 * What a post says about how it was written.
	 *
	 * Two separate promises live here, and the spec is careful to keep them apart:
	 *
	 * - **The marker is not optional.** It is derived from `posts.fireside_assisted`,
	 *   so an edit cannot remove it — not by accident, not on purpose. Nothing was
	 *   appended to the prose, so there is nothing to strip.
	 * - **The transcript is optional.** Off by default, opted into once, and the
	 *   writer can take it back down from this footer or from the fire in the editor.
	 *
	 * The conversation is shown whole and verbatim, because the writer's own words
	 * are the proof that the fire did not write them. Proposals are counted rather
	 * than reprinted: the accepted one *is* the article above.
	 *
	 * `import type` only — `/api/fireside` is the server's business, and this is the
	 * one thing the reader's copy of the page needs to know about it.
	 */
	import { navIcons } from "@autumnsgrove/prism/icons";
	import type { TranscriptEntry } from "$lib/server/fireside/transcript";

	interface Props {
		/** `posts.fireside_assisted`: the truth, never the presentation. */
		assisted: boolean;
		/** Present only when the writer published it. */
		transcript: { publishedAt: number | null; entries: TranscriptEntry[] } | null;
		/** The writer's name, so their turns are theirs rather than "you". */
		author: string;
		/** The owner's switch, per request and beta only. Null for everyone else. */
		transcriptSwitch: { sessionId: string; transcriptPublic: boolean } | null;
	}

	let { assisted, transcript, author, transcriptSwitch }: Props = $props();

	const ChevronDown = navIcons.chevronDown;

	/**
	 * The route's answer is the new truth in both directions, so the page does not
	 * reload to find out what it just did — and a failed request leaves the previous
	 * state on screen rather than showing a change that did not happen.
	 *
	 * Both start from the server's answer for this request; after that the route is
	 * the only thing that may change them.
	 */
	// svelte-ignore state_referenced_locally
	let shown = $state(transcript);
	// svelte-ignore state_referenced_locally
	let sharing = $state(transcriptSwitch?.transcriptPublic ?? false);
	let busy = $state(false);
	let error = $state<string | null>(null);

	/** The layout's token, the same way the editor's fire reads it. */
	function csrfToken(): string | null {
		if (typeof document === "undefined") return null;
		return (
			document.cookie
				.split("; ")
				.find((row) => row.startsWith("csrf_token="))
				?.split("=")[1] ??
			document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ??
			null
		);
	}

	async function toggle() {
		if (!transcriptSwitch || busy) return;
		const want = !sharing;
		busy = true;
		error = null;

		try {
			const token = csrfToken();
			const response = await fetch(
				// The panel's own reason for a bare fetch: `$lib/utils/api` hangs the
				// component suite, and this carries both things the helper exists for.
				`/api/fireside/${transcriptSwitch.sessionId}/transcript`, // csrf-ok
				{
					method: "POST",
					credentials: "include",
					headers: {
						"content-type": "application/json",
						...(token ? { "x-csrf-token": token } : {}),
					},
					body: JSON.stringify({ public: want }),
				},
			);
			if (!response.ok) throw new Error(`${response.status}`);

			const body = (await response.json()) as {
				transcriptPublic?: boolean;
				transcript?: { publishedAt: number | null; entries: TranscriptEntry[] } | null;
			};

			// The server's answer, not the request: if it disagrees, it is right.
			sharing = body.transcriptPublic === true;
			shown = sharing ? (body.transcript ?? null) : null;
		} catch {
			error = want
				? "That didn't go through. The conversation is still private."
				: "That didn't go through. The conversation is still public.";
		} finally {
			busy = false;
		}
	}

	function written(seconds: number | null): string | null {
		if (!seconds) return null;
		return new Date(seconds * 1000).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}
</script>

{#if assisted}
	<footer class="fireside" aria-label="How this post was written">
		<p class="fireside-marker"><em>~ written fireside with Wisp ~</em></p>

		{#if shown && shown.entries.length > 0}
			<details class="fireside-transcript">
				<summary>
					<span>Read how this was written</span>
					<span class="fireside-chevron">
						<ChevronDown size={14} aria-hidden="true" />
					</span>
				</summary>

				<p class="fireside-intro">
					The whole conversation, both sides, as it happened
					{#if written(shown.publishedAt)}
						on {written(shown.publishedAt)}
					{/if}. Wisp asked; the writing was theirs.
				</p>

				<ol class="fireside-turns">
					{#each shown.entries as entry, index (index)}
						<li
							class="fireside-turn"
							class:from-writer={entry.kind === "turn" && entry.role === "user"}
						>
							{#if entry.kind === "draft"}
								<p class="fireside-who">Wisp proposed a draft</p>
								<p class="fireside-body">{entry.title} · {entry.words.toLocaleString()} words</p>
								{#if entry.accepted}
									<p class="fireside-accepted">The writer accepted this one.</p>
								{/if}
							{:else}
								<p class="fireside-who">{entry.role === "user" ? author : "Wisp"}</p>
								<p class="fireside-body">{entry.content}</p>
							{/if}
						</li>
					{/each}
				</ol>
			</details>
		{/if}

		{#if transcriptSwitch}
			<div class="fireside-switch">
				<button type="button" class="fireside-toggle" disabled={busy} onclick={() => void toggle()}>
					{sharing ? "Stop sharing this conversation" : "Share how this was written"}
				</button>
				{#if error}
					<p class="fireside-error" role="status">{error}</p>
				{/if}
			</div>
		{/if}
	</footer>
{/if}

<style>
	/* The article's own footer: a hairline, a quiet line of type, nothing shouting. */
	.fireside {
		margin: 2rem 0 2.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.fireside-marker {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		letter-spacing: 0.01em;
	}

	.fireside-marker em {
		font-style: italic;
	}

	.fireside-transcript {
		margin-top: 0.5rem;
	}

	.fireside-transcript summary {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		color: var(--color-primary);
		font-size: 0.85rem;
		padding: 0.25rem 0;
		border-radius: 4px;
	}

	.fireside-transcript summary:hover {
		text-decoration: underline;
	}

	.fireside-transcript summary:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* The chevron is decoration; the browser's own open/closed marker is hidden. */
	.fireside-transcript summary::-webkit-details-marker {
		display: none;
	}

	.fireside-transcript summary::marker {
		content: "";
	}

	.fireside-chevron {
		display: inline-flex;
		transition: transform 0.15s ease;
	}

	.fireside-transcript[open] .fireside-chevron {
		transform: rotate(180deg);
	}

	.fireside-intro {
		margin: 0.75rem 0 1rem;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}

	.fireside-turns {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		max-height: 32rem;
		overflow-y: auto;
	}

	.fireside-turn {
		padding: 0.6rem 0.85rem;
		border-radius: 10px;
		background: var(--color-bg-secondary);
		max-width: 46rem;
	}

	/* The writer's turns sit slightly right, so the exchange reads as one. */
	.fireside-turn.from-writer {
		margin-left: 1.5rem;
	}

	.fireside-who {
		margin: 0 0 0.2rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-subtle);
	}

	.fireside-body {
		margin: 0;
		color: var(--color-text);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.fireside-accepted {
		margin: 0.4rem 0 0;
		font-size: 0.8rem;
		color: var(--color-primary);
	}

	.fireside-switch {
		margin-top: 0.75rem;
	}

	.fireside-toggle {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
		border-radius: 4px;
	}

	.fireside-toggle:hover:not(:disabled) {
		color: var(--color-text);
	}

	.fireside-toggle:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.fireside-toggle:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 3px;
	}

	.fireside-error {
		margin: 0.4rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.fireside-chevron {
			transition: none;
		}
	}

	:global(.dark) .fireside {
		border-color: var(--color-border-dark);
	}

	:global(.dark) .fireside-turn {
		background: var(--color-bg-secondary-dark);
	}

	:global(.dark) .fireside-body {
		color: var(--color-text-dark);
	}

	:global(.dark) .fireside-marker,
	:global(.dark) .fireside-intro,
	:global(.dark) .fireside-who,
	:global(.dark) .fireside-toggle {
		color: var(--color-text-subtle-dark);
	}
</style>
