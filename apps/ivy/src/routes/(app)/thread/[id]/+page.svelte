<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import Icon from "$lib/components/Icons.svelte";
	import { threads } from "$lib/stores";

	$: threadId = $page.params.id;
	$: thread = $threads.find((t) => t.id === threadId);

	// Mock messages for the thread
	interface Message {
		id: string;
		from: { name: string; email: string };
		to: { name: string; email: string }[];
		date: Date;
		body: string;
		isCollapsed: boolean;
	}

	const mockMessages: Record<string, Message[]> = {
		"1": [
			{
				id: "m1",
				from: { name: "Grove Team", email: "team@grove.place" },
				to: [{ name: "You", email: "user@grove.place" }],
				date: new Date(Date.now() - 1000 * 60 * 30),
				body: `<p>Welcome to Grove!</p>
<p>We're thrilled to have you join our community. Your new @grove.place email is now active and ready to use.</p>
<p>Here's what you can do with Ivy:</p>
<ul>
<li>Send and receive encrypted emails</li>
<li>Organize your messages with labels</li>
<li>Search your inbox securely</li>
<li>Access your mail from any device</li>
</ul>
<p>If you have any questions, just reply to this email or visit our help center.</p>
<p>Best,<br>The Grove Team</p>`,
				isCollapsed: false,
			},
		],
		"3": [
			{
				id: "m1",
				from: { name: "Alex Chen", email: "alex@grove.place" },
				to: [
					{ name: "You", email: "user@grove.place" },
					{ name: "Jordan Miller", email: "jordan@grove.place" },
				],
				date: new Date(Date.now() - 1000 * 60 * 60 * 48),
				body: `<p>Hey team,</p>
<p>I've been thinking about our Q1 project proposal. I have two options in mind:</p>
<p><strong>Option A:</strong> Focus on expanding our current feature set<br>
<strong>Option B:</strong> Pivot to a new market segment</p>
<p>Let me know your thoughts!</p>
<p>Alex</p>`,
				isCollapsed: true,
			},
			{
				id: "m2",
				from: { name: "Jordan Miller", email: "jordan@grove.place" },
				to: [
					{ name: "Alex Chen", email: "alex@grove.place" },
					{ name: "You", email: "user@grove.place" },
				],
				date: new Date(Date.now() - 1000 * 60 * 60 * 36),
				body: `<p>Thanks for putting this together, Alex.</p>
<p>I'm leaning towards Option B. The new market segment has a lot of potential and less competition.</p>
<p>What do you think?</p>
<p>Jordan</p>`,
				isCollapsed: true,
			},
			{
				id: "m3",
				from: { name: "You", email: "user@grove.place" },
				to: [
					{ name: "Alex Chen", email: "alex@grove.place" },
					{ name: "Jordan Miller", email: "jordan@grove.place" },
				],
				date: new Date(Date.now() - 1000 * 60 * 60 * 24),
				body: `<p>I think we should move forward with option B. It aligns better with our goals for the year and gives us room to grow.</p>
<p>Let's schedule a call to discuss the details.</p>`,
				isCollapsed: false,
			},
		],
	};

	$: messages = mockMessages[threadId] || [
		{
			id: "m1",
			from: { name: thread?.participants[0] || "Unknown", email: "unknown@grove.place" },
			to: [{ name: "You", email: "user@grove.place" }],
			date: thread?.lastDate || new Date(),
			body: "<p>Email content would appear here...</p>",
			isCollapsed: false,
		},
	];

	function formatDate(date: Date): string {
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	function formatShortDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
		} else if (days < 7) {
			return date.toLocaleDateString("en-US", {
				weekday: "short",
				hour: "numeric",
				minute: "2-digit",
			});
		} else {
			return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		}
	}

	let replyText = "";
</script>

<svelte:head>
	<title>{thread?.subject || "Thread"} - Ivy</title>
</svelte:head>

<div class="thread-view">
	<header class="thread-header">
		<div class="header-left">
			<button class="back-btn" onclick={() => goto("/inbox")} title="Back to inbox">
				<Icon name="chevron-right" size={20} class="back-icon" />
			</button>
			<h1 class="thread-subject">{thread?.subject || "No subject"}</h1>
		</div>

		<div class="header-actions">
			<button class="action-btn" title="Archive">
				<Icon name="archive" size={18} />
			</button>
			<button class="action-btn" title="Delete">
				<Icon name="trash" size={18} />
			</button>
			<button class="action-btn" title="Labels">
				<Icon name="label" size={18} />
			</button>
		</div>
	</header>

	<div class="messages">
		{#each messages as message, i (message.id)}
			<article class="message" class:collapsed={message.isCollapsed}>
				<button class="message-header" onclick={() => (message.isCollapsed = !message.isCollapsed)}>
					<div class="sender-avatar">
						{message.from.name.charAt(0)}
					</div>

					<div class="message-meta">
						<div class="message-top">
							<span class="sender-name">{message.from.name}</span>
							<span class="message-date">{formatShortDate(message.date)}</span>
						</div>
						{#if message.isCollapsed}
							<div class="message-preview">
								{@html message.body.replace(/<[^>]*>/g, " ").slice(0, 100)}...
							</div>
						{:else}
							<div class="recipient-info">
								to {message.to.map((t) => (t.name === "You" ? "me" : t.name)).join(", ")}
							</div>
						{/if}
					</div>

					<Icon
						name={message.isCollapsed ? "chevron-right" : "chevron-down"}
						size={16}
						class="expand-icon"
					/>
				</button>

				{#if !message.isCollapsed}
					<div class="message-body">
						{@html message.body}
					</div>

					<div class="message-actions">
						<button class="reply-btn">
							<Icon name="reply" size={16} />
							<span>Reply</span>
						</button>
						<button class="reply-btn">
							<Icon name="reply-all" size={16} />
							<span>Reply All</span>
						</button>
						<button class="reply-btn">
							<Icon name="forward" size={16} />
							<span>Forward</span>
						</button>
					</div>
				{/if}
			</article>
		{/each}
	</div>

	<div class="reply-box">
		<div class="reply-container">
			<div class="reply-avatar">U</div>
			<div class="reply-input-wrapper">
				<textarea class="reply-input" placeholder="Write a reply..." bind:value={replyText} rows="1"
				></textarea>
				<div class="reply-actions">
					<div class="reply-toolbar">
						<button type="button" class="toolbar-btn" title="Bold">
							<Icon name="bold" size={16} />
						</button>
						<button type="button" class="toolbar-btn" title="Italic">
							<Icon name="italic" size={16} />
						</button>
						<button type="button" class="toolbar-btn" title="Attach file">
							<Icon name="paperclip" size={16} />
						</button>
					</div>
					<button class="send-btn" disabled={!replyText.trim()}>
						<Icon name="send" size={16} />
						<span>Send</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.thread-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-bg-primary);
	}

	.thread-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.back-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.back-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.back-btn :global(.back-icon) {
		transform: rotate(180deg);
	}

	.thread-subject {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-actions {
		display: flex;
		gap: var(--space-1);
	}

	.action-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.action-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.message {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
	}

	.message-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-4);
		width: 100%;
		text-align: left;
		background: transparent;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.message-header:hover {
		background: var(--color-surface-hover);
	}

	.sender-avatar {
		width: 40px;
		height: 40px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		flex-shrink: 0;
	}

	.message-meta {
		flex: 1;
		min-width: 0;
	}

	.message-top {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.sender-name {
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.message-date {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
	}

	.recipient-info {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		margin-top: var(--space-1);
	}

	.message-preview {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		margin-top: var(--space-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.message-header :global(.expand-icon) {
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		margin-top: var(--space-1);
	}

	.message-body {
		padding: 0 var(--space-4) var(--space-4) calc(40px + var(--space-3) + var(--space-4));
		font-size: var(--text-sm);
		line-height: var(--leading-relaxed);
		color: var(--color-text-primary);
	}

	.message-body :global(p) {
		margin-bottom: var(--space-3);
	}

	.message-body :global(ul),
	.message-body :global(ol) {
		margin-bottom: var(--space-3);
		padding-left: var(--space-6);
	}

	.message-body :global(li) {
		margin-bottom: var(--space-1);
	}

	.message-body :global(strong) {
		font-weight: var(--font-semibold);
	}

	.message-actions {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border-subtle);
		background: var(--color-bg-tertiary);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}

	.reply-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
	}

	.reply-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	/* Reply Box */
	.reply-box {
		border-top: 1px solid var(--color-border);
		padding: var(--space-4);
		background: var(--color-bg-secondary);
	}

	.reply-container {
		display: flex;
		gap: var(--space-3);
	}

	.reply-avatar {
		width: 40px;
		height: 40px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		flex-shrink: 0;
	}

	.reply-input-wrapper {
		flex: 1;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.reply-input {
		width: 100%;
		padding: var(--space-3);
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		line-height: var(--leading-relaxed);
		resize: none;
		min-height: 80px;
	}

	.reply-input:focus {
		outline: none;
	}

	.reply-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.reply-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
	}

	.reply-toolbar {
		display: flex;
		gap: var(--space-1);
	}

	.toolbar-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-tertiary);
		transition: all var(--transition-fast);
	}

	.toolbar-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.send-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		border-radius: var(--radius-md);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
	}

	.send-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
