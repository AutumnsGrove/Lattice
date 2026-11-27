<script lang="ts">
	/**
	 * Fireside — the fire lives inside the editor, not over it.
	 *
	 * Structure comes from `docs/specs/fireside-spec.md`; the API is the six routes
	 * under `/api/fireside`. Two modes, one surface:
	 *
	 *   solo  — no words yet: the conversation IS the editor surface.
	 *   above — there is substance: the fire sits above your words instead of
	 *           replacing them, so a draft you care about is never hidden.
	 *
	 * What this component does not do is write the editor. Accepting a proposal calls
	 * `onaccept`, and the page merges and saves — a component that held the editor's
	 * content would be a second writer racing autosave.
	 */
	import { actionIcons, navIcons, stateIcons, toolIcons } from "@autumnsgrove/prism/icons";

	/** A proposal, as `POST /draft` returns it (anchors already resolved by the tool). */
	export interface Proposal {
		title: string;
		body: string;
		vines: { anchor: string; text: string }[];
	}

	interface Props {
		open?: boolean;
		mode?: "solo" | "above";
		/** What is already in the editor. Sent with each turn so `read_draft` can read it. */
		draftPreview?: string;
		/** False when the Wanderer has no OpenRouter key yet. The door still opens. */
		hasKey?: boolean;
		onclose?: () => void;
		/** The page merges the proposal into the editor and saves. */
		onaccept?: (
			proposal: Proposal,
			mode: "replace" | "top",
			transcriptPublic: boolean,
		) => Promise<void>;
	}

	let {
		open = $bindable(false),
		mode = "solo",
		draftPreview = "",
		hasKey = true,
		onclose,
		onaccept,
	}: Props = $props();

	const Flame = toolIcons.fireside;
	const Send = actionIcons.send;
	const Check = stateIcons.check;
	const ChevronUp = navIcons.chevronUp;
	const ChevronDown = navIcons.chevronDown;

	const AI_SETTINGS_HREF = "/arbor/settings/ai";

	/**
	 * The house rule is that client code does not call `fetch` bare. Importing the
	 * engine's `api` helper here made the component suite hang, so this carries the
	 * two things that rule exists for — the CSRF token the layout renders, and
	 * `credentials: "include"` — and each call is marked `csrf-ok` accordingly.
	 */
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

	const NOT_FOUND = /\b404\b|not found/i;
	const NO_KEY = /no ai key is set|settings → ai/i;

	interface Message {
		id: string;
		role: "user" | "wisp";
		kind: "turn" | "draft";
		content: string;
	}

	let sessionId = $state<string | null>(null);
	let messages = $state<Message[]>([]);
	let input = $state("");
	let thinking = $state(false);
	let starting = $state(false);
	let draftOpen = $state(false);
	let accepting = $state(false);
	let acceptingBusy = $state(false);
	let transcriptPublic = $state(false);
	let proposal = $state<Proposal | null>(null);
	let canDraft = $state(false);
	let error = $state<string | null>(null);
	let unavailable = $state(false);

	let logEl = $state<HTMLDivElement | null>(null);
	let rootEl = $state<HTMLDivElement | null>(null);
	let everScrolled = false;

	const hasWords = $derived(draftPreview.trim().length > 0);
	const placeholder = $derived(
		hasWords ? "What are you trying to say here?" : "Say what you're stuck on…",
	);

	/** The fire is taller than the space left under the page header; the page scrolls. */
	$effect(() => {
		if (!open || !rootEl) return;
		queueMicrotask(() => rootEl?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }));
	});

	// Keep the newest turn in view: on send, on a proposal, on accept. Not on the
	// first open — the greeting is the point of a blank page.
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
		queueMicrotask(() => logEl?.scrollTo?.({ top: logEl.scrollHeight, behavior: "smooth" }));
	});

	// Lighting the fire happens once per session, and only when the panel opens with
	// a key. A resume after that is a GET, so a refresh does not fork the conversation.
	$effect(() => {
		if (!open || !hasKey || sessionId !== null || starting) return;
		void begin();
	});

	let bodyOpen = $state(true);

	async function begin() {
		starting = true;
		error = null;
		try {
			const started = await post<{ sessionId: string; opening: string }>("/api/fireside", {
				draft: draftPreview,
			});
			sessionId = started.sessionId;
			messages = [wispMessage(started.opening)];
		} catch (cause) {
			settle(cause);
		} finally {
			starting = false;
		}

		// The composer unlocks as soon as there is a session to send to; the resume
		// (and the draft gate) arrive after, and must not hold the writer's keyboard
		// hostage while they do.
		if (sessionId !== null) void refresh(sessionId);
	}

	async function send() {
		const text = input.trim();
		if (text === "" || thinking || sessionId === null) return;

		input = "";
		error = null;
		messages = [
			...messages,
			{ id: `local-${Date.now()}`, role: "user", kind: "turn", content: text },
		];
		thinking = true;

		try {
			const answered = await post<{ reply: string }>(`/api/fireside/${sessionId}/turn`, {
				message: text,
				draft: draftPreview,
			});
			// The writer's sentence stays where they put it. Only the answer is added.
			messages = [...messages, wispMessage(answered.reply)];
			// The gate is the server's to decide — it counts the writer's words, not
			// Wisp's — but the transcript on screen is already right, so this asks for
			// the verdict only.
			await syncDraftGate();
		} catch (cause) {
			// The writer's sentence stays in the transcript: they did say it.
			settle(cause);
		} finally {
			thinking = false;
		}
	}

	async function shapeIntoDraft() {
		if (sessionId === null) return;
		thinking = true;
		error = null;
		try {
			const result = await post<{ drafted: boolean; proposal?: Proposal; message?: string }>(
				`/api/fireside/${sessionId}/draft`,
				{ draft: draftPreview },
			);
			if (!result.drafted || !result.proposal) {
				error = result.message ?? "Not yet.";
				return;
			}
			proposal = result.proposal;
			draftOpen = true;
			messages = [
				...messages,
				{ id: `draft-${Date.now()}`, role: "wisp", kind: "draft", content: result.proposal.title },
			];
			canDraft = false;
		} catch (cause) {
			settle(cause);
		} finally {
			thinking = false;
		}
	}

	async function accept(merge: "replace" | "top") {
		if (!proposal || !onaccept || sessionId === null) return;
		acceptingBusy = true;
		error = null;
		try {
			await onaccept(proposal, merge, transcriptPublic, sessionId);
			accepting = false;
			draftOpen = false;
		} catch (cause) {
			settle(cause);
		} finally {
			acceptingBusy = false;
		}
	}

	/** Whether there is enough to organize. One question, one field. */
	async function syncDraftGate() {
		if (sessionId === null) return;
		const body = await read<{ canDraft?: boolean }>(`/api/fireside/${sessionId}`);
		canDraft = body?.canDraft === true;
	}

	/** The conversation as the database has it, which is also what `canDraft` is about. */
	async function refresh(forSession = sessionId) {
		if (forSession === null) return;
		const before = messages.length;
		const body = await read<{
			messages: { id: string; role: "user" | "wisp"; kind: "turn" | "draft"; content: string }[];
			canDraft: boolean;
		}>(`/api/fireside/${forSession}`);
		if (!body) return;
		// A read that started before the writer said something must not land after it:
		// adopting a stale transcript would erase a turn the server has already taken.
		if (messages.length !== before) return;
		canDraft = body.canDraft;
		if (body.messages.length === 0) return; // nothing to adopt; keep what is on screen
		messages = body.messages.map((message) => {
			if (message.kind !== "draft") return message;
			// A proposal is stored as its payload, so a resume can show it without
			// re-running the model. The card wants the title; the payload wants keeping.
			const stored = parseProposal(message.content);
			if (stored) proposal = stored;
			return { ...message, content: stored?.title ?? message.content };
		});
	}

	function parseProposal(content: string): Proposal | null {
		try {
			const parsed = JSON.parse(content) as Partial<Proposal>;
			if (typeof parsed.title === "string" && typeof parsed.body === "string") {
				return { title: parsed.title, body: parsed.body, vines: parsed.vines ?? [] };
			}
		} catch {
			// A proposal from an older shape is still a proposal; the card just says less.
		}
		return null;
	}

	function wispMessage(content: string): Message {
		return { id: `wisp-${crypto.randomUUID()}`, role: "wisp", kind: "turn", content };
	}

	/**
	 * Every failure the panel can meet, said in the writer's terms.
	 *
	 * `404` is not an error here: Fireside ships on beta, so a `404` means this
	 * deployment does not have it, and saying "not found" would read as a bug.
	 */
	function settle(cause: unknown) {
		const message = cause instanceof Error ? cause.message : "";
		if (NOT_FOUND.test(message)) {
			unavailable = true;
			return;
		}
		if (NO_KEY.test(message)) {
			hasKey = false;
			return;
		}
		error = message.trim() === "" ? "Something went wrong. Try again in a moment." : message;
	}

	function wordCount(text: string): number {
		return text.trim().split(/\s+/).filter(Boolean).length;
	}

	/** The first few paragraphs, for a preview the writer can judge. */
	function openingParagraphs(body: string): string[] {
		return body
			.split(/\n\s*\n/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean)
			.slice(0, 3);
	}

	async function post<T>(url: string, payload: unknown): Promise<T> {
		const response = await fetch(url, {
			method: "POST",
			credentials: "include",
			headers: {
				"content-type": "application/json",
				...(csrfToken() ? { "x-csrf-token": csrfToken() as string } : {}),
			},
			body: JSON.stringify(payload),
		}); // csrf-ok
		if (!response.ok) {
			const body = (await response.json().catch(() => ({}))) as {
				message?: string;
				error?: string;
			};
			throw new Error(body.message ?? body.error ?? `${response.status} ${response.statusText}`);
		}
		return (await response.json()) as T;
	}

	/** A read that is allowed to fail quietly: a resume is a nicety, not the turn. */
	async function read<T>(url: string): Promise<T | null> {
		try {
			const response = await fetch(url, { credentials: "include" }); // csrf-ok
			if (!response.ok) return null;
			return (await response.json()) as T;
		} catch {
			return null;
		}
	}

	/** Enter sends, Shift+Enter is a newline. Escape is the page's job (window). */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void send();
		}
	}

	function nudgeHeight(step: number) {
		if (mode !== "above" || !rootEl) return;
		const current = rootEl.getBoundingClientRect().height;
		heightPx = clampHeight(current + step);
	}

	// Above the words, the fire's height is the writer's call: start roomy and let
	// the grab handle pull it between a floor and 85% of the viewport.
	let heightPx = $state<number | null>(null);
	let dragging = $state(false);
	let dragFrom = { y: 0, h: 0 };

	const MIN_H = 150;
	const MAX_FRACTION = 0.85;

	function clampHeight(next: number) {
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
				<button
					class="fs-icon-btn"
					onclick={() => onclose?.()}
					aria-label="Close Fireside"
					title="Close"
				>
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
								"You opened the door — what's the thing you keep circling back to? Not the
								conclusion. The thing you noticed first."
							</blockquote>
							<figcaption>What it sounds like, once it's lit.</figcaption>
						</figure>

						<div class="fs-nokey-actions">
							<a class="fs-btn fs-btn-primary" href={AI_SETTINGS_HREF}>Add your AI key</a>
							<button class="fs-btn fs-btn-quiet" onclick={() => onclose?.()}>Not now</button>
						</div>
					</div>
				{:else if unavailable}
					<div class="fs-nokey">
						<span class="fs-nokey-flame" aria-hidden="true"><Flame size={20} /></span>
						<h3>Fireside isn't switched on here yet.</h3>
						<p class="fs-nokey-copy">
							It's on the beta deployment while it's being built. Nothing is wrong with this grove —
							there's just nothing here to light.
						</p>
						<div class="fs-nokey-actions">
							<button class="fs-btn fs-btn-quiet" onclick={() => onclose?.()}>Close</button>
						</div>
					</div>
				{:else}
					<div
						class="fs-log"
						bind:this={logEl}
						role="log"
						aria-live="polite"
						aria-label="Fireside conversation"
					>
						{#if mode === "solo" && messages.length === 0}
							<div class="fs-greeting">
								<p>The page is blank. That's the good part.</p>
								<p class="fs-greeting-sub">
									Tell me what you noticed first — you'll do the writing.
								</p>
							</div>
						{/if}

						{#each messages as message (message.id)}
							{#if message.kind === "draft"}
								<article class="fs-draft" class:open={draftOpen}>
									<p class="fs-draft-kicker">Wisp proposed a draft</p>
									<p class="fs-draft-meta">
										{message.content} · {wordCount(proposal?.body ?? "")}&nbsp;words
									</p>

									{#if draftOpen && proposal}
										<div class="fs-draft-preview">
											{#each openingParagraphs(proposal.body) as paragraph}
												<p>{paragraph}</p>
											{/each}
											<p class="fs-draft-more">…</p>
										</div>

										{#if accepting}
											<div class="fs-accept">
												<p class="fs-accept-question">
													{hasWords
														? "You already have words here. What should happen to them?"
														: "Nothing is on the page yet. Ready for it?"}
												</p>
												<label class="fs-check">
													<input type="checkbox" bind:checked={transcriptPublic} />
													<span
														>Publish this conversation under the post, so readers see how it was
														written</span
													>
												</label>
												<div class="fs-accept-buttons">
													{#if hasWords}
														<button
															class="fs-btn fs-btn-primary"
															disabled={acceptingBusy}
															onclick={() => void accept("top")}
														>
															Insert at top
														</button>
														<button
															class="fs-btn"
															disabled={acceptingBusy}
															onclick={() => void accept("replace")}
														>
															Replace everything
														</button>
													{:else}
														<button
															class="fs-btn fs-btn-primary"
															disabled={acceptingBusy}
															onclick={() => void accept("replace")}
														>
															Use it
														</button>
													{/if}
													<button
														class="fs-btn fs-btn-quiet"
														disabled={acceptingBusy}
														onclick={() => (accepting = false)}
													>
														Cancel
													</button>
												</div>
											</div>
										{:else}
											<div class="fs-draft-actions">
												<button class="fs-btn fs-btn-primary" onclick={() => (accepting = true)}>
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
											<button class="fs-btn fs-btn-quiet" onclick={() => (draftOpen = false)}
												>Not yet</button
											>
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

					{#if error}
						<p class="fs-error" role="alert">{error}</p>
					{/if}

					<div class="fs-composer">
						<div class="fs-input-row">
							<textarea
								bind:value={input}
								onkeydown={onKeydown}
								rows={mode === "solo" ? 3 : 1}
								{placeholder}
								aria-label="Message Wisp"
								disabled={starting || sessionId === null}
							></textarea>
							<button
								class="fs-send"
								onclick={() => void send()}
								disabled={!input.trim() || thinking || sessionId === null}
								aria-label="Send"
							>
								<Send size={15} />
							</button>
						</div>
						<div class="fs-hint-row">
							<p class="fs-hint">
								Wisp asks. You write. Nothing enters your draft until you say so.
							</p>
							{#if canDraft && !proposal}
								<button class="fs-link" onclick={() => void shapeIntoDraft()}
									>Shape it into a draft</button
								>
							{:else if mode === "solo"}
								<button class="fs-link fs-quiet" onclick={() => onclose?.()}>
									or start writing instead
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if mode === "above" && bodyOpen}
			<button
				type="button"
				class="fs-grabber"
				aria-label="Resize the conversation"
				title="Drag to resize"
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
				}}><span></span></button
			>
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
		width: 100%;
		height: 0.5rem;
		padding: 0;
		border: none;
		border-top: 1px solid var(--editor-border, var(--color-border, #e3ded4));
		cursor: row-resize;
		background: var(--color-bg-secondary, #f5f5f5);
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

	.fs-check {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin: 0 0 0.625rem;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.fs-check input {
		margin-top: 0.1875rem;
		accent-color: var(--grove-accent);
	}

	.fs-error {
		margin: 0;
		padding: 0.5rem 1.25rem;
		font-size: 0.8125rem;
		color: var(--color-text);
		background: var(--color-bg-secondary, #f5f5f5);
		border-top: 1px solid var(--color-border, #ddd);
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
