<script>
	import { slide } from 'svelte/transition';

	let { title = '', expanded = $bindable(false), children } = $props();

	function toggle() {
		expanded = !expanded;
	}
</script>

<div class="collapsible-section">
	<button
		class="collapsible-toggle"
		onclick={toggle}
		aria-expanded={expanded}
	>
		<span class="collapsible-title">{title}</span>
		<span class="toggle-icon">{expanded ? '▼' : '▶'}</span>
	</button>

	{#if expanded}
		<div class="collapsible-content" transition:slide={{ duration: 200 }}>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.collapsible-section {
		margin-bottom: 1.5rem;
		border: 1px solid var(--light-border-primary);
		border-radius: 8px;
		overflow: hidden;
	}
	:global(.dark) .collapsible-section {
		border-color: var(--light-border-primary);
	}
	.collapsible-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--light-bg-tertiary);
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--light-border-secondary);
		transition: background-color 0.2s;
	}
	.collapsible-toggle:hover {
		background: var(--light-border-secondary);
	}
	:global(.dark) .collapsible-toggle:hover {
		background: var(--light-border-secondary);
	}
	.collapsible-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.toggle-icon {
		font-size: 0.75rem;
		transition: transform 0.2s;
	}
	.collapsible-content {
		padding: 1rem;
		background: #fafafa;
	}
	:global(.dark) .collapsible-content {
		background: #1f1f1f;
	}
</style>
