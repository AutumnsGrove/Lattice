<script lang="ts">
	/**
	 * Fireside — the fire lives inside the editor, not over it.
	 *
	 * DESIGN SESSION SCAFFOLD. Structure comes from docs/specs/fireside-spec.md; the
	 * surface is what Autumn is deciding. Two modes, one surface:
	 *
	 *   solo  — no words yet: the conversation IS the editor surface.
	 *   above — there is substance: the fire sits above your words instead of
	 *           replacing them, so a draft you care about is never hidden.
	 *
	 * Everything runs on local fixture state: no routes, no model, no writes.
	 * When the surface is agreed the fixtures come out and `/api/fireside/*` goes in.
	 */
	import { actionIcons, navIcons, stateIcons, toolIcons } from "@autumnsgrove/prism/icons";

	interface Props {
		open?: boolean;
		mode?: "solo" | "above";
		/** What is already in the editor — decides the accept question, not the mode. */
		draftPreview?: string;
		/** False when the Wanderer has no OpenRouter key yet. The door still opens. */
		hasKey?: boolean;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		mode = "solo",
		draftPreview = "",
		hasKey = true,
		onclose,
	}: Props = $props();

	// Real routing lands with the routes; the settings page shipped with #1856.
	const AI_SETTINGS_HREF = "/arbor/settings/ai";

	const Flame = toolIcons.fireside;
	const Send = actionIcons.send;
	const Check = stateIcons.check;
	const ChevronUp = navIcons.chevronUp;
	const ChevronDown = navIcons.chevronDown;

	type Kind = "turn" | "draft";

	interface Fixture {
		id: string;
		role: "user" | "wisp";
		kind: Kind;
		content: string;
		words?: number;
		lines?: string[];
	}

	let messages = $state<Fixture[]>([
		{
			id: "m1",
			role: "wisp",
			kind: "turn",
			content:
				"You opened the door — what's the thing you keep circling back to? Not the conclusion. The thing you noticed first.",
		},
		{
			id: "m2",
			role: "user",
			kind: "turn",
			content:
				"That the tea shop never actually closes. The sign says eight, but the lights stay on and nobody asks you to leave.",
		},
		{
			id: "m3",
			role: "wisp",
			kind: "turn",
			content:
				"That's the sentence. Do you want to write about the shop, or about being someone who stays too long?",
		},
		{
			id: "m4",
			role: "user",
			kind: "turn",
			content: "The second one. I don't know how to start it, though.",
		},
		{
			id: "m5",
			role: "wisp",
			kind: "draft",
			content: "Built from your sentences above, and the two paragraphs you'd already written.",
			words: 1240,
			lines: [
				"The sign says eight. The lights say otherwise.",
				"I have been the last one in the room more times than I can count,",
				"and I have never once been the one who turned the key.",
			],
		},
	]);

	let resumed = $state(true);
	let input = $state("");
	let thinking = $state(false);
	let draftOpen = $state(false);
	let accepting = $state(false);
	let bodyOpen = $state(true);

	let logEl = $state<HTMLDivElement | null>(null);
	let rootEl = $state<HTMLDivElement | null>(null);
	let everScrolled = false;

	// Above the words, the fire's height is the writer's call: start roomy and
	// let the grab handle pull it between a floor and 85% of the editor frame.
	let heightPx = $state<number | null>(null);
	let dragging = $state(false);
	let dragFrom = { y: 0, h: 0 };

	const MIN_H = 150;
	const MAX_FRACTION = 0.85;

	function clampHeight(next: number) {
		// The page scrolls, so the ceiling is the viewport, not the editor frame.
		const ceiling = Math.round(window.innerHeight * MAX_FRACTION);
		return Math.max(MIN_H, Math.min(next, ceiling));
	}

	function grabDown(event: PointerEvent) {
		if (mode !== "above" || !rootEl) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		dragFrom = { y: event.clientY, h: rootEl.getBoundingClientRect().height };
		event.preventDefault();
	}

	function grabMove(event: PointerEvent) {
		if (!dragging) return;
		heightPx = clampHeight(dragFrom.h + (event.clientY - dragFrom.y));
	}

	function grabUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
	}

	function nudgeHeight(step: number) {
		if (mode !== "above" || !rootEl) return;
		const current = rootEl.getBoundingClientRect().height;
		heightPx = clampHeight(current + step);
	}

	// The fire is taller than whatever space is left under the page header, and the
	// page scrolls — so opening it brings the panel (composer included) into view
	// rather than leaving the box you type into below the fold.
	$effect(() => {
		if (!open || !rootEl) return;
		queueMicrotask(() => rootEl?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
	});

	// Keep the newest turn in view: on send, on a draft, on accept. Not on the
	// first open — the greeting is the point of the blank page.
	$effect(() => {
		void messages.length;
		void draftOpen;
		void accepting;
		void bodyOpen;
		if (!open || !logEl) return;
		if (!everScrolled) {
			everScrolled = true;
			return;
		}
		queueMicrotask(() => {
			logEl?.scrollTo({ top: logEl.scrollHeight, behavior: "smooth" });
		});
	});

	function send() {
		const text = input.trim();
		if (!text || thinking) return;
		input = "";
		resumed = false;
		messages = [...messages, { id: `u${Date.now()}`, role: "user", kind: "turn", content: text }];
		thinking = true;
		setTimeout(() => {
			thinking = false;
			messages = [
				...messages,
				{
					id: `w${Date.now()}`,
					role: "wisp",
					kind: "turn",
					content:
						"(design fixture) — the real reply comes from Lumen. This is here so the shape of a turn is visible.",
				},
			];
		}, 900);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			send();
		}
		if (event.key === "Escape") onclose?.();
	}

	function accept(mode: "top" | "replace") {
		accepting = false;
		draftOpen = false;
		messages = [
			...messages,
			{
				id: `a${Date.now()}`,
				role: "wisp",
				kind: "turn",
				content:
					mode === "top"
						? "(design fixture) — inserted at the top of your draft. Your words are still underneath."
						: "(design fixture) — replaced. Undo is one keystroke, and nothing was saved yet.",
			},
		];
	}

	const hasWords = $derived(draftPreview.trim().length > 0);

	const placeholder = $derived(
		hasWords ? "What are you trying to say here?" : "Say what you're stuck on…",
	);
</script>

{#if open}
	<div
		bind:this={rootEl}
		class="fireside"
		class:solo={mode === "solo"}
		class:above={mode === "above"}
		class:collapsed={mode === "above" && !bodyOpen}
		class:dragging
		style:height={mode === "above" && bodyOpen && heightPx ? `${heightPx}px` : null}
		onkeydown={onKeydown}
		role="region"
		aria-label="Fireside"
	>
		<header class="fs-header">
			<span class="fs-flame" aria-hidden="true"><Flame size={15} /></span>
			<div class="fs-titles">
				<span class="fs-name">Fireside</span>
				{#if mode === "solo"}
					<span class="fs-tagline">a good listener, not a ghostwriter</span>
				{:else}
					<span class="fs-tagline">your words are underneath — nothing is replaced</span>
				{/if}
			</div>
			<div class="fs-head-actions">
				{#if mode === "above"}
					<button
						class="fs-icon-btn"
						onclick={() => (bodyOpen = !bodyOpen)}
						aria-label={bodyOpen ? "Collapse the conversation" : "Open the conversation"}
						title={bodyOpen ? "Collapse" : "Open"}
					>
						{#if bodyOpen}<ChevronDown size={15} />{:else}<ChevronUp size={15} />{/if}
					</button>
				{/if}
				<button class="fs-icon-btn" onclick={() => onclose?.()} aria-label="Close Fireside" title="Close">
					<stateIcons.x size={15} />
				</button>
			</div>
		</header>

		{#if mode === "solo" || bodyOpen}
			<div class="fs-body">
				{#if !hasKey}
					<div class="fs-nokey">
						<span class="fs-nokey-flame" aria-hidden="true"><Flame size={20} /></span>
						<h3>Fireside needs a key before it can listen.</h3>
						<p class="fs-nokey-copy">
							It thinks with <em>your</em> AI key, never Grove's — so a conversation costs you whatever
							your provider charges, and Grove adds nothing on top.
						</p>

						<figure class="fs-nokey-sample">
							<blockquote>
								"You opened the door — what's the thing you keep circling back to? Not the conclusion.
								The thing you noticed first."
							</blockquote>
							<figcaption>What it sounds like, once it's lit.</figcaption>
						</figure>

						<div class="fs-nokey-actions">
							<a class="fs-btn fs-btn-primary" href={AI_SETTINGS_HREF}>Add your AI key</a>
							<button class="fs-btn fs-btn-quiet" onclick={() => onclose?.()}>Not now</button>
						</div>
					</div>
				{:else}
				<div class="fs-log" bind:this={logEl} role="log" aria-live="polite" aria-label="Fireside conversation">
					{#if mode === "solo"}
						<div class="fs-greeting">
							<p>The page is blank. That's the good part.</p>
							<p class="fs-greeting-sub">Tell me what you noticed first — you'll do the writing.</p>
						</div>
					{/if}

					{#if resumed}
						<div class="fs-resume">
							<span>You were here yesterday.</span>
							<button class="fs-link" onclick={() => (resumed = false)}>Pick up</button>
							<span class="fs-dot" aria-hidden="true">·</span>
							<button
								class="fs-link fs-quiet"
								onclick={() => {
									resumed = false;
									messages = messages.slice(0, 1);
								}}>start over</button
							>
						</div>
					{/if}

					{#each messages as message (message.id)}
						{#if message.kind === "draft"}
							<article class="fs-draft" class:open={draftOpen}>
								<p class="fs-draft-kicker">Wisp proposed a draft</p>
								<p class="fs-draft-meta">{message.words?.toLocaleString()} words</p>
								<p class="fs-draft-note">{message.content}</p>

								{#if draftOpen}
									<div class="fs-draft-preview">
										{#each message.lines ?? [] as line}
											<p>{line}</p>
										{/each}
										<p class="fs-draft-more">…</p>
									</div>

									{#if accepting}
										<div class="fs-accept">
											<p class="fs-accept-question">
												You already have words here. What should happen to them?
											</p>
											<div class="fs-accept-buttons">
												<button class="fs-btn fs-btn-primary" onclick={() => accept("top")}>
													Insert at top
												</button>
												<button class="fs-btn" onclick={() => accept("replace")}>Replace everything</button>
												<button class="fs-btn fs-btn-quiet" onclick={() => (accepting = false)}>
													Cancel
												</button>
											</div>
										</div>
									{:else}
										<div class="fs-draft-actions">
											<button
												class="fs-btn fs-btn-primary"
												onclick={() => {
													// Blank page: nothing to merge with, so it goes straight in.
													// Words already there: ask before touching them.
													if (hasWords) accepting = true;
													else accept("replace");
												}}
												aria-label="Use this draft"
											>
												<Check size={13} />
												Use this draft
											</button>
											<button class="fs-btn fs-btn-quiet" onclick={() => (draftOpen = false)}>
												Keep talking
											</button>
										</div>
									{/if}
								{:else}
									<div class="fs-draft-actions">
										<button class="fs-btn" onclick={() => (draftOpen = true)}>Read it</button>
										<button class="fs-btn fs-btn-quiet" onclick={() => (draftOpen = false)}>Not yet</button>
									</div>
								{/if}
							</article>
						{:else if message.role === "wisp"}
							<div class="fs-turn fs-wisp"><p>{message.content}</p></div>
						{:else}
							<div class="fs-turn fs-user"><p>{message.content}</p></div>
						{/if}
					{/each}

					{#if thinking}
						<div class="fs-turn fs-wisp fs-thinking" aria-label="Wisp is thinking">
							<span></span><span></span><span></span>
						</div>
					{/if}
				</div>

				<div class="fs-composer">
					<div class="fs-input-row">
						<textarea
							bind:value={input}
							onkeydown={onKeydown}
							rows={mode === "solo" ? 3 : 1}
							{placeholder}
							aria-label="Message Wisp"
						></textarea>
						<button class="fs-send" onclick={send} disabled={!input.trim() || thinking} aria-label="Send">
							<Send size={15} />
						</button>
					</div>
					{#if mode === "solo"}
						<div class="fs-hint-row">
							<p class="fs-hint">Wisp asks. You write. Nothing enters your draft until you say so.</p>
							<button class="fs-link fs-quiet" onclick={() => onclose?.()}>
								or start writing instead
							</button>
						</div>
					{/if}
				</div>
				{/if}
			</div>
		{/if}

		{#if mode === "above" && bodyOpen}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="fs-grabber"
				role="separator"
				aria-orientation="horizontal"
				aria-label="Resize the conversation"
				tabindex="0"
				onpointerdown={grabDown}
				onpointermove={grabMove}
				onpointerup={grabUp}
				onpointercancel={grabUp}
				onkeydown={(e) => {
					if (e.key === "ArrowUp") {
						e.preventDefault();
						nudgeHeight(-32);
					}
					if (e.key === "ArrowDown") {
						e.preventDefault();
						nudgeHeight(32);
					}
				}}
			><span></span></div>
		{/if}
	</div>
{/if}

<style>
	.fireside {
		display: flex;
		flex-direction: column;
		min-height: 0;
		/* Arbor paints its seasonal texture above page content; the fire reads as
		   foreground, so it sits above the texture rather than through it. */
		position: relative;
		z-index: 1;
		background: var(--light-bg-primary, #fff);
		color: var(--color-text);
		border: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		overflow: hidden;
	}

	/* No words yet: the fire is the editor surface. Fixed height, not min-height —
	   a conversation that grows as you talk pushes the composer down the page. */
	.fireside.solo {
		flex: 0 0 auto;
		height: 70vh;
		border-radius: 8px;
	}

	/* Words exist: the fire sits above them, inside the same frame. */
	.fireside.above {
		flex: 0 0 auto;
		height: 60vh;
		border-radius: 8px 8px 0 0;
		border-bottom: none;
	}

	.fireside.above.collapsed {
		height: auto;
	}

	.fireside.dragging {
		user-select: none;
	}

	.fs-grabber {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 0.5rem;
		cursor: row-resize;
		background: var(--color-bg-secondary, #f5f5f5);
		border-top: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		touch-action: none;
	}

	.fs-grabber span {
		width: 2.25rem;
		height: 3px;
		border-radius: 999px;
		background: var(--color-border, #ddd);
		transition: background 120ms ease;
	}

	.fs-grabber:hover span,
	.fs-grabber:focus-visible span {
		background: var(--grove-accent-50);
	}

	.fs-grabber:focus-visible {
		outline: 2px solid var(--grove-accent-40);
		outline-offset: -2px;
	}

	/* ── Header ────────────────────────────────────────────────────────── */
	.fs-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		background: var(--color-bg-secondary, #f5f5f5);
		font-family: system-ui, sans-serif;
		flex-shrink: 0;
	}

	.fs-flame {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--grove-accent-12);
		color: var(--grove-accent);
		flex-shrink: 0;
	}

	.fs-titles {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.fs-name {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.fs-tagline {
		font-size: 0.75rem;
		font-style: italic;
		color: var(--color-text-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fs-head-actions {
		display: flex;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.fs-icon-btn {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: var(--color-text-subtle);
		cursor: pointer;
	}

	.fs-icon-btn:hover {
		background: var(--grove-accent-10);
		color: var(--color-text);
	}

	/* ── Body ──────────────────────────────────────────────────────────── */
	.fs-body {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}

	.fs-log {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem 1.25rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: system-ui, sans-serif;
	}

	.fs-greeting {
		padding: 1.5rem 0 1rem;
		text-align: center;
	}

	.fs-greeting p {
		margin: 0;
		font-size: 1.0625rem;
		color: var(--color-text);
	}

	.fs-greeting .fs-greeting-sub {
		margin-top: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text-subtle);
	}

	.fs-resume {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		border: 1px dashed var(--editor-border, var(--color-border, #e3ded4));
		border-radius: 0.5rem;
		padding: 0.375rem 0.625rem;
		flex-wrap: wrap;
	}

	.fs-dot {
		color: var(--color-text-subtle);
	}

	.fs-link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--grove-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}

	.fs-link.fs-quiet {
		color: var(--color-text-subtle);
	}

	.fs-turn p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.fs-wisp {
		max-width: 92%;
	}

	.fs-user {
		align-self: flex-end;
		max-width: 86%;
		padding: 0.4375rem 0.6875rem;
		border-radius: 0.75rem 0.75rem 0.125rem 0.75rem;
		background: var(--grove-accent-10);
	}

	.fs-thinking {
		display: flex;
		gap: 0.25rem;
		padding: 0.375rem 0;
	}

	.fs-thinking span {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 999px;
		background: var(--color-text-subtle);
		animation: fs-pulse 1.2s infinite ease-in-out;
	}

	.fs-thinking span:nth-child(2) {
		animation-delay: 0.15s;
	}
	.fs-thinking span:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes fs-pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.9;
		}
	}

	/* ── Draft card ────────────────────────────────────────────────────── */
	.fs-draft {
		border: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		border-radius: 0.5rem;
		background: var(--color-bg-secondary, #faf8f4);
		padding: 0.75rem;
	}

	.fs-draft-kicker {
		margin: 0;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-subtle);
	}

	.fs-draft-meta {
		margin: 0.125rem 0 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.fs-draft-note {
		margin: 0 0 0.625rem;
		font-size: 0.8125rem;
		line-height: 1.55;
		color: var(--color-text-muted);
	}

	.fs-draft-preview {
		border-left: 2px solid var(--grove-accent-30);
		padding-left: 0.625rem;
		margin: 0 0 0.625rem;
	}

	.fs-draft-preview p {
		margin: 0 0 0.1875rem;
		font-size: 0.8125rem;
		line-height: 1.6;
	}

	.fs-draft-more {
		color: var(--color-text-subtle);
	}

	.fs-draft-actions,
	.fs-accept-buttons {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.fs-accept {
		border-top: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		padding-top: 0.625rem;
	}

	.fs-accept-question {
		margin: 0 0 0.4375rem;
		font-size: 0.8125rem;
	}

	/* ── Buttons ───────────────────────────────────────────────────────── */
	.fs-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.3125rem 0.625rem;
		border-radius: 0.4375rem;
		border: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.fs-btn:hover {
		background: var(--grove-accent-8);
		border-color: var(--grove-accent-30);
	}

	.fs-btn-primary {
		background: var(--grove-accent);
		border-color: var(--grove-accent);
		color: var(--grove-accent-foreground, #fff);
	}

	.fs-btn-primary:hover {
		background: var(--grove-accent-dark);
		border-color: var(--grove-accent-dark);
	}

	.fs-btn-quiet {
		border-color: transparent;
		color: var(--color-text-subtle);
	}

	/* ── No key yet ────────────────────────────────────────────────────── */
	.fs-nokey {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 1.75rem 1.5rem;
		font-family: system-ui, sans-serif;
	}

	.fs-nokey-flame {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--grove-accent-12);
		color: var(--grove-accent);
	}

	.fs-nokey h3 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.fs-nokey-copy {
		margin: 0;
		max-width: 46ch;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	.fs-nokey-sample {
		margin: 0.25rem 0 0;
		padding: 0.75rem 0.875rem;
		border-left: 2px solid var(--grove-accent-30);
		background: var(--color-bg-secondary, #f5f5f5);
		border-radius: 0 0.375rem 0.375rem 0;
		max-width: 52ch;
	}

	.fs-nokey-sample blockquote {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.6;
		font-style: italic;
		color: var(--color-text);
	}

	.fs-nokey-sample figcaption {
		margin-top: 0.375rem;
		font-size: 0.6875rem;
		color: var(--color-text-subtle);
	}

	.fs-nokey-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.375rem;
	}

	.fs-nokey-actions a.fs-btn {
		text-decoration: none;
	}

	/* ── Composer ──────────────────────────────────────────────────────── */
	.fs-composer {
		flex-shrink: 0;
		border-top: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		padding: 0.625rem 1.25rem 0.625rem;
		font-family: system-ui, sans-serif;
	}

	.fireside.above .fs-composer {
		padding: 0.4375rem 0.875rem 0.5rem;
	}

	.fs-input-row {
		display: flex;
		align-items: flex-end;
		gap: 0.4375rem;
	}

	.fs-input-row textarea {
		flex: 1;
		resize: none;
		padding: 0.4375rem 0.5625rem;
		border-radius: 0.4375rem;
		border: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		background: var(--light-bg-primary, #fff);
		color: var(--color-text);
		font: inherit;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.fs-input-row textarea:focus-visible {
		outline: 2px solid var(--grove-accent-40);
		outline-offset: 1px;
	}

	.fs-send {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.4375rem;
		border: none;
		background: var(--grove-accent);
		color: var(--grove-accent-foreground, #fff);
		cursor: pointer;
	}

	.fs-send:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.fs-hint-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		margin-top: 0.375rem;
	}

	.fs-hint {
		margin: 0;
		font-size: 0.6875rem;
		color: var(--color-text-subtle);
	}

	@media (max-width: 768px) {
		.fireside.above {
			max-height: 50%;
		}

		.fs-tagline {
			display: none;
		}

		.fs-log {
			padding: 0.75rem 0.875rem 0.375rem;
		}

		.fs-composer {
			padding: 0.5rem 0.875rem 0.5rem;
		}
	}
</style>
