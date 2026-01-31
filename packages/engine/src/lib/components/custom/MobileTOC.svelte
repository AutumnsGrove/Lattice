<script lang="ts">
	import { type TOCHeader, DEFAULT_SCROLL_OFFSET, isValidIcon } from './types.js';

	// Re-export for consumers who import from this component
	export type { TOCHeader };

	interface Props {
		/** Array of headers to display in the TOC */
		headers?: TOCHeader[];
		/** Title displayed at the top of the menu */
		title?: string;
		/** Scroll offset in pixels to account for sticky headers */
		scrollOffset?: number;
	}

	let { headers = [], title = 'Table of Contents', scrollOffset = DEFAULT_SCROLL_OFFSET }: Props = $props();

	let isOpen = $state(false);
	let menuRef = $state<HTMLDivElement>();
	let buttonRef = $state<HTMLButtonElement>();
	let activeId = $state('');
	let previouslyFocusedElement: HTMLElement | null = null;

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	// Focus trap: Tab key cycles within menu
	function handleFocusTrap(event: KeyboardEvent) {
		if (event.key === 'Tab' && isOpen && menuRef) {
			const focusableElements = menuRef.querySelectorAll<HTMLElement>(
				'button, a, [tabindex]:not([tabindex="-1"])'
			);
			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				// Shift+Tab on first element: wrap to last
				event.preventDefault();
				lastElement?.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				// Tab on last element: wrap to first
				event.preventDefault();
				firstElement?.focus();
			}
		}
	}

	function scrollToHeader(id: string) {
		const element = document.getElementById(id);
		if (element) {
			const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
			const offsetPosition = elementPosition - scrollOffset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			});

			// Update URL hash without jumping
			history.pushState(null, '', `#${id}`);
		}
		closeMenu();
	}

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		if (isOpen && menuRef && buttonRef) {
			const target = event.target as Node;
			if (!menuRef.contains(target) && !buttonRef.contains(target)) {
				closeMenu();
			}
		}
	}

	// Handle escape key and focus trap
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeMenu();
			// Restore focus to button when closing
			buttonRef?.focus();
		}
		handleFocusTrap(event);
	}

	// Set up intersection observer to track active section
	function setupScrollTracking() {
		if (typeof window === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0% -35% 0%',
				threshold: 0
			}
		);

		headers.forEach((header) => {
			const element = document.getElementById(header.id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}

	// Handle focus management when menu opens/closes
	$effect(() => {
		if (isOpen) {
			// Store the previously focused element to restore later
			previouslyFocusedElement = document.activeElement as HTMLElement;
			// Focus the first TOC item when menu opens
			requestAnimationFrame(() => {
				const firstLink = menuRef?.querySelector<HTMLButtonElement>('.toc-link');
				firstLink?.focus();
			});
		} else {
			if (previouslyFocusedElement && previouslyFocusedElement !== buttonRef) {
				// Restore focus when menu closes (unless already on button)
				previouslyFocusedElement.focus();
			}
			previouslyFocusedElement = null;
		}
	});

	$effect(() => {
		const cleanup = setupScrollTracking();

		// Add event listeners
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			if (cleanup) cleanup();
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if headers.length > 0}
	<div class="mobile-toc-wrapper">
		<!-- Floating Button -->
		<button
			bind:this={buttonRef}
			class="toc-button"
			onclick={toggleMenu}
			aria-label="Toggle table of contents"
			aria-expanded={isOpen}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="3" y1="6" x2="21" y2="6"></line>
				<line x1="3" y1="12" x2="15" y2="12"></line>
				<line x1="3" y1="18" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Floating Menu -->
		{#if isOpen}
			<div
				class="toc-menu"
				bind:this={menuRef}
				role="dialog"
				aria-modal="true"
				aria-label="Table of contents"
			>
				<h3 class="toc-title">{title}</h3>
				<ul class="toc-list">
					{#each headers as header (header.id)}
						{@const IconComponent = header.icon && isValidIcon(header.icon) ? header.icon : null}
						<li
							class="toc-item level-{header.level ?? 2}"
							class:active={activeId === header.id}
							class:has-icon={!!IconComponent}
						>
							<button
								type="button"
								onclick={() => scrollToHeader(header.id)}
								class="toc-link"
							>
								{#if IconComponent}
									<IconComponent class="toc-icon" />
								{/if}
								<span>{header.text}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<style>
	.mobile-toc-wrapper {
		display: none;
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		/*
		 * Z-INDEX: grove-fab level (40)
		 * This sits above page content but below:
		 * - Mobile menu overlay (9990)
		 * - Mobile menu (9999)
		 * - Modals (50+)
		 * See tailwind.preset.js for the full z-index scale
		 */
		z-index: 40;
	}
	/* Show only on mobile (tablet and desktop have sidebar TOC) */
	@media (max-width: 768px) {
		.mobile-toc-wrapper {
			display: block;
		}
	}
	.toc-button {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		/* Uses accent color for consistency with Grove theme */
		background: var(--accent-success, #2c5f2d);
		border: none;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: background-color 0.2s ease, transform 0.2s ease;
	}
	.toc-button:hover {
		background: var(--accent-success-dark, #234a24);
	}
	.toc-button:active {
		transform: scale(0.95);
	}
	.toc-menu {
		position: absolute;
		bottom: 52px;
		right: 0;
		width: 280px;
		max-height: 60vh;
		overflow-y: auto;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 12px;
		border: 1px solid var(--color-divider, rgba(0, 0, 0, 0.08));
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		padding: 1rem;
		animation: slideIn 0.2s ease;
	}
	:global(.dark) .toc-menu {
		background: rgba(30, 30, 30, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.toc-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-foreground-muted, #666);
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-divider, rgba(0, 0, 0, 0.1));
	}
	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.toc-item {
		margin: 0;
		padding: 0;
	}
	.toc-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0;
		background: none;
		border: none;
		color: var(--color-foreground-muted, #555);
		cursor: pointer;
		transition: color 0.2s ease;
		font-size: 0.875rem;
		font-family: inherit;
		line-height: 1.4;
	}
	/* Icon styling */
	.toc-link :global(.toc-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}
	.toc-item.active .toc-link :global(.toc-icon),
	.toc-link:hover :global(.toc-icon) {
		opacity: 1;
	}
	.toc-link:hover {
		color: var(--accent-success, #2c5f2d);
	}
	.toc-item.active .toc-link {
		color: var(--accent-success, #2c5f2d);
		font-weight: 600;
	}
	/* Indentation based on header level */
	.level-1 .toc-link {
		padding-left: 0;
		font-weight: 600;
	}
	.level-2 .toc-link {
		padding-left: 0;
	}
	.level-3 .toc-link {
		padding-left: 1rem;
	}
	.level-4 .toc-link {
		padding-left: 2rem;
	}
	.level-5 .toc-link {
		padding-left: 3rem;
	}
	.level-6 .toc-link {
		padding-left: 4rem;
	}
	/* Scrollbar styling */
	.toc-menu::-webkit-scrollbar {
		width: 4px;
	}
	.toc-menu::-webkit-scrollbar-track {
		background: transparent;
	}
	.toc-menu::-webkit-scrollbar-thumb {
		background: var(--color-foreground-subtle, #ccc);
		border-radius: 2px;
	}
</style>
