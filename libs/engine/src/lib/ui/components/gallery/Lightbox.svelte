<script lang="ts">
	import { untrack } from 'svelte';
	import { navIcons } from '@autumnsgrove/prism/icons';
	import ZoomableImage from './ZoomableImage.svelte';
	import LightboxCaption from './LightboxCaption.svelte';

	/**
	 * Lightbox - Full-screen image viewer
	 * Click to expand images to full size with zoom and pan support.
	 *
	 * Pass onPrevious / onNext to use it as a gallery viewer: the arrow
	 * buttons and the arrow keys then step between images. Leave them out
	 * for a single image. While open it traps focus and hands it back to
	 * whatever opened it.
	 */
	interface Props {
		src?: string;
		alt?: string;
		caption?: string;
		isOpen?: boolean;
		onClose?: () => void;
		onPrevious?: () => void;
		onNext?: () => void;
		/** Position label for galleries, e.g. "2 of 5" */
		position?: string;
	}

	let {
		src = '',
		alt = '',
		caption = '',
		isOpen = false,
		onClose = () => {},
		onPrevious,
		onNext,
		position = ''
	}: Props = $props();

	let dialogElement: HTMLDivElement | undefined = $state();
	let closeButton: HTMLButtonElement | undefined = $state();

	// Move focus into the dialog on open, give it back on close
	$effect(() => {
		if (!isOpen) return;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		untrack(() => closeButton?.focus());
		return () => previouslyFocused?.focus?.();
	});

	function trapFocus(event: KeyboardEvent) {
		if (!dialogElement) return;
		const focusable = dialogElement.querySelectorAll<HTMLElement>(
			'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// Registered on the window and on the dialog, so one keypress can arrive
	// twice; preventDefault() marks it handled for the second pass.
	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen || event.defaultPrevented) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
		} else if (event.key === 'ArrowLeft' && onPrevious) {
			event.preventDefault();
			onPrevious();
		} else if (event.key === 'ArrowRight' && onNext) {
			event.preventDefault();
			onNext();
		} else if (event.key === 'Tab') {
			trapFocus(event);
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		bind:this={dialogElement}
		class="lightbox-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
	>
		<button bind:this={closeButton} class="close-button" onclick={onClose} aria-label="Close">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
		{#if position}
			<div class="lightbox-position" aria-live="polite">{position}</div>
		{/if}
		{#if onPrevious}
			<button class="nav-button nav-previous" onclick={onPrevious} aria-label="Previous image">
				<navIcons.chevronLeft />
			</button>
		{/if}
		{#if onNext}
			<button class="nav-button nav-next" onclick={onNext} aria-label="Next image">
				<navIcons.chevronRight />
			</button>
		{/if}
		<div
			class="lightbox-content"
			onclick={handleBackdropClick}
			onkeydown={handleKeydown}
			role="presentation"
		>
			<ZoomableImage {src} {alt} isActive={isOpen} class="lightbox-image" />
		</div>
		<LightboxCaption {caption} />
	</div>
{/if}

<style>
	.lightbox-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		cursor: pointer;
		padding: 2rem;
	}

	.lightbox-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
	}

	:global(.lightbox-content .lightbox-image) {
		max-width: 90vw;
		object-fit: contain;
		border-radius: 4px;
		flex: 1 1 auto;
		min-height: 0;
	}

	.close-button,
	.nav-button {
		position: absolute;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: background 0.2s;
	}

	.close-button {
		top: 1rem;
		right: 1rem;
	}

	.nav-button {
		top: 50%;
		transform: translateY(-50%);
	}

	.nav-previous {
		left: 1rem;
	}

	.nav-next {
		right: 1rem;
	}

	.close-button:hover,
	.nav-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.close-button:focus-visible,
	.nav-button:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	.close-button svg {
		width: 24px;
		height: 24px;
	}

	.nav-button :global(svg) {
		width: 24px;
		height: 24px;
	}

	.lightbox-position {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.close-button,
		.nav-button {
			transition: none;
		}
	}
</style>
