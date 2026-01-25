<script lang="ts">
	import { themeStore } from '$lib/ui/stores/theme.svelte';

	let { compact = false }: { compact?: boolean } = $props();

	// Derive title from resolved theme
	let toggleTitle = $derived(themeStore.resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
</script>

{#if compact}
	<button
		class="theme-toggle-compact"
		onclick={() => themeStore.toggle()}
		aria-label="Toggle theme"
		title={toggleTitle}
	>
		{#if themeStore.resolvedTheme === 'dark'}
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="5" />
				<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
			</svg>
		{:else}
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
			</svg>
		{/if}
	</button>
{:else}
	<div class="theme-selector">
		<div class="theme-label">Theme</div>
		<div class="theme-options">
			<button
				class="theme-option"
				class:active={themeStore.theme === 'light'}
				onclick={() => themeStore.setTheme('light')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
				Light
			</button>
			<button
				class="theme-option"
				class:active={themeStore.theme === 'dark'}
				onclick={() => themeStore.setTheme('dark')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
				</svg>
				Dark
			</button>
			<button
				class="theme-option"
				class:active={themeStore.theme === 'system'}
				onclick={() => themeStore.setTheme('system')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
					<path d="M8 21h8M12 17v4" />
				</svg>
				System
			</button>
		</div>
	</div>
{/if}

<style>
	.theme-toggle-compact {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.theme-toggle-compact:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}

	.theme-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.theme-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.theme-options {
		display: flex;
		gap: 0.5rem;
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.theme-option:hover {
		border-color: var(--color-primary);
		color: var(--color-text);
	}

	.theme-option.active {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	@media (max-width: 480px) {
		.theme-options {
			flex-direction: column;
		}
	}
</style>
