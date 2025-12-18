<script>
	import ZoomableImage from './ZoomableImage.svelte';
	import LightboxCaption from './LightboxCaption.svelte';

	/**
	 * Lightbox - Full-screen image viewer
	 * Click to expand images to full size with zoom and pan support
	 */
	let { src = '', alt = '', caption = '', isOpen = false, onClose = () => {} } = $props();

	function handleKeydown(/** @type {KeyboardEvent} */ event) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(/** @type {MouseEvent} */ event) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="lightbox-backdrop"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
	>
		<button class="close-button" onclick={onClose} aria-label="Close">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="lightbox-content" onclick={handleBackdropClick}>
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

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
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

	.close-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.close-button svg {
		width: 24px;
		height: 24px;
	}
</style>
