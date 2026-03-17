<script lang="ts">
	import type { Snippet } from "svelte";
	let { children }: { children: Snippet } = $props();
</script>

<div class="settings-shared">
	{@render children()}
</div>

<style>
	/* Shared styles for all settings sub-pages */
	.settings-shared {
		display: contents;
	}

	/* ── Section structure ─────────────────────────────────────────────────────── */
	.settings-shared :global(.section-header) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.settings-shared :global(.section-header h2) {
		margin: 0;
		font-size: 1.25rem;
		color: var(--color-text);
	}
	.settings-shared :global(.section-description) {
		margin: 0 0 1rem 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.settings-shared :global(.button-row) {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	/* ── Toggle rows ───────────────────────────────────────────────────────────── */
	.settings-shared :global(.logo-toggle) {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.75rem;
		border-radius: var(--border-radius-standard, 0.5rem);
		border: 1px solid var(--color-border);
		background: var(--color-surface, transparent);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.settings-shared :global(.logo-toggle:hover) {
		background: var(--color-surface-elevated, var(--color-surface));
		border-color: var(--user-accent, var(--color-primary));
	}
	.settings-shared :global(.logo-toggle:has(input:checked)) {
		border-color: var(--user-accent, var(--color-primary));
		background: hsl(var(--primary-color) / 0.05);
	}
	:global(.dark .settings-shared .logo-toggle:has(input:checked)) {
		border-color: var(--color-primary-light);
		background: hsl(var(--primary-color) / 0.1);
	}
	.settings-shared :global(.logo-toggle input[type="checkbox"]) {
		margin-top: 0.2rem;
		flex-shrink: 0;
		accent-color: var(--user-accent, var(--color-primary));
		width: 1rem;
		height: 1rem;
	}
	.settings-shared :global(.toggle-label) {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.settings-shared :global(.toggle-title) {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}
	.settings-shared :global(.toggle-description) {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	/* ── Text fields ───────────────────────────────────────────────────────────── */
	.settings-shared :global(.canopy-field) {
		margin-bottom: 1.25rem;
	}
	.settings-shared :global(.field-label) {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.4rem;
	}
	.settings-shared :global(.canopy-input) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		color: var(--color-text);
		font-size: 0.9rem;
		line-height: 1.5;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		box-sizing: border-box;
	}
	.settings-shared :global(.canopy-input:focus) {
		outline: none;
		border-color: var(--user-accent, var(--color-primary));
		box-shadow: 0 0 0 2px hsl(var(--primary-color, 145 63% 42%) / 0.15);
	}
	.settings-shared :global(.canopy-input::placeholder) {
		color: var(--color-text-subtle, var(--color-text-muted));
	}
	.settings-shared :global(.field-help) {
		display: flex;
		justify-content: space-between;
		margin-top: 0.35rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.settings-shared :global(.char-count) {
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}
</style>
