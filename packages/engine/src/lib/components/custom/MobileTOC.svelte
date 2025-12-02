<script>
	let { headers = [] } = $props();

	let isOpen = $state(false);
	let menuRef = $state();
	let buttonRef = $state();
	let activeId = $state('');

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function scrollToHeader(id) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// Update URL hash without jumping
			history.pushState(null, '', `#${id}`);
		}
		closeMenu();
	}

	// Handle click outside
	function handleClickOutside(event) {
		if (isOpen && menuRef && buttonRef) {
			if (!menuRef.contains(event.target) && !buttonRef.contains(event.target)) {
				closeMenu();
			}
		}
	}

	// Handle escape key
	function handleKeydown(event) {
		if (event.key === 'Escape' && isOpen) {
			closeMenu();
		}
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
			<div class="toc-menu" bind:this={menuRef}>
				<h3 class="toc-title">Table of Contents</h3>
				<ul class="toc-list">
					{#each headers as header (header.id)}
						<li
							class="toc-item level-{header.level}"
							class:active={activeId === header.id}
						>
							<button
								type="button"
								onclick={() => scrollToHeader(header.id)}
								class="toc-link"
							>
								{header.text}
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
		z-index: 1000;
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
		background: #7c4dab;
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
		background: #6a3d9a;
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
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		padding: 1rem;
		animation: slideIn 0.2s ease;
	}
	:global(.dark) .toc-menu {
		background: var(--light-bg-tertiary);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
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
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--light-border-primary);
	}
	:global(.dark) .toc-title {
		color: var(--color-text-subtle-dark);
		border-bottom-color: var(--light-border-light);
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
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0;
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
		transition: color 0.2s ease;
		font-size: 0.875rem;
		font-family: inherit;
		line-height: 1.4;
	}
	.toc-link:hover {
		color: #7c4dab;
	}
	:global(.dark) .toc-link:hover {
		color: #a87ddb;
	}
	.toc-item.active .toc-link {
		color: #7c4dab;
		font-weight: 600;
	}
	:global(.dark) .toc-item.active .toc-link {
		color: #a87ddb;
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
		background: var(--light-text-secondary);
		border-radius: 2px;
	}
	:global(.dark) .toc-menu::-webkit-scrollbar-thumb {
		background: var(--light-text-secondary);
	}
</style>
