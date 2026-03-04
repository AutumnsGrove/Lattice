<script lang="ts">
	import { Sparkles } from "lucide-svelte";

	interface Props {
		onAtmospherePick: (keyword: string) => void;
	}

	let { onAtmospherePick }: Props = $props();

	/** Top 6 atmospheres for quick-pick pills */
	const quickMoods = ["cozy", "midnight", "cottagecore", "dreamy", "forest", "ocean"] as const;
</script>

<header class="reverie-header">
	<div class="header-top">
		<div class="header-title">
			<Sparkles size={18} class="text-violet-400" aria-hidden="true" />
			<h2>Reverie</h2>
		</div>
	</div>
	<p class="header-subtitle">Describe your grove, and it becomes real.</p>

	<div class="mood-pills" role="group" aria-label="Quick moods">
		<span class="mood-label" id="mood-label">Quick moods:</span>
		<div class="mood-scroll" aria-labelledby="mood-label">
			{#each quickMoods as mood}
				<button
					type="button"
					class="mood-pill"
					onclick={() => onAtmospherePick(mood)}
				>
					{mood}
				</button>
			{/each}
		</div>
	</div>
</header>

<style>
	.reverie-header {
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid rgba(139, 92, 246, 0.12);
		background: linear-gradient(
			to bottom,
			rgba(88, 28, 135, 0.06) 0%,
			transparent 100%
		);
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: white;
		letter-spacing: 0.01em;
	}

	.header-subtitle {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.mood-pills {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mood-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.mood-scroll {
		display: flex;
		gap: 0.375rem;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: 2px;
	}

	.mood-scroll::-webkit-scrollbar {
		display: none;
	}

	.mood-pill {
		padding: 0.5rem 0.875rem;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		border: 1px solid rgba(124, 58, 237, 0.25);
		background: rgba(88, 28, 135, 0.12);
		color: rgba(167, 139, 250, 0.9);
		font-size: 0.75rem;
		font-family: inherit;
		white-space: nowrap;
		cursor: pointer;
	}

	.mood-pill:hover {
		background: rgba(124, 58, 237, 0.2);
		border-color: rgba(139, 92, 246, 0.5);
		color: white;
		box-shadow: 0 0 12px rgba(124, 58, 237, 0.15);
	}

	.mood-pill:active {
		background: rgba(124, 58, 237, 0.3);
		transform: scale(0.97);
	}

	.mood-pill:focus-visible {
		outline: 2px solid rgb(167, 139, 250);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.mood-pill {
			transition:
				background 0.15s ease,
				border-color 0.15s ease,
				color 0.15s ease,
				box-shadow 0.15s ease,
				transform 0.1s ease;
		}
	}
</style>
