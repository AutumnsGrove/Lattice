<script lang="ts">
	/**
	 * Wishing Well — Click to toss a coin. Splash animation.
	 * Counter shows total wishes made by all visitors.
	 */
	let { config: _config = {} }: { config: Record<string, unknown> } = $props();

	let wishCount = $state(0);
	let tossing = $state(false);
	let splashed = $state(false);
	let loaded = $state(false);

	$effect(() => {
		fetch('/api/curios/artifacts/wishing-well') // csrf-ok
			.then((r) => r.ok ? r.json() as Promise<{ count: number }> : { count: 0 })
			.then((d) => {
				wishCount = d.count;
				loaded = true;
			})
			.catch(() => { loaded = true; });
	});

	function toss() {
		if (tossing) return;
		tossing = true;
		splashed = false;

		// Optimistic increment
		wishCount++;

		// POST to increment
		fetch('/api/curios/artifacts/wishing-well', { method: 'POST' }).catch(() => {
			wishCount--; // rollback on failure
		});

		setTimeout(() => {
			splashed = true;
			tossing = false;
		}, 600);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toss();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wishing-well"
	onclick={toss}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Wishing Well — {wishCount} wishes made"
>
	<div class="well-body">
		<!-- Well structure -->
		<svg viewBox="0 0 60 50" class="well-svg" aria-hidden="true">
			<!-- Well wall -->
			<ellipse cx="30" cy="35" rx="25" ry="8" fill="none" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="2" opacity="0.5" />
			<ellipse cx="30" cy="20" rx="25" ry="8" fill="rgba(30,80,160,0.15)" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="2" opacity="0.5" />
			<line x1="5" y1="20" x2="5" y2="35" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="2" opacity="0.5" />
			<line x1="55" y1="20" x2="55" y2="35" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="2" opacity="0.5" />
			<!-- Water surface -->
			<ellipse cx="30" cy="21" rx="22" ry="6" fill="rgba(59,130,246,0.2)" />
		</svg>
		<!-- Splash effect -->
		{#if splashed}
			<div class="splash">
				{#each Array(6) as _, i}
					<span class="droplet" style="--angle: {i * 60}deg; --delay: {i * 0.05}s"></span>
				{/each}
			</div>
		{/if}
		<!-- Tossing coin -->
		{#if tossing}
			<div class="toss-coin"></div>
		{/if}
	</div>
	<div class="well-info">
		<span class="well-count">{loaded ? wishCount.toLocaleString() : '...'}</span>
		<span class="well-label">wishes made</span>
	</div>
</div>

<style>
	.wishing-well {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.wishing-well:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.well-body {
		position: relative;
		width: 5rem;
		height: 4rem;
	}

	.well-svg {
		width: 100%;
		height: 100%;
	}

	.toss-coin {
		position: absolute;
		top: 0;
		left: 50%;
		width: 6px;
		height: 6px;
		background: #f0d060;
		border-radius: 50%;
		border: 1px solid #c8a830;
		animation: coin-toss 0.6s ease-in forwards;
	}

	@keyframes coin-toss {
		0% { transform: translate(-50%, -10px) scale(1); opacity: 1; }
		50% { transform: translate(-50%, 5px) scale(0.7); opacity: 0.8; }
		100% { transform: translate(-50%, 15px) scale(0.3); opacity: 0; }
	}

	.splash {
		position: absolute;
		top: 35%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 1px;
		height: 1px;
	}

	.droplet {
		position: absolute;
		width: 3px;
		height: 3px;
		background: rgba(59, 130, 246, 0.6);
		border-radius: 50%;
		animation: droplet-fly 0.5s ease-out forwards;
		animation-delay: var(--delay);
	}

	@keyframes droplet-fly {
		0% { transform: rotate(var(--angle)) translateY(0) scale(1); opacity: 1; }
		100% { transform: rotate(var(--angle)) translateY(-12px) scale(0); opacity: 0; }
	}

	.well-info {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
	}

	.well-count {
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: rgb(var(--grove-600, 22 163 74));
	}

	:global(.dark) .well-count {
		color: rgb(var(--grove-400, 74 222 128));
	}

	.well-label {
		font-size: 0.65rem;
		opacity: 0.5;
		color: var(--color-text-muted, #888);
	}

	@media (prefers-reduced-motion: reduce) {
		.toss-coin, .droplet { animation: none; opacity: 0; }
	}
</style>
