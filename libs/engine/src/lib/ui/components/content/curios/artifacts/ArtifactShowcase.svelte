<script lang="ts">
	/**
	 * ArtifactShowcase — Reusable floating overlay for browsing artifacts.
	 *
	 * Works in two contexts:
	 * 1. Live site: Visitors click an artifact → expands into a spotlight with gallery nav
	 * 2. Arbor admin: Same showcase + admin info section (config/zone/visibility)
	 */
	import type { ArtifactDisplay } from "$lib/curios/artifacts";
	import { getTypeLabel, summarizeConfig } from "$lib/curios/artifacts";
	import ArtifactRenderer from "./ArtifactRenderer.svelte";
	import { ChevronLeft, ChevronRight, X } from "lucide-svelte";

	let {
		artifacts,
		currentIndex = 0,
		open = $bindable(false),
		tenantId = "",
		adminMode = false,
		onclose,
	}: {
		artifacts: ArtifactDisplay[];
		currentIndex?: number;
		open: boolean;
		tenantId?: string;
		adminMode?: boolean;
		onclose?: () => void;
	} = $props();

	let index = $state(0);
	let containerEl: HTMLDivElement | undefined = $state();
	let previousFocus: HTMLElement | null = null;

	// Sync internal index when currentIndex prop changes while opening
	$effect(() => {
		if (open) {
			index = Math.min(currentIndex, artifacts.length - 1);
		}
	});

	// Focus management: capture previous focus on open, restore on close
	$effect(() => {
		if (open && containerEl) {
			previousFocus = document.activeElement as HTMLElement | null;
			containerEl.focus();
		}
	});

	// Scroll lock: prevent background scrolling while showcase is open
	$effect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	});

	const current = $derived(artifacts[index]);
	const hasPrev = $derived(index > 0);
	const hasNext = $derived(index < artifacts.length - 1);

	function prev() {
		if (hasPrev) index--;
	}

	function next() {
		if (hasNext) index++;
	}

	function close() {
		open = false;
		onclose?.();
		// Return focus to the element that opened the showcase
		previousFocus?.focus();
		previousFocus = null;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			close();
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			prev();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			next();
		} else if (e.key === "Tab") {
			// Focus trap: keep Tab cycling within the dialog
			trapFocus(e);
		}
	}

	/** Trap focus within the showcase panel */
	function trapFocus(e: KeyboardEvent) {
		if (!containerEl) return;
		const focusable = containerEl.querySelectorAll<HTMLElement>(
			'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
		);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === first || document.activeElement === containerEl) {
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

	function onbackdrop(e: MouseEvent) {
		// Only close if clicking the backdrop itself, not the content
		if (e.target === e.currentTarget) close();
	}
</script>

{#if open && current}
	<div
		class="showcase-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="showcase-title"
		bind:this={containerEl}
		tabindex="-1"
		{onkeydown}
		onclick={onbackdrop}
	>
		<div class="showcase-panel">
			<!-- Close button -->
			<button class="close-btn" onclick={close} aria-label="Close showcase">
				<X size={20} />
			</button>

			<!-- Artifact stage -->
			<div class="showcase-stage">
				<div class="stage-glow"></div>
				{#key index}
					<div class="stage-content">
						<ArtifactRenderer artifact={current} {tenantId} />
					</div>
				{/key}
			</div>

			<!-- Info section -->
			<div class="showcase-info">
				<h2 id="showcase-title" class="artifact-name">
					{current.name || getTypeLabel(current.artifactType)}
				</h2>
				{#if current.name}
					<p class="artifact-type-label">{getTypeLabel(current.artifactType)}</p>
				{/if}

				<!-- Admin info -->
				{#if adminMode}
					<div class="admin-divider"></div>
					<div class="admin-tags">
						<span class="admin-tag">{current.placement}</span>
						<span class="admin-tag admin-tag--visibility">{current.visibility}</span>
						<span class="admin-tag admin-tag--reveal">{current.revealAnimation}</span>
						{#if current.container === "glass-card"}
							<span class="admin-tag admin-tag--container">glass card</span>
						{/if}
						{#each summarizeConfig(current.config) as tag}
							<span class="admin-tag admin-tag--config">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			{#if artifacts.length > 1}
				<nav class="showcase-nav" aria-label="Artifact navigation">
					<button class="nav-btn" onclick={prev} disabled={!hasPrev} aria-label="Previous artifact">
						<ChevronLeft size={18} />
					</button>
					<span class="nav-counter" aria-live="polite">
						{index + 1} / {artifacts.length}
					</span>
					<button class="nav-btn" onclick={next} disabled={!hasNext} aria-label="Next artifact">
						<ChevronRight size={18} />
					</button>
				</nav>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Backdrop ── */
	.showcase-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60; /* z-grove-modal */
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		padding: 1rem;
		outline: none;
		animation: backdrop-enter 0.25s ease-out both;
	}

	/* ── Glass Panel ── */
	.showcase-panel {
		position: relative;
		max-width: 32rem;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		backdrop-filter: blur(16px);
		padding: 2rem 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow:
			0 0 40px rgba(217, 119, 6, 0.06),
			0 8px 32px rgba(0, 0, 0, 0.4);
		animation: panel-enter 0.3s ease-out 0.05s both;
	}

	/* ── Close Button ── */
	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.close-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	.close-btn:focus-visible {
		outline: 2px solid rgba(217, 119, 6, 0.7);
		outline-offset: 2px;
	}

	/* ── Artifact Stage ── */
	.showcase-stage {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 8rem;
		overflow: hidden;
		max-width: 24rem;
		margin: 0 auto;
		width: 100%;
		padding: 1rem 0;
	}

	.stage-glow {
		position: absolute;
		inset: -1rem;
		background: radial-gradient(
			ellipse at center,
			rgba(217, 119, 6, 0.06) 0%,
			rgba(234, 179, 8, 0.03) 40%,
			transparent 70%
		);
		pointer-events: none;
	}

	.stage-content {
		position: relative;
		z-index: 1;
	}

	/* ── Info Section ── */
	.showcase-info {
		text-align: center;
	}

	.artifact-name {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.artifact-type-label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0.25rem 0 0;
	}

	/* ── Admin Info ── */
	.admin-divider {
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.1) 30%,
			rgba(255, 255, 255, 0.1) 70%,
			transparent
		);
		margin: 0.75rem 0;
	}

	.admin-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		justify-content: center;
	}

	.admin-tag {
		font-size: 0.7rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
	}

	.admin-tag--visibility {
		background: rgba(147, 51, 234, 0.2);
		color: rgb(192, 132, 252);
	}

	.admin-tag--reveal {
		background: rgba(234, 179, 8, 0.2);
		color: rgb(250, 204, 21);
	}

	.admin-tag--container {
		background: rgba(59, 130, 246, 0.2);
		color: rgb(147, 197, 253);
	}

	.admin-tag--config {
		background: rgba(16, 185, 129, 0.2);
		color: rgb(110, 231, 183);
	}

	/* ── Navigation Pill ── */
	.showcase-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		padding: 0.25rem;
		align-self: center;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.nav-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.95);
	}

	.nav-btn:focus-visible {
		outline: 2px solid rgba(217, 119, 6, 0.7);
		outline-offset: -2px;
	}

	.nav-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.nav-counter {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
		min-width: 3.5rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	/* ── Entrance Animations ── */
	@keyframes backdrop-enter {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes panel-enter {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(0.5rem);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.showcase-panel {
			max-width: 100%;
			max-height: 90vh;
			padding: 1.5rem 1rem 1rem;
			border-radius: 0.75rem;
		}

		.showcase-nav {
			gap: 0.25rem;
		}
	}

	/* ── Reduced Motion ── */
	@media (prefers-reduced-motion: reduce) {
		.showcase-backdrop {
			animation: none;
		}

		.showcase-panel {
			backdrop-filter: none;
			animation: none;
		}

		.close-btn,
		.nav-btn {
			transition: none;
		}
	}
</style>
