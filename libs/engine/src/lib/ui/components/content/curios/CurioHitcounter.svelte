<script lang="ts">
	/**
	 * CurioHitcounter — Retro-style page visit counter
	 *
	 * Four fully-realized styles, each with its own personality:
	 * - Classic: Frosted glass digit cells with grove-green glow
	 * - Odometer: Warm mechanical flip counter with brass bezels
	 * - LCD: Seven-segment display with ghosted inactive segments
	 * - Minimal: Subtle accent text — just appears, no fuss
	 *
	 * All animations are CSS-only and gated by prefers-reduced-motion.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		count: number;
		formattedCount: string;
		digits: string[];
		style: string;
		label: string;
		showSinceDate: boolean;
		startedAt: string;
		sinceDateStyle: string;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		const page = arg || window.location.pathname;
		fetch(`/api/curios/hitcounter?page=${encodeURIComponent(page)}&increment=true`) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioHitcounter] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	const sinceDateStyle = $derived(data?.sinceDateStyle ?? 'footnote');
</script>

<!-- ─── Loading skeleton ─── -->
{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading hit counter…</span>
		<div class="hitcounter-skeleton">
			{#each Array(6) as _}
				<span class="hitcounter-digit-placeholder">&nbsp;</span>
			{/each}
		</div>
	</div>

<!-- ─── Error state ─── -->
{:else if error}
	<span class="grove-curio-error">Hit counter unavailable</span>

<!-- ─── Loaded: style-branched rendering ─── -->
{:else if data}
	<div
		class="hitcounter hitcounter--{data.style} hitcounter--loaded"
		role="img"
		aria-label="{data.label} number {data.formattedCount}"
	>
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- Classic — Frosted glass digit cells with grove-green glow  -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if data.style === 'classic'}
			{#if data.label}
				<span class="hitcounter-label classic-label">{data.label}</span>
			{/if}
			<div class="classic-digits">
				{#each data.digits as digit}
					<span class="classic-digit">{digit}</span>
				{/each}
			</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- Odometer — Warm mechanical flip counter with brass bezels   -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{:else if data.style === 'odometer'}
			{#if data.label}
				<span class="hitcounter-label odometer-label">{data.label}</span>
			{/if}
			<div class="odometer-digits">
				{#each data.digits as digit, i}
					<span class="odometer-cell" style="animation-delay: {i * 0.08}s">
						{digit}
					</span>
				{/each}
			</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- LCD — Seven-segment display with ghosted inactive segments  -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{:else if data.style === 'lcd'}
			{#if data.label}
				<span class="hitcounter-label lcd-label">{data.label}</span>
			{/if}
			<div class="lcd-screen">
				{#each data.digits as digit}
					<span class="lcd-cell">
						<span class="lcd-ghost" aria-hidden="true">8</span>
						<span class="lcd-active">{digit}</span>
					</span>
				{/each}
			</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- Minimal — Subtle accent text, tiny leaf separator           -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{:else if data.style === 'minimal'}
			<span class="minimal-content">
				{#if data.label}
					<span class="minimal-label">{data.label}</span>
					<!-- Tiny leaf separator -->
					<svg class="minimal-leaf" aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
						<path d="M5 1C3 3 1 5 1 7c0 1.5 1 2 2 2 1.5 0 2-.5 2-2V1z" fill="currentColor" opacity="0.4" />
					</svg>
				{/if}
				<span class="minimal-number">#{data.formattedCount}</span>
			</span>
		{/if}

		<!-- ─── Since-date (shared across styles) ─── -->
		{#if data.showSinceDate && data.startedAt}
			<span class="hitcounter-since hitcounter-since--{sinceDateStyle}">
				since {new Date(data.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
			</span>
		{/if}
	</div>
{/if}

<style>
	/* ═══════════════════════════════════════════════════════════════════
	   SHARED — Layout, labels, since-date
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		font-family: 'Courier New', Consolas, ui-monospace, monospace;
		opacity: 0;
	}

	.hitcounter--loaded {
		opacity: 1;
	}

	.hitcounter-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	/* Since-date: footnote variant (default) */
	.hitcounter-since {
		font-size: 0.625rem;
		opacity: 0.5;
		font-style: italic;
	}

	/* Since-date: integrated variant — etched plaque feel */
	.hitcounter-since--integrated {
		font-style: normal;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		opacity: 0.55;
		border-top: 1px solid currentColor;
		padding-top: 0.35rem;
		margin-top: 0.25rem;
	}

	/* ═══════════════════════════════════════════════════════════════════
	   CLASSIC — Frosted glass digit cells, grove-green glow
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter--classic .classic-digits {
		display: flex;
		gap: 2px;
	}

	.hitcounter--classic .classic-digit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 2.25rem;
		/* Frosted glass cell — grove palette */
		background: rgb(var(--grove-950, 5 46 22) / 0.92);
		color: rgb(var(--grove-400, 74 222 128));
		font-size: 1.25rem;
		font-weight: bold;
		border-radius: 3px;
		border: 1px solid rgb(var(--grove-800, 22 101 52) / 0.6);
		backdrop-filter: blur(4px);
		text-shadow: 0 0 6px rgb(var(--grove-400, 74 222 128) / 0.4);
		/* Entrance: fade + glow pulse */
		animation: classic-enter 0.6s ease-out both;
	}

	@keyframes classic-enter {
		0% {
			opacity: 0;
			text-shadow: 0 0 12px rgb(var(--grove-400, 74 222 128) / 0.8);
		}
		60% {
			opacity: 1;
			text-shadow: 0 0 10px rgb(var(--grove-400, 74 222 128) / 0.6);
		}
		100% {
			opacity: 1;
			text-shadow: 0 0 6px rgb(var(--grove-400, 74 222 128) / 0.4);
		}
	}

	.hitcounter--classic .classic-label {
		color: rgb(var(--grove-400, 74 222 128) / 0.7);
	}

	/* Classic dark mode — lighter glass */
	:global(.dark) .hitcounter--classic .classic-digit {
		background: rgb(var(--cream-100, 37 35 32) / 0.08);
		border-color: rgb(var(--grove-700, 21 128 61) / 0.4);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   ODOMETER — Warm mechanical flip counter, brass bezels
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter--odometer .odometer-digits {
		display: flex;
		gap: 1px;
	}

	.hitcounter--odometer .odometer-cell {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.85rem;
		height: 2.5rem;
		position: relative;
		/* Cream/parchment gradient background */
		background: linear-gradient(
			180deg,
			rgb(var(--cream-50, 253 251 247)) 0%,
			rgb(var(--cream-100, 250 247 240)) 45%,
			rgb(var(--cream-200, 243 237 224)) 55%,
			rgb(var(--cream-50, 253 251 247)) 100%
		);
		color: rgb(var(--bark-800, 68 51 34));
		font-size: 1.35rem;
		font-weight: 700;
		border-radius: 2px;
		/* Brass bezel */
		border: 1px solid rgb(var(--bark-400, 161 137 104));
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5);
		/* Entrance: flip in */
		animation: odometer-flip 1.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	/* Center split line — mechanical separator */
	.hitcounter--odometer .odometer-cell::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: rgb(var(--bark-400, 161 137 104) / 0.3);
		pointer-events: none;
	}

	@keyframes odometer-flip {
		0% {
			transform: rotateX(90deg);
			opacity: 0;
		}
		40% {
			opacity: 1;
		}
		100% {
			transform: rotateX(0deg);
			opacity: 1;
		}
	}

	.hitcounter--odometer .odometer-label {
		color: rgb(var(--bark-600, 113 89 62));
	}

	/* Odometer dark mode — subdued cream */
	:global(.dark) .hitcounter--odometer .odometer-cell {
		background: linear-gradient(
			180deg,
			rgb(var(--cream-100, 37 35 32) / 0.18) 0%,
			rgb(var(--cream-100, 37 35 32) / 0.12) 45%,
			rgb(var(--cream-100, 37 35 32) / 0.22) 55%,
			rgb(var(--cream-100, 37 35 32) / 0.15) 100%
		);
		color: rgb(var(--cream-50, 253 251 247));
		border-color: rgb(var(--bark-400, 161 137 104) / 0.4);
	}

	:global(.dark) .hitcounter--odometer .odometer-cell::after {
		background: rgb(var(--bark-400, 161 137 104) / 0.2);
	}

	:global(.dark) .hitcounter--odometer .odometer-label {
		color: rgb(var(--cream-200, 243 237 224) / 0.7);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   LCD — Seven-segment with ghosted inactive segments
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter--lcd .lcd-screen {
		display: flex;
		gap: 3px;
		padding: 0.6rem 0.75rem;
		/* Dark green screen gradient */
		background: linear-gradient(180deg, #1a2e1a 0%, #0d1f0d 100%);
		border-radius: 4px;
		border: 1px solid rgb(var(--grove-800, 22 101 52) / 0.5);
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
		/* Entrance: LCD flicker-on */
		animation: lcd-flicker 0.4s steps(3) both;
	}

	.hitcounter--lcd .lcd-cell {
		position: relative;
		width: 1.5rem;
		height: 2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	/* Ghost layer — "8" at low opacity behind active digit */
	.hitcounter--lcd .lcd-ghost {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgb(var(--grove-400, 74 222 128) / 0.1);
		font-size: inherit;
		font-weight: inherit;
	}

	.hitcounter--lcd .lcd-active {
		position: relative;
		color: rgb(var(--grove-400, 74 222 128));
		text-shadow: 0 0 8px rgb(var(--grove-400, 74 222 128) / 0.5);
	}

	@keyframes lcd-flicker {
		0% {
			opacity: 0;
		}
		33% {
			opacity: 0.6;
		}
		66% {
			opacity: 0.3;
		}
		100% {
			opacity: 1;
		}
	}

	.hitcounter--lcd .lcd-label {
		color: rgb(var(--grove-400, 74 222 128) / 0.6);
		font-size: 0.7rem;
	}

	/* LCD dark mode — deeper surround, brighter glow */
	:global(.dark) .hitcounter--lcd .lcd-screen {
		background: linear-gradient(180deg, #0d1a0d 0%, #050f05 100%);
		border-color: rgb(var(--grove-800, 22 101 52) / 0.3);
	}

	:global(.dark) .hitcounter--lcd .lcd-active {
		text-shadow: 0 0 10px rgb(var(--grove-400, 74 222 128) / 0.7);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   MINIMAL — Subtle accent text, tiny leaf separator
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter--minimal {
		font-family: system-ui, -apple-system, sans-serif;
		padding: 0.5rem 0.75rem;
	}

	.hitcounter--minimal .minimal-content {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.hitcounter--minimal .minimal-label {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
	}

	.hitcounter--minimal .minimal-leaf {
		color: rgb(var(--grove-600, 22 163 74));
		align-self: center;
		flex-shrink: 0;
	}

	.hitcounter--minimal .minimal-number {
		font-size: 1.1rem;
		font-weight: 700;
		color: rgb(var(--grove-600, 22 163 74));
	}

	/* Minimal dark mode — green brightens, label warms */
	:global(.dark) .hitcounter--minimal .minimal-number {
		color: rgb(var(--grove-400, 74 222 128));
	}

	:global(.dark) .hitcounter--minimal .minimal-label {
		color: rgb(var(--cream-200, 243 237 224) / 0.7);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   SKELETON — Loading placeholder
	   ═══════════════════════════════════════════════════════════════════ */

	.hitcounter-skeleton {
		display: flex;
		gap: 2px;
		justify-content: center;
	}

	.hitcounter-digit-placeholder {
		display: inline-block;
		width: 1.75rem;
		height: 2.25rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 3px;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.3; }
	}

	/* Skeleton dark mode */
	:global(.dark) .hitcounter-digit-placeholder {
		background: rgba(255, 255, 255, 0.08);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   REDUCED MOTION — Instant everything
	   ═══════════════════════════════════════════════════════════════════ */

	@media (prefers-reduced-motion: reduce) {
		.hitcounter--loaded {
			opacity: 1;
		}

		.hitcounter--classic .classic-digit,
		.hitcounter--odometer .odometer-cell,
		.hitcounter--lcd .lcd-screen,
		.hitcounter-digit-placeholder {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	/* ═══════════════════════════════════════════════════════════════════
	   SCREEN READER ONLY
	   ═══════════════════════════════════════════════════════════════════ */

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
</style>
