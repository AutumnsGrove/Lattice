<script lang="ts">
	/**
	 * Glass Cathedral — Experience artifact.
	 * Click the glowing entrance to open an immersive prismatic modal.
	 * The owner builds panels; visitors walk through the passage.
	 *
	 * If no panels are configured, shows a "coming soon" teaser.
	 */
	import type { GlassCathedralConfig } from "$lib/curios/artifacts";

	let { config = {}, artifactId = "" }: { config: GlassCathedralConfig; artifactId?: string } =
		$props();

	const baseColor = $derived(config.baseColor || "#9333ea");
	const transition = $derived(config.transition || "fade");

	interface Panel {
		backgroundColor?: string;
		backgroundImageUrl?: string;
		textContent?: string;
		textColor?: string;
		linkUrl?: string;
	}

	let panels = $state<Panel[]>([]);
	let loaded = $state(false);
	let modalOpen = $state(false);
	let currentPanel = $state(0);
	let modalEl: HTMLDivElement | undefined = $state();
	let previousFocus: HTMLElement | null = null;

	// Focus management: capture previous focus on open, focus modal container
	$effect(() => {
		if (modalOpen && modalEl) {
			previousFocus = document.activeElement as HTMLElement | null;
			modalEl.focus();
		}
	});

	// Scroll lock: prevent background scrolling while modal is open
	$effect(() => {
		if (modalOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	});

	$effect(() => {
		if (!artifactId) {
			loaded = true;
			return;
		}
		fetch(`/api/curios/artifacts/${artifactId}/panels`) // csrf-ok
			.then((r) => (r.ok ? (r.json() as Promise<{ panels: Panel[] }>) : { panels: [] }))
			.then((d) => {
				panels = d.panels;
				loaded = true;
			})
			.catch(() => {
				loaded = true;
			});
	});

	function openCathedral() {
		if (panels.length === 0) return;
		currentPanel = 0;
		modalOpen = true;
	}

	function closeCathedral() {
		modalOpen = false;
		previousFocus?.focus();
		previousFocus = null;
	}

	function nextPanel() {
		if (currentPanel < panels.length - 1) {
			currentPanel++;
		}
	}

	function prevPanel() {
		if (currentPanel > 0) {
			currentPanel--;
		}
	}

	function onModalKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			closeCathedral();
		} else if (e.key === "ArrowRight" || e.key === " ") {
			e.preventDefault();
			nextPanel();
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			prevPanel();
		} else if (e.key === "Tab") {
			trapFocus(e);
		}
	}

	/** Trap focus within the cathedral modal */
	function trapFocus(e: KeyboardEvent) {
		if (!modalEl) return;
		const focusable = modalEl.querySelectorAll<HTMLElement>(
			'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
		);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === first || document.activeElement === modalEl) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function onEntranceKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openCathedral();
		}
	}

	const panel = $derived(panels[currentPanel]);
	const hasPanels = $derived(panels.length > 0);
	const isLastPanel = $derived(currentPanel === panels.length - 1);
</script>

<!-- Entrance (always visible) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="cathedral-entrance"
	class:has-panels={hasPanels}
	onclick={openCathedral}
	onkeydown={onEntranceKeydown}
	tabindex="0"
	role="button"
	aria-label="Glass Cathedral — {hasPanels ? 'enter' : 'coming soon'}"
	style="--base-color: {baseColor}"
>
	<svg viewBox="0 0 50 60" class="arch-svg" aria-hidden="true">
		<!-- Archway -->
		<path
			d="M8 58 L8 20 Q8 5 25 5 Q42 5 42 20 L42 58"
			fill="none"
			stroke="var(--base-color)"
			stroke-width="2"
			opacity="0.5"
		/>
		<!-- Stained glass panes -->
		<path
			d="M12 50 L12 22 Q12 10 25 10 Q38 10 38 22 L38 50Z"
			fill="var(--base-color)"
			opacity="0.08"
		/>
		<!-- Light from within -->
		<ellipse cx="25" cy="35" rx="10" ry="12" fill="var(--base-color)" opacity="0.1" />
		<!-- Rose window -->
		<circle
			cx="25"
			cy="18"
			r="5"
			fill="none"
			stroke="var(--base-color)"
			stroke-width="0.8"
			opacity="0.3"
		/>
		<circle cx="25" cy="18" r="2" fill="var(--base-color)" opacity="0.15" />
	</svg>
	<div class="entrance-glow"></div>
	<span class="entrance-label">
		{#if hasPanels}Enter{:else}Coming soon{/if}
	</span>
</div>

<!-- Modal (when open) -->
{#if modalOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="cathedral-modal"
		role="dialog"
		aria-modal="true"
		aria-label="Glass Cathedral — panel {currentPanel + 1} of {panels.length}"
		bind:this={modalEl}
		tabindex="-1"
		onkeydown={onModalKeydown}
		onclick={(e) => {
			if (e.target === e.currentTarget) closeCathedral();
		}}
	>
		<!-- Backdrop -->
		<div class="modal-backdrop"></div>
		<!-- Panel content -->
		<div class="modal-content transition-{transition}">
			{#if panel}
				<div
					class="panel"
					style="
						background-color: {panel.backgroundColor || baseColor};
						{panel.backgroundImageUrl
						? `background-image: url(${panel.backgroundImageUrl}); background-size: cover; background-position: center;`
						: ''}
					"
				>
					{#if panel.textContent}
						<p class="panel-text" style="color: {panel.textColor || '#fff'}">
							{panel.textContent}
						</p>
					{/if}
					{#if isLastPanel && panel.linkUrl}
						<a href={panel.linkUrl} class="panel-treasure" rel="noopener noreferrer">
							Discover what awaits
						</a>
					{/if}
				</div>
			{/if}
			<!-- Navigation -->
			<div class="modal-nav">
				<button
					class="nav-btn"
					onclick={prevPanel}
					disabled={currentPanel === 0}
					aria-label="Previous panel"
				>
					<svg viewBox="0 0 24 24" width="20" height="20"
						><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" /></svg
					>
				</button>
				<span class="nav-counter">{currentPanel + 1} / {panels.length}</span>
				<button class="nav-btn" onclick={nextPanel} disabled={isLastPanel} aria-label="Next panel">
					<svg viewBox="0 0 24 24" width="20" height="20"
						><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" /></svg
					>
				</button>
			</div>
			<!-- Close -->
			<button class="close-btn" onclick={closeCathedral} aria-label="Close cathedral">
				<svg viewBox="0 0 24 24" width="24" height="24"
					><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" /></svg
				>
			</button>
		</div>
	</div>
{/if}

<style>
	/* ── Entrance ── */
	.cathedral-entrance {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		cursor: default;
		outline: none;
		position: relative;
	}

	.cathedral-entrance.has-panels {
		cursor: pointer;
	}

	.cathedral-entrance:focus-visible {
		outline: 2px solid var(--base-color);
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.arch-svg {
		width: 4rem;
		height: auto;
		filter: drop-shadow(0 0 8px var(--base-color));
	}

	.entrance-glow {
		position: absolute;
		bottom: 20%;
		left: 50%;
		transform: translateX(-50%);
		width: 3rem;
		height: 3rem;
		background: radial-gradient(circle, var(--base-color), transparent 70%);
		opacity: 0.15;
		animation: glow-breathe 3s ease-in-out infinite;
		pointer-events: none;
	}

	.has-panels .entrance-glow {
		opacity: 0.25;
	}

	:global(.dark) .entrance-glow {
		opacity: 0.3;
	}
	:global(.dark) .has-panels .entrance-glow {
		opacity: 0.4;
	}

	.entrance-label {
		font-size: 0.65rem;
		opacity: 0.5;
		color: var(--color-text-muted, #888);
	}

	@keyframes glow-breathe {
		0%,
		100% {
			opacity: 0.15;
			transform: translateX(-50%) scale(1);
		}
		50% {
			opacity: 0.25;
			transform: translateX(-50%) scale(1.1);
		}
	}

	/* ── Modal ── */
	.cathedral-modal {
		position: fixed;
		inset: 0;
		z-index: 60; /* z-grove-modal */
		display: flex;
		align-items: center;
		justify-content: center;
		outline: none;
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		pointer-events: none;
	}

	.modal-content {
		position: relative;
		width: 90vw;
		max-width: 48rem;
		height: 80vh;
		max-height: 36rem;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 0 40px rgba(var(--base-color), 0.2);
	}

	.panel {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.panel-text {
		font-size: 1.25rem;
		line-height: 1.6;
		text-align: center;
		max-width: 32rem;
		margin: 0;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.panel-treasure {
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: #fff;
		text-decoration: none;
		font-weight: 600;
		backdrop-filter: blur(4px);
		transition: background 0.2s ease;
	}

	.panel-treasure:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Navigation */
	.modal-nav {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.5rem 1rem;
		border-radius: 999px;
		backdrop-filter: blur(4px);
	}

	.nav-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 50%;
		display: flex;
	}

	.nav-btn:hover:not(:disabled) {
		color: #fff;
	}
	.nav-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.nav-counter {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		font-variant-numeric: tabular-nums;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		backdrop-filter: blur(4px);
	}

	.close-btn:hover {
		color: #fff;
	}

	/* Transitions */
	.transition-fade .panel {
		animation: panel-fade 0.4s ease;
	}
	.transition-slide .panel {
		animation: panel-slide 0.4s ease;
	}
	.transition-dissolve .panel {
		animation: panel-dissolve 0.6s ease;
	}

	@keyframes panel-fade {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes panel-slide {
		0% {
			transform: translateX(3rem);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@keyframes panel-dissolve {
		0% {
			opacity: 0;
			filter: blur(8px);
		}
		100% {
			opacity: 1;
			filter: blur(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.entrance-glow {
			animation: none;
		}
		.transition-fade .panel,
		.transition-slide .panel,
		.transition-dissolve .panel {
			animation: none;
		}
	}

	@media (max-width: 640px) {
		.modal-content {
			width: 95vw;
			height: 85vh;
		}
		.panel-text {
			font-size: 1rem;
		}
	}
</style>
