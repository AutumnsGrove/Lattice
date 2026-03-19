<script lang="ts">
	import { toolIcons, navIcons } from "@autumnsgrove/prism/icons";
	import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";

	const label = $derived(
		groveModeStore.current
			? lanternStore.open
				? "Close Lantern"
				: "Open Lantern"
			: lanternStore.open
				? "Close Compass"
				: "Open Compass",
	);
</script>

<button
	type="button"
	class="lantern-fab z-grove-fab"
	class:open={lanternStore.open}
	onclick={() => lanternStore.toggle()}
	aria-expanded={lanternStore.open}
	aria-label={label}
	aria-haspopup="dialog"
>
	{#if groveModeStore.current}
		<toolIcons.lantern size={22} strokeWidth={2} />
	{:else}
		<navIcons.compass size={22} strokeWidth={2} />
	{/if}
</button>

<style>
	.lantern-fab {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		background: var(--color-primary, #2c5f2d);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.15),
			0 0 0 0 var(--grove-accent-40);
		transition:
			background-color 0.2s ease,
			transform 0.2s ease,
			box-shadow 0.2s ease;
		animation: lantern-pulse 3s ease-in-out infinite;
	}

	.lantern-fab:hover {
		background: var(--color-primary-hover, #245024);
		transform: scale(1.08);
	}

	.lantern-fab.open {
		animation: none;
		background: var(--color-primary-hover, #245024);
	}

	:global(.dark) .lantern-fab {
		background: var(--grove-accent);
		color: var(--bark-950, #0a1f0d);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 0 0 0 var(--grove-accent-30);
	}

	:global(.dark) .lantern-fab:hover,
	:global(.dark) .lantern-fab.open {
		background: var(--grove-accent);
	}

	@keyframes lantern-pulse {
		0%,
		100% {
			box-shadow:
				0 2px 8px rgba(0, 0, 0, 0.15),
				0 0 0 0 var(--grove-accent-30);
		}
		50% {
			box-shadow:
				0 2px 8px rgba(0, 0, 0, 0.15),
				0 0 0 6px transparent;
		}
	}

	.lantern-fab:focus-visible {
		outline: 2px solid white;
		outline-offset: 3px;
	}

	:global(.dark) .lantern-fab:focus-visible {
		outline-color: var(--grove-accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.lantern-fab {
			animation: none;
			transition: none;
		}

		.lantern-fab:hover {
			transform: none;
		}
	}
</style>
