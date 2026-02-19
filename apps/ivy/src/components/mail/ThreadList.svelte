<!--
  Thread List Component

  Displays a list of email threads.
-->
<script lang="ts">
	import type { Thread } from "$lib/stores";

	export let threads: Thread[] = [];
	export let selectedId: string | null = null;
	export let onSelect: (thread: Thread) => void = () => {};
</script>

<div class="thread-list">
	{#each threads as thread (thread.id)}
		<button
			class="thread-item"
			class:selected={thread.id === selectedId}
			class:unread={!thread.isRead}
			on:click={() => onSelect(thread)}
		>
			<!-- TODO: Avatar/sender indicator -->
			<div class="thread-content">
				<span class="participants">{thread.participants.join(", ")}</span>
				<span class="subject">{thread.subject}</span>
			</div>
			<span class="date">{thread.lastDate}</span>
		</button>
	{/each}
</div>

<style>
	.thread-list {
		display: flex;
		flex-direction: column;
	}

	.thread-item {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		border-bottom: 1px solid #e0e0e0;
	}

	.thread-item:hover {
		background: #f5f5f5;
	}

	.thread-item.selected {
		background: #e3f2fd;
	}

	.thread-item.unread {
		font-weight: 600;
	}

	.thread-content {
		flex: 1;
		min-width: 0;
	}

	.participants,
	.subject {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date {
		color: #666;
		font-size: 0.875rem;
	}
</style>
