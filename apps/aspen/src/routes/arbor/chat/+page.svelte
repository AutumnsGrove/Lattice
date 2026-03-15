<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { tick } from "svelte";
	import GlassChat from "@autumnsgrove/lattice/ui/components/ui/glasschat/GlassChat.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { createConversationalChatController } from "@autumnsgrove/lattice/ui/components/ui/glasschat/controller.svelte";
	import type {
		ChatRoleMap,
		ChatMessageData,
	} from "@autumnsgrove/lattice/ui/components/ui/glasschat/types";
	import { createChatConnection } from "@autumnsgrove/lattice/ui/chat/connection.svelte";
	import type {
		ChatWSServerMessage,
		ConversationPreview,
		ChatFriendProfile,
	} from "@autumnsgrove/lattice/ui/chat/types";
	import type {
		ChatConversationWithMeta,
		ChatMessageData as ChatMessageWireData,
	} from "@autumnsgrove/lattice/server/services/chat.types";
	import { chatStore } from "@autumnsgrove/lattice/ui/stores/chat.svelte";
	import { cn } from "@autumnsgrove/lattice/ui/utils";
	import { api } from "@autumnsgrove/lattice/utils/api";
	import { featureIcons } from "@autumnsgrove/prism/icons";

	let { data } = $props();

	// ── Map API data to client shapes ────────────────────────────────────
	function toPreview(row: ChatConversationWithMeta): ConversationPreview {
		return {
			id: row.id,
			friendTenantId: row.peer_tenant_id,
			lastMessage: row.last_message_preview,
			lastActivityAt: row.last_message_at ?? row.updated_at,
			unreadCount: row.unread_count,
		};
	}

	const conversations = $derived((data.conversations as ChatConversationWithMeta[]).map(toPreview));
	const friends = $derived(data.friends as ChatFriendProfile[]);
	const activeId = $derived($page.url.searchParams.get("conv"));

	// ── Friend lookup — O(1) Map instead of O(N) Array.find per render ────
	const friendsMap = $derived(new Map(friends.map((f) => [f.tenantId, f])));

	function getFriend(tenantId: string): ChatFriendProfile | undefined {
		return friendsMap.get(tenantId);
	}

	function getFriendName(tenantId: string): string {
		const friend = friendsMap.get(tenantId);
		return friend?.displayName ?? friend?.subdomain ?? "Friend";
	}

	// ── Error Messages ────────────────────────────────────────────────────
	const CHAT_ERROR_MESSAGES: Record<string, string> = {
		"CHAT-001": "Connection not authenticated. Please refresh the page.",
		"CHAT-002": "Invalid message format.",
		"CHAT-003": "Unknown message type.",
		"CHAT-004": "Message content is required.",
		"CHAT-005": "Your message is too long. Try keeping it shorter.",
		"CHAT-006": "Missing conversation context.",
		"CHAT-010": "Chat service is temporarily unavailable.",
		"CHAT-011": "Failed to send your message. Please try again.",
	};

	// ── Active Conversation State ─────────────────────────────────────────
	let connection = $state<ReturnType<typeof createChatConnection> | null>(null);
	let controller = $state<ReturnType<typeof createConversationalChatController> | null>(null);

	// ── Typing indicator debounce ─────────────────────────────────────────
	let typingTimer: ReturnType<typeof setTimeout> | null = null;
	let lastTypingSent = 0;
	const TYPING_DEBOUNCE_MS = 2_000;

	function sendTypingIndicator() {
		if (!connection || !activeId) return;
		const now = Date.now();
		if (now - lastTypingSent < TYPING_DEBOUNCE_MS) return;
		lastTypingSent = now;
		connection.send({
			type: "typing",
			conversation_id: activeId,
		});
		// Clear typing after 3s of no further input
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			// Typing stops naturally — server will timeout the indicator
			typingTimer = null;
		}, 3_000);
	}

	// ── Build roles for active conversation ───────────────────────────────
	function buildRoles(friendTenantId: string): ChatRoleMap {
		const friendName = getFriendName(friendTenantId);
		return {
			self: {
				label: "You",
				align: "end",
				bubbleClass: "bg-grove-500/20 border border-grove-500/30",
			},
			friend: {
				label: friendName,
				align: "start",
				bubbleClass: "bg-cream-500/20 border border-cream-500/30",
			},
		};
	}

	// ── Convert wire message to GlassChat ChatMessageData ────────────────
	function wireToDisplay(msg: ChatMessageWireData, localTenantId: string): ChatMessageData {
		return {
			id: msg.id,
			role: msg.sender_id === localTenantId ? "self" : "friend",
			content: msg.retracted_at ? "[message retracted]" : msg.content,
			timestamp: msg.created_at,
			metadata: {
				serverId: msg.id,
				senderId: msg.sender_id,
				contentType: msg.content_type,
			},
			status: msg.retracted_at ? "retracted" : "sent",
		};
	}

	// ── Load message history for a conversation ──────────────────────────
	async function loadHistory(
		conversationId: string,
		ctrl: ReturnType<typeof createConversationalChatController>,
		localTenantId: string,
	) {
		try {
			const result = await api.get<{ messages: ChatMessageWireData[] }>(
				`/api/chat/conversations/${conversationId}/messages`,
			);
			const historyMessages = (result?.messages ?? []).map((m) => wireToDisplay(m, localTenantId));
			ctrl.messages = historyMessages;
		} catch {
			// Non-critical — start with empty history
		}
	}

	// ── WebSocket message handler ─────────────────────────────────────────
	function handleWSMessage(msg: ChatWSServerMessage) {
		if (!controller) return;

		switch (msg.type) {
			case "message": {
				const wireMsg = msg.message;
				controller.receiveMessage("friend", wireMsg.content, {
					metadata: {
						serverId: wireMsg.id,
						senderId: wireMsg.sender_id,
						contentType: wireMsg.content_type,
					},
				});
				// Update store preview and move to top
				if (activeId) {
					chatStore.updatePreview(activeId, wireMsg.content, wireMsg.created_at);
					chatStore.moveToTop(activeId);
				}
				// Announce new message to screen readers via the sr-only live region.
				// The active chat's role="log" handles in-conversation announcements;
				// this also covers background notifications for screen reader users.
				const senderName = activeConv ? getFriendName(activeConv.friendTenantId) : "Someone";
				incomingAnnouncementText = `New message from ${senderName}`;
				break;
			}
			case "message:ack": {
				// The controller's send() already calls markSent on success.
				// The ack confirms server persistence — no extra action needed.
				break;
			}
			case "typing": {
				// Server relays typing with sender_id — show if it's from the friend
				controller.setRemoteTyping("friend");
				// Clear typing indicator after 3 seconds
				setTimeout(() => {
					controller?.setRemoteTyping(null);
				}, 3_000);
				break;
			}
			case "read": {
				// Server confirms read cursor update
				break;
			}
			case "error": {
				controller.setError(
					CHAT_ERROR_MESSAGES[msg.code] ?? "Something went wrong with the connection.",
				);
				break;
			}
		}
	}

	// ── Select conversation ───────────────────────────────────────────────
	function selectConversation(conversationId: string) {
		goto(`/arbor/chat?conv=${conversationId}`, { replaceState: true, noScroll: true });
	}

	// ── Lifecycle: connect/disconnect on active conversation change ──────
	$effect(() => {
		const convId = activeId;
		if (!convId) {
			// No active conversation — clean up
			connection?.close();
			connection = null;
			controller = null;
			chatStore.setActive(null);
			return;
		}

		// Find the conversation to get the friend's tenant ID
		const conv = conversations.find((c) => c.id === convId);
		if (!conv) return;

		chatStore.setActive(convId);
		chatStore.markConversationRead(convId);

		// Clean up previous connection
		connection?.close();

		// Determine local tenant ID from the API conversation data
		// (the raw data has participant_a/participant_b; peer_tenant_id is the friend)
		const rawConv = (data.conversations as ChatConversationWithMeta[]).find((c) => c.id === convId);
		const localTenantId = rawConv
			? rawConv.participant_a === rawConv.peer_tenant_id
				? rawConv.participant_b
				: rawConv.participant_a
			: "";

		// Create WebSocket connection first so onSend can use it
		const conn = createChatConnection({
			conversationId: convId,
			onMessage: handleWSMessage,
		});

		// Create new controller
		const newController = createConversationalChatController({
			localRole: "self",
			errorMessages: CHAT_ERROR_MESSAGES,
			defaultError: "Couldn't send your message.",
			async onSend(text) {
				conn.send({
					type: "message",
					conversation_id: convId,
					content: text,
					content_type: "text",
				});
			},
		});

		controller = newController;
		connection = conn;

		// Load message history into the controller
		loadHistory(convId, newController, localTenantId);

		// Mark conversation as read via REST API (uses apiRequest for CSRF)
		const lastRawConv = rawConv;
		if (lastRawConv) {
			api.post(`/api/chat/conversations/${convId}/read`, { messageId: "latest" }).catch(() => {
				// Non-critical — read cursor update can fail silently
			});
		}

		return () => {
			conn.close();
		};
	});

	// ── Track typing in input ─────────────────────────────────────────────
	$effect(() => {
		if (controller && controller.inputValue.length > 0) {
			sendTypingIndicator();
		}
	});

	// ── Relative time formatting ──────────────────────────────────────────
	function relativeTime(isoDate: string): string {
		const now = Date.now();
		const then = new Date(isoDate).getTime();
		const diffMs = now - then;
		const diffMins = Math.floor(diffMs / 60_000);
		const diffHours = Math.floor(diffMs / 3_600_000);
		const diffDays = Math.floor(diffMs / 86_400_000);

		if (diffMins < 1) return "now";
		if (diffMins < 60) return `${diffMins}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays < 7) return `${diffDays}d`;
		return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
	}

	// ── Derived: active conversation and roles ────────────────────────────
	let activeConv = $derived(conversations.find((c) => c.id === activeId) ?? null);
	let activeRoles = $derived(activeConv ? buildRoles(activeConv.friendTenantId) : null);
	let activeFriendName = $derived(activeConv ? getFriendName(activeConv.friendTenantId) : "");

	// ── Focus management: move focus to chat panel when conversation opens ─
	let chatDetailRef = $state<HTMLElement | undefined>(undefined);

	$effect(() => {
		// When activeId changes and a conversation is now open, move focus to the
		// chat panel so keyboard users land in the right place.
		if (activeId && chatDetailRef) {
			// tick() ensures the panel content has rendered before focusing
			tick().then(() => {
				chatDetailRef?.focus();
			});
		}
	});

	// ── Live region: announce incoming messages from non-active conversations ─
	let incomingAnnouncementText = $state("");
</script>

<svelte:head>
	<title>Messages - Grove</title>
</svelte:head>

<!-- Sr-only live region: announces incoming messages to screen readers -->
<div aria-live="polite" aria-atomic="true" class="sr-only">{incomingAnnouncementText}</div>

<main class="chat-page" aria-label="Messages">
	<!-- ─── Conversation List (Left Panel) ──────────────────────────── -->
	<GlassCard variant="dark" flush border class="conversation-list">
		<header class="px-4 py-3 border-b border-divider">
			<h2 class="text-sm font-semibold uppercase tracking-wide opacity-70">Messages</h2>
		</header>

		{#if conversations.length === 0}
			<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
				<featureIcons.messageCircle size={32} class="opacity-30 mb-3" aria-hidden="true" />
				<p class="text-sm opacity-50">No conversations yet</p>
				<p class="text-xs opacity-30 mt-1">Follow a friend to start chatting</p>
			</div>
		{:else}
			<nav class="overflow-y-auto flex-1" aria-label="Conversations">
				{#each conversations as conv (conv.id)}
					{@const friend = getFriend(conv.friendTenantId)}
					{@const isActive = conv.id === activeId}
					{@const friendName = getFriendName(conv.friendTenantId)}
					{@const unreadLabel = conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ""}
					<button
						type="button"
						onclick={() => selectConversation(conv.id)}
						aria-label="{friendName}{unreadLabel}"
						aria-current={isActive ? "true" : undefined}
						class={cn(
							"w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
							"hover:bg-white/5 focus-visible:bg-white/5",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
							isActive && "bg-white/10 border-l-2 border-grove-500",
							!isActive && "border-l-2 border-transparent",
						)}
					>
						<!-- Avatar (aria-hidden: button's aria-label covers the identity) -->
						<div
							class="w-9 h-9 rounded-full bg-grove-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"
							aria-hidden="true"
						>
							{#if friend?.avatarUrl}
								<img src={friend.avatarUrl} alt="" class="w-9 h-9 rounded-full object-cover" />
							{:else}
								<span class="text-xs font-semibold text-grove-300">
									{friendName.charAt(0).toUpperCase()}
								</span>
							{/if}
						</div>

						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<span
									class={cn(
										"text-sm font-medium truncate",
										conv.unreadCount > 0 && "font-semibold",
									)}
								>
									{getFriendName(conv.friendTenantId)}
								</span>
								<span class="text-xs opacity-40 flex-shrink-0">
									{relativeTime(conv.lastActivityAt)}
								</span>
							</div>
							<div class="flex items-center justify-between gap-2 mt-0.5">
								<p
									class={cn("text-xs truncate", conv.unreadCount > 0 ? "opacity-70" : "opacity-40")}
								>
									{conv.lastMessage ?? "No messages yet"}
								</p>
								{#if conv.unreadCount > 0}
									<!-- aria-hidden: unread count is already in the button's aria-label -->
									<span
										aria-hidden="true"
										class="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-grove-500 text-white text-[10px] font-bold"
									>
										{conv.unreadCount > 99 ? "99+" : conv.unreadCount}
									</span>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</nav>
		{/if}
	</GlassCard>

	<!-- ─── Active Conversation (Right Panel) ──────────────────────── -->
	<div
		bind:this={chatDetailRef}
		class="conversation-detail"
		role="region"
		aria-label={activeConv ? `Conversation with ${activeFriendName}` : "Chat panel"}
		tabindex="-1"
	>
		{#if activeConv && controller && activeRoles}
			<GlassChat
				messages={controller.messages}
				roles={activeRoles}
				isLoading={controller.isLoading}
				loadingRole="friend"
				error={controller.error}
				bind:inputValue={controller.inputValue}
				onSend={controller.send}
				inputDisabled={controller.isLoading || !connection?.connected}
				inputPlaceholder="Message {activeFriendName}..."
				variant="dark"
				logLabel="Conversation with {activeFriendName}"
				class="h-full"
			>
				{#snippet header()}
					{@const friend = getFriend(activeConv.friendTenantId)}
					<header class="px-4 py-3 border-b border-divider flex items-center gap-3">
						<!-- aria-hidden: the h3 below identifies the person; avatar is decorative here -->
						<div
							class="w-8 h-8 rounded-full bg-grove-500/20 flex items-center justify-center flex-shrink-0"
							aria-hidden="true"
						>
							{#if friend?.avatarUrl}
								<img src={friend.avatarUrl} alt="" class="w-8 h-8 rounded-full object-cover" />
							{:else}
								<span class="text-xs font-semibold text-grove-300">
									{activeFriendName.charAt(0).toUpperCase()}
								</span>
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-sm font-semibold truncate">{activeFriendName}</h3>
							{#if connection?.connected}
								<span class="text-xs opacity-40">Connected</span>
							{:else}
								<span class="text-xs text-warning">Reconnecting...</span>
							{/if}
						</div>
					</header>
				{/snippet}
			</GlassChat>
		{:else}
			<div class="flex flex-col items-center justify-center h-full text-center px-8">
				<featureIcons.messageCircle size={48} class="opacity-20 mb-4" aria-hidden="true" />
				<h3 class="text-lg font-medium opacity-50 mb-1">No conversation selected</h3>
				<p class="text-sm opacity-30">
					{conversations.length > 0
						? "Choose a conversation from the list to start chatting."
						: "Follow friends from the Lantern to start conversations."}
				</p>
			</div>
		{/if}
	</div>
</main>

<style>
	.chat-page {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 1rem;
		height: calc(100vh - 8rem);
		max-height: 900px;
		padding: 1rem;
	}

	.conversation-list {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.conversation-detail {
		min-height: 0;
		height: 100%;
	}

	/* Remove focus outline from programmatically-focused panel (tabindex="-1").
	   Only keyboard/pointer focus needs a visible indicator; programmatic focus
	   (from conversation selection) should not show a ring on the container. */
	.conversation-detail:focus {
		outline: none;
	}

	/* Respect reduced motion for conversation button hover transitions */
	@media (prefers-reduced-motion: reduce) {
		:global(.conversation-list button) {
			transition: none;
		}
	}

	/* Mobile: stack panels vertically, hide detail when no conv selected */
	@media (max-width: 768px) {
		.chat-page {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
			height: calc(100vh - 6rem);
		}

		.conversation-list {
			max-height: 240px;
		}
	}
</style>
