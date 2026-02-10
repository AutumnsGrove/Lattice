<script lang="ts">
  /**
   * FiresideChat - Conversational Writing Mode
   *
   * A chat interface that replaces the editor when in Fireside mode.
   * Helps writers who freeze at the blank page by turning conversation into drafts.
   *
   * @fires draft - When user accepts a generated draft { title: string, content: string, marker: string }
   * @fires close - When user exits Fireside mode without a draft
   */

  import { tick } from "svelte";
  import { Send, Sparkles, ArrowLeft, Check, RotateCcw, Flame, X } from "lucide-svelte";

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
  // State
  // ============================================================================

  interface Message {
    id: string; // Unique ID for message identification (prevents race conditions)
    role: "wisp" | "user";
    content: string;
    timestamp: string;
  }

  // API response types
  interface ApiErrorResponse {
    error?: string;
  }

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

  let messages = $state<Message[]>([]);
  let inputValue = $state("");
  let isLoading = $state(false);
  let canDraft = $state(false);
  let conversationId = $state<string | null>(null);
  let error = $state<string | null>(null);

  // Draft state
  let draftMode = $state(false);
  let draft = $state<{ title: string; content: string; marker: string; warning?: string } | null>(null);
  let isDrafting = $state(false);

  // Refs
  let messagesContainer = $state<HTMLDivElement | undefined>(undefined);
  let inputElement = $state<HTMLTextAreaElement | undefined>(undefined);

  // ============================================================================
  // Constants
  // ============================================================================

  /** Average reading speed in words per minute for reading time estimates */
  const WORDS_PER_MINUTE = 200;

  /** Calculate word count for content */
  function getWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  /** Calculate reading time in minutes */
  function getReadingTime(content: string): number {
    return Math.max(1, Math.ceil(getWordCount(content) / WORDS_PER_MINUTE));
  }

  // ============================================================================
  // API Calls
  // ============================================================================

  async function startConversation() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("/api/grove/wisp/fireside", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiErrorResponse;
        throw new Error(data.error || "Failed to start conversation");
      }

      const data = (await response.json()) as StartResponse;
      conversationId = data.conversationId;

      messages = [
        {
          id: crypto.randomUUID(),
          role: "wisp",
          content: data.reply,
          timestamp: new Date().toISOString(),
        },
      ];
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong";
    } finally {
      isLoading = false;
    }
  }

  async function sendMessage() {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    inputValue = "";
    error = null;

    // Create the message with a unique ID for identification (avoids timestamp collision)
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI immediately
    messages = [...messages, newMessage];

    // Scroll to bottom
    await tick();
    scrollToBottom();

    isLoading = true;

    try {
      const response = await fetch("/api/grove/wisp/fireside", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          message: userMessage,
          conversation: messages,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiErrorResponse;
        throw new Error(data.error || "Failed to send message");
      }

      const data = (await response.json()) as RespondResponse;
      canDraft = data.canDraft;

      // Add Wisp's response
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "wisp",
          content: data.reply,
          timestamp: new Date().toISOString(),
        },
      ];

      await tick();
      scrollToBottom();
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong";
      // Remove the specific user message that failed (safer than slice)
      messages = messages.filter((m) => m.id !== newMessage.id);
    } finally {
      isLoading = false;
      inputElement?.focus();
    }
  }

  async function generateDraft() {
    if (isDrafting) return;

    isDrafting = true;
    error = null;

    try {
      const response = await fetch("/api/grove/wisp/fireside", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          conversation: messages,
          conversationId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiErrorResponse;
        throw new Error(data.error || "Failed to generate draft");
      }

      const data = (await response.json()) as DraftResponse;
      draft = {
        title: data.title,
        content: data.content,
        marker: data.marker,
        warning: data.warning,
      };
      draftMode = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to generate draft";
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
    if (onClose) {
      onClose();
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    if (event.key === "Escape") {
      handleClose();
    }
  }

  function autoResize(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    // Use requestAnimationFrame to batch DOM reads/writes and prevent layout thrashing
    requestAnimationFrame(() => {
      target.style.height = "auto";
      target.style.height = Math.min(target.scrollHeight, 150) + "px";
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Start conversation on mount
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
          <ArrowLeft size={16} />
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
          <RotateCcw size={16} />
          Keep chatting
        </button>
        <button class="action-primary" onclick={acceptDraft} type="button">
          <Check size={16} />
          Use this draft
        </button>
      </footer>
    </div>
  {:else}
    <!-- Chat Mode -->
    <header class="fireside-header">
      <div class="fire-art" aria-hidden="true">
        <pre>{`     ~  ~
    (    )
   (      )
  ~~~~~~~~~~`}</pre>
      </div>
      <h2>Fireside with Wisp</h2>
      <p class="fireside-subtitle">sit by the fire and tell me what's on your mind</p>
      <button class="close-button" onclick={handleClose} type="button" aria-label="Exit Fireside">
        <X size={16} />
      </button>
    </header>

    <div class="messages-container" bind:this={messagesContainer} role="log" aria-live="polite">
      {#each messages as message}
        <div class="message message-{message.role}">
          <span class="message-role">{message.role === "wisp" ? "Wisp" : "You"}</span>
          <p class="message-content">{message.content}</p>
        </div>
      {/each}

      {#if isLoading}
        <div class="message message-wisp loading" aria-label="Wisp is thinking">
          <span class="message-role">Wisp</span>
          <p class="message-content typing" aria-hidden="true">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </p>
          <span class="sr-only">Wisp is thinking...</span>
        </div>
      {/if}

      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}
    </div>

    <footer class="input-area">
      {#if canDraft}
        <button
          class="draft-button"
          onclick={generateDraft}
          disabled={isDrafting}
          type="button"
        >
          <Sparkles size={16} />
          {isDrafting ? "Drafting..." : "Ready to draft"}
        </button>
      {:else if messages.length > 0}
        <p class="draft-hint" title="Share a few more thoughts and I'll be able to help shape them into a draft">
          <Sparkles size={16} />
          <span>Keep chatting - drafting unlocks after a few exchanges</span>
        </p>
      {/if}

      <div class="input-row">
        <textarea
          bind:this={inputElement}
          bind:value={inputValue}
          onkeydown={handleKeydown}
          oninput={autoResize}
          placeholder="Type your thoughts..."
          rows="1"
          disabled={isLoading}
          aria-label="Your message"
        ></textarea>
        <button
          class="send-button"
          onclick={sendMessage}
          disabled={!inputValue.trim() || isLoading}
          type="button"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      <p class="philosophy">~ a good listener, not a ghostwriter ~</p>
    </footer>
  {/if}
</div>

<style>
  .fireside-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
    background: var(--grove-bg-primary, #1a1a1a);
    color: var(--grove-text-primary, #e8e8e8);
    font-family: var(--grove-font-sans, system-ui, sans-serif);
    border-radius: var(--grove-radius-lg, 12px);
    overflow: hidden;
  }

  /* Header */
  .fireside-header {
    position: relative;
    padding: 1.5rem;
    text-align: center;
    background: linear-gradient(
      180deg,
      rgba(255, 140, 50, 0.1) 0%,
      transparent 100%
    );
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

  /* Messages */
  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .message {
    max-width: 85%;
    padding: 0.75rem 1rem;
    border-radius: var(--grove-radius-md, 8px);
  }

  .message-wisp {
    align-self: flex-start;
    background: var(--grove-bg-secondary, #2a2a2a);
    border: 1px solid var(--grove-border, #333);
  }

  .message-user {
    align-self: flex-end;
    background: var(--grove-accent-primary, #4a7c59);
    color: white;
  }

  .message-role {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message-user .message-role {
    text-align: right;
  }

  .message-content {
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  /* Typing indicator */
  .typing {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: var(--grove-text-secondary, #a0a0a0);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Error */
  .error-message {
    padding: 0.75rem 1rem;
    background: rgba(220, 53, 69, 0.15);
    border: 1px solid rgba(220, 53, 69, 0.3);
    border-radius: var(--grove-radius-md, 8px);
    color: #ff6b6b;
    font-size: 0.875rem;
  }

  /* Input Area */
  .input-area {
    padding: 1rem;
    border-top: 1px solid var(--grove-border, #333);
    background: var(--grove-bg-secondary, #2a2a2a);
  }

  .draft-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    margin-bottom: 0.75rem;
    background: linear-gradient(
      135deg,
      var(--grove-accent-warm, #ff8c32) 0%,
      #e67320 100%
    );
    color: white;
    border: none;
    border-radius: var(--grove-radius-md, 8px);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
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
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
    color: var(--grove-text-secondary, #a0a0a0);
    font-style: italic;
    cursor: help;
  }

  .draft-hint:hover {
    color: var(--grove-text-primary, #e8e8e8);
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .input-row textarea {
    flex: 1;
    padding: 0.75rem 1rem;
    background: var(--grove-bg-primary, #1a1a1a);
    border: 1px solid var(--grove-border, #333);
    border-radius: var(--grove-radius-md, 8px);
    color: var(--grove-text-primary, #e8e8e8);
    font-family: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;
    resize: none;
    min-height: 44px;
    max-height: 150px;
  }

  .input-row textarea:focus {
    outline: none;
    border-color: var(--grove-accent-primary, #4a7c59);
  }

  .input-row textarea::placeholder {
    color: var(--grove-text-secondary, #a0a0a0);
  }

  .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: var(--grove-accent-primary, #4a7c59);
    border: none;
    border-radius: var(--grove-radius-md, 8px);
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }

  .send-button:hover:not(:disabled) {
    background: var(--grove-accent-primary-hover, #3d6b4a);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .philosophy {
    margin: 0.75rem 0 0;
    font-size: 0.75rem;
    color: var(--grove-text-secondary, #a0a0a0);
    text-align: center;
    font-style: italic;
  }

  /* Draft View */
  .draft-view {
    display: flex;
    flex-direction: column;
    height: 100%;
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

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
      opacity: 0.5;
    }

    .draft-button:hover:not(:disabled) {
      transform: none;
    }
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .message {
      max-width: 95%;
    }

    .draft-content {
      padding: 1.5rem;
    }

    .draft-title {
      font-size: 1.5rem;
    }
  }
</style>
