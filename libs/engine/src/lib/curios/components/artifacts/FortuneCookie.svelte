<script lang="ts">
	/**
	 * Fortune Cookie — Click to crack open for a daily fortune.
	 * Fortune is seeded by date + tenant, so it's consistent all day.
	 */
	import { getDailyFortune, type FortuneCookieConfig } from "$lib/curios/artifacts";

	let { config = {}, tenantId = "" }: { config: FortuneCookieConfig; tenantId?: string } = $props();

	let cracked = $state(false);
	let fortune = $state("");

	function crack() {
		if (cracked) return;
		fortune = getDailyFortune(tenantId, config.customFortunes);
		cracked = true;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			crack();
		}
	}
</script>

<div
	class="fortune-cookie"
	class:cracked
	onclick={crack}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Fortune Cookie — click to open"
>
	{#if !cracked}
		<div class="cookie-whole">
			<svg viewBox="0 0 80 50" class="cookie-svg" aria-hidden="true">
				<path
					d="M5 35 Q20 5 40 25 Q60 5 75 35 Q60 48 40 42 Q20 48 5 35Z"
					fill="url(#cookie-grad)"
					stroke="rgba(160,120,60,0.4)"
					stroke-width="0.5"
				/>
				<defs>
					<linearGradient id="cookie-grad" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stop-color="#e8c870" />
						<stop offset="50%" stop-color="#d4a840" />
						<stop offset="100%" stop-color="#c89830" />
					</linearGradient>
				</defs>
			</svg>
			<span class="cookie-tap">tap to open</span>
		</div>
	{:else}
		<div class="cookie-opened">
			<div class="fortune-slip">
				<p class="fortune-text">{fortune}</p>
			</div>
			<div class="cookie-halves" aria-hidden="true">
				<svg viewBox="0 0 40 30" class="half left-half">
					<path d="M2 22 Q10 2 22 15 Q18 28 2 22Z" fill="#d4a840" />
				</svg>
				<svg viewBox="0 0 40 30" class="half right-half">
					<path d="M18 15 Q30 2 38 22 Q22 28 18 15Z" fill="#d4a840" />
				</svg>
			</div>
		</div>
	{/if}
</div>

<style>
	.fortune-cookie {
		display: flex;
		flex-direction: column;
		align-items: center;
		cursor: pointer;
		user-select: none;
		outline: none;
		min-width: 6rem;
	}

	.fortune-cookie:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.cookie-whole {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.cookie-svg {
		width: 5rem;
		height: auto;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
		transition: transform 0.2s ease;
	}

	.fortune-cookie:hover .cookie-svg {
		transform: scale(1.05);
	}

	.cookie-tap {
		font-size: 0.65rem;
		opacity: 0.45;
		color: var(--color-text-muted, #888);
	}

	.cookie-opened {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		animation: cookie-reveal 0.5s ease-out;
	}

	.fortune-slip {
		background: #fffef5;
		border: 1px solid rgba(200, 180, 120, 0.3);
		border-radius: 2px;
		padding: 0.5rem 0.75rem;
		max-width: 14rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .fortune-slip {
		background: rgba(255, 254, 240, 0.08);
		border-color: rgba(200, 180, 120, 0.15);
	}

	.fortune-text {
		font-size: 0.8rem;
		font-style: italic;
		color: #5a4a2a;
		margin: 0;
		line-height: 1.4;
		text-align: center;
	}

	:global(.dark) .fortune-text {
		color: rgb(var(--cream-200, 243 237 224));
	}

	.cookie-halves {
		display: flex;
		gap: 0.5rem;
	}

	.half {
		width: 2rem;
		height: auto;
		opacity: 0.5;
	}

	.left-half {
		transform: rotate(-15deg);
	}
	.right-half {
		transform: rotate(15deg);
	}

	@keyframes cookie-reveal {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cookie-opened {
			animation: none;
		}
		.fortune-cookie:hover .cookie-svg {
			transform: none;
		}
	}
</style>
