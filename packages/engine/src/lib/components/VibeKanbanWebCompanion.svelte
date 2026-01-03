<script>
	/**
	 * Svelte wrapper for vibe-kanban-web-companion React component.
	 * Only renders in development mode on the client side.
	 */
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	/** @type {HTMLDivElement | null} */
	let container = null;
	/** @type {import('react-dom/client').Root | null} */
	let root = null;

	onMount(() => {
		// Only run in development mode
		if (!dev) return;

		async function mountReact() {
			try {
				const [React, { createRoot }, { VibeKanbanWebCompanion }] = await Promise.all([
					import('react'),
					import('react-dom/client'),
					import('vibe-kanban-web-companion')
				]);

				if (container) {
					root = createRoot(container);
					root.render(React.createElement(VibeKanbanWebCompanion));
				}
			} catch (err) {
				console.warn('[VibeKanbanWebCompanion] Failed to mount:', err);
			}
		}

		mountReact();

		return () => {
			if (root) {
				root.unmount();
			}
		};
	});
</script>

{#if dev}
	<div bind:this={container} style="display: contents;"></div>
{/if}
