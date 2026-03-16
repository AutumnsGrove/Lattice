<script lang="ts">
	/**
	 * FiresideChat - Conversational Writing Mode
	 *
	 * A chat interface that replaces the editor when in Fireside mode.
	 * Helps writers who freeze at the blank page by turning conversation into drafts.
	 *
	 * Built on GlassChat — this component owns only Fireside-specific domain logic:
	 * API calls, draft mode, and the fire-themed personality.
	 *
	 * @fires draft - When user accepts a generated draft { title: string, content: string, marker: string }
	 * @fires close - When user exits Fireside mode without a draft
	 */

	import { phaseIcons, navIcons, stateIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import GlassChat from "$lib/ui/components/ui/glasschat/GlassChat.svelte";
	import { createAIChatController } from "$lib/ui/components/ui/glasschat/controller.svelte";
	import type { ChatRoleMap } from "$lib/ui/components/ui/glasschat/types";
	import { api } from "$lib/utils/api";

	// ============================================================================
	// Props & Events
	// ============================================================================

	interface Props {
		/** Called when user accepts a draft */
		onDraft?: (draft: { title: string; content: string; marker: string }) => void;
		/** Called when user exits without drafting */
		onClose?: () => void;
	}

	let { onDraft, onClose }: Props = $props();

	// ============================================================================
	// Role Configuration
	// ============================================================================

	const FIRESIDE_ROLES: ChatRoleMap = {
		wisp: {
			label: "Wisp",
			align: "start",
			bubbleClass:
				"bg-[var(--grove-bg-secondary,#2a2a2a)] border border-[var(--grove-border,#333)]",
		},
		user: {
			label: "You",
			align: "end",
			bubbleClass: "bg-[var(--grove-accent-primary,#4a7c59)] text-white",
		},
	};

	// ============================================================================
	// API Response Types
	// ============================================================================

	interface StartResponse {
		conversationId: string;
		reply: string;
	}

	interface RespondResponse {
		reply: string;
		canDraft: boolean;
	}

	interface DraftResponse {
		title: string;
		content: string;
		marker: string;
		warning?: string;
	}

	// ============================================================================
	// Chat Controller
	// ============================================================================

	// Domain state that extends beyond the generic chat lifecycle
	let canDraft = $state(false);
	let conversationId = $state<string | null>(null);
	let draftMode = $state(false);
	let draft = $state<{ title: string; content: string; marker: string; warning?: string } | null>(
		null,
	);
	let isDrafting = $state(false);

	const chat = createAIChatController({
		aiRole: "wisp",
		async onSend(message, messages) {
			const data = await api.post<RespondResponse>("/api/grove/wisp/fireside", {
				action: "respond",
				message,
				conversation: messages,
			});
			if (!data) throw new Error("Failed to send message");

			canDraft = data.canDraft;
			return { content: data.reply };
		},
	});

	// ============================================================================
	// Helpers
	// ============================================================================

	const WORDS_PER_MINUTE = 200;

	function getWordCount(content: string): number {
		return content.trim().split(/\s+/).filter(Boolean).length;
	}

	function getReadingTime(content: string): number {
		return Math.max(1, Math.ceil(getWordCount(content) / WORDS_PER_MINUTE));
	}

	// ============================================================================
	// Fireside Domain Logic
	// ============================================================================

	async function startConversation() {
		chat.setLoading(true);
		chat.setError(null);

		try {
			const data = await api.post<StartResponse>("/api/grove/wisp/fireside", { action: "start" });
			if (!data) throw new Error("Failed to start conversation");

			conversationId = data.conversationId;
			chat.addMessage("wisp", data.reply);
		} catch (err) {
			chat.setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			chat.setLoading(false);
		}
	}

	async function generateDraft() {
		if (isDrafting) return;

		isDrafting = true;
		chat.setError(null);

		try {
			const data = await api.post<DraftResponse>("/api/grove/wisp/fireside", {
				action: "draft",
				conversation: chat.messages,
				conversationId,
			});
			if (!data) throw new Error("Failed to generate draft");
			draft = {
				title: data.title,
				content: data.content,
				marker: data.marker,
				warning: data.warning,
			};
			draftMode = true;
		} catch (err) {
			chat.setError(err instanceof Error ? err.message : "Failed to generate draft");
		} finally {
			isDrafting = false;
		}
	}

	function acceptDraft() {
		if (draft && onDraft) {
			onDraft(draft);
		}
	}

	function backToChat() {
		draftMode = false;
		draft = null;
	}

	function handleClose() {
		onClose?.();
	}

	// ============================================================================
	// Lifecycle
	// ============================================================================

	$effect(() => {
		startConversation();
	});
</script>

<div class="fireside-container">
	{#if draftMode && draft}
		<!-- Draft Preview Mode -->
		<div class="draft-view">
			<header class="draft-header">
				<button class="back-button" onclick={backToChat} type="button">
					<navIcons.arrowLeft class="w-4 h-4" />
					Back to chat
				</button>
				<h2>Your Draft</h2>
			</header>

			<div class="draft-content">
				<h1 class="draft-title">{draft.title}</h1>
				<div class="draft-body">{draft.content}</div>
				<div class="draft-meta">
					<span>{getWordCount(draft.content)} words</span>
					<span class="meta-divider">·</span>
					<span>~{getReadingTime(draft.content)} min read</span>
				</div>
				{#if draft.warning}
					<p class="draft-warning">{draft.warning}</p>
				{/if}
				<p class="draft-marker">{draft.marker}</p>
			</div>

			<footer class="draft-actions">
				<button class="action-secondary" onclick={backToChat} type="button">
					<actionIcons.rotateCcw class="w-4 h-4" />
					Keep chatting
				</button>
				<button class="action-primary" onclick={acceptDraft} type="button">
					<stateIcons.check class="w-4 h-4" />
					Use this draft
				</button>
			</footer>
		</div>
	{:else}
		<!-- Chat Mode via GlassChat -->
		<GlassChat
			messages={chat.messages}
			roles={FIRESIDE_ROLES}
			isLoading={chat.isLoading}
			loadingRole="wisp"
			error={chat.error}
			bind:inputValue={chat.inputValue}
			onSend={chat.send}
			inputDisabled={chat.isLoading}
			inputPlaceholder="Type your thoughts..."
			onClose={handleClose}
			variant="dark"
			class="h-full"
		>
			{#snippet header()}
				<header class="fireside-header">
					<div class="fire-art" aria-hidden="true">
						<pre>{`     ~  ~
    (    )
   (      )
  ~~~~~~~~~~`}</pre>
					</div>
					<h2>Fireside with Wisp</h2>
					<p class="fireside-subtitle">sit by the fire and tell me what's on your mind</p>
					<button
						class="close-button"
						onclick={handleClose}
						type="button"
						aria-label="Exit Fireside"
					>
						<stateIcons.x class="w-4 h-4" />
					</button>
				</header>
			{/snippet}

			{#snippet inputToolbar()}
				{#if canDraft}
					<button class="draft-button" onclick={generateDraft} disabled={isDrafting} type="button">
						<phaseIcons.sparkles class="w-4 h-4" />
						{isDrafting ? "Drafting..." : "Ready to draft"}
					</button>
				{:else if chat.messages.length > 0}
					<p
						class="draft-hint"
						title="Share a few more thoughts and I'll be able to help shape them into a draft"
					>
						<phaseIcons.sparkles class="w-4 h-4" />
						<span>Keep chatting - drafting unlocks after a few exchanges</span>
					</p>
				{/if}
			{/snippet}

			{#snippet inputFooter()}
				<p class="philosophy">~ a good listener, not a ghostwriter ~</p>
			{/snippet}
		</GlassChat>
	{/if}
</div>

<style>
	.fireside-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 500px;
		color: var(--grove-text-primary, #e8e8e8);
		font-family: var(--grove-font-sans, system-ui, sans-serif);
		border-radius: var(--grove-radius-lg, 12px);
		overflow: hidden;
	}

	/* ===== Fireside Header ===== */
	.fireside-header {
		position: relative;
		padding: 1.5rem;
		text-align: center;
		background: linear-gradient(180deg, rgba(255, 140, 50, 0.1) 0%, transparent 100%);
		border-bottom: 1px solid var(--grove-border, #333);
	}

	.fire-art {
		color: var(--grove-accent-warm, #ff8c32);
		font-family: monospace;
		font-size: 0.875rem;
		line-height: 1.2;
		margin-bottom: 0.5rem;
		opacity: 0.8;
	}

	.fire-art pre {
		margin: 0;
	}

	.fireside-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--grove-text-primary, #e8e8e8);
	}

	.fireside-subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: var(--grove-text-secondary, #a0a0a0);
		font-style: italic;
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: var(--grove-text-secondary, #a0a0a0);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		line-height: 1;
		border-radius: var(--grove-radius-sm, 4px);
	}

	.close-button:hover {
		color: var(--grove-text-primary, #e8e8e8);
		background: var(--grove-bg-secondary, #2a2a2a);
	}

	/* ===== Toolbar: Draft Button & Hint ===== */
	.draft-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: linear-gradient(135deg, var(--grove-accent-warm, #ff8c32) 0%, #e67320 100%);
		color: white;
		border: none;
		border-radius: var(--grove-radius-md, 8px);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}

	.draft-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 140, 50, 0.3);
	}

	.draft-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.draft-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		color: var(--grove-text-secondary, #a0a0a0);
		font-style: italic;
		cursor: help;
		margin: 0;
	}

	.draft-hint:hover {
		color: var(--grove-text-primary, #e8e8e8);
	}

	.philosophy {
		margin: 0;
		font-size: 0.75rem;
		color: var(--grove-text-secondary, #a0a0a0);
		text-align: center;
		font-style: italic;
	}

	/* ===== Draft View ===== */
	.draft-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--grove-bg-primary, #1a1a1a);
	}

	.draft-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--grove-border, #333);
	}

	.draft-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--grove-bg-secondary, #2a2a2a);
		border: 1px solid var(--grove-border, #333);
		border-radius: var(--grove-radius-md, 8px);
		color: var(--grove-text-secondary, #a0a0a0);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.back-button:hover {
		color: var(--grove-text-primary, #e8e8e8);
		border-color: var(--grove-border-hover, #444);
	}

	.draft-content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}

	.draft-title {
		margin: 0 0 1.5rem;
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.draft-body {
		font-size: 1.0625rem;
		line-height: 1.7;
		color: var(--grove-text-primary, #e8e8e8);
		white-space: pre-wrap;
	}

	.draft-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		font-size: 0.875rem;
		color: var(--grove-text-secondary, #a0a0a0);
	}

	.meta-divider {
		opacity: 0.5;
	}

	.draft-warning {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 193, 7, 0.1);
		border: 1px solid rgba(255, 193, 7, 0.25);
		border-radius: var(--grove-radius-md, 8px);
		color: var(--grove-text-secondary, #a0a0a0);
		font-size: 0.875rem;
		font-style: italic;
	}

	.draft-marker {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--grove-border, #333);
		font-style: italic;
		color: var(--grove-text-secondary, #a0a0a0);
		font-size: 0.875rem;
	}

	.draft-actions {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--grove-border, #333);
		background: var(--grove-bg-secondary, #2a2a2a);
	}

	.action-secondary,
	.action-primary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: var(--grove-radius-md, 8px);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-secondary {
		background: transparent;
		border: 1px solid var(--grove-border, #333);
		color: var(--grove-text-secondary, #a0a0a0);
	}

	.action-secondary:hover {
		border-color: var(--grove-border-hover, #444);
		color: var(--grove-text-primary, #e8e8e8);
	}

	.action-primary {
		background: var(--grove-accent-primary, #4a7c59);
		border: none;
		color: white;
	}

	.action-primary:hover {
		background: var(--grove-accent-primary-hover, #3d6b4a);
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.draft-button:hover:not(:disabled) {
			transform: none;
		}
	}

	/* ===== Mobile ===== */
	@media (max-width: 640px) {
		.draft-content {
			padding: 1.5rem;
		}

		.draft-title {
			font-size: 1.5rem;
		}
	}
</style>
