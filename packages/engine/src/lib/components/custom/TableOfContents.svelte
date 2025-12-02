<script>
	let { headers = [] } = $props();

	let activeId = $state('');

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

		// Observe all headers in the document
		headers.forEach((header) => {
			const element = document.getElementById(header.id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}

	// Set up scroll tracking (runs on mount and when headers change)
	$effect(() => {
		const cleanup = setupScrollTracking();
		return cleanup;
	});

	function scrollToHeader(id) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// Update URL hash without jumping
			history.pushState(null, '', `#${id}`);
		}
	}
</script>

{#if headers.length > 0}
	<nav class="toc">
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
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: 2rem;
		max-height: calc(100vh - 4rem);
		overflow-y: auto;
		padding: 1rem;
		font-size: 0.875rem;
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
		transition: color 0.3s ease, border-color 0.3s ease;
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
		padding: 0.375rem 0;
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
		transition: color 0.2s ease;
		font-size: inherit;
		font-family: inherit;
		line-height: 1.4;
	}
	.toc-link:hover {
		color: #2c5f2d;
	}
	:global(.dark) .toc-link:hover {
		color: var(--accent-success);
	}
	.toc-item.active .toc-link {
		color: #2c5f2d;
		font-weight: 600;
	}
	:global(.dark) .toc-item.active .toc-link {
		color: var(--accent-success);
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
	.toc::-webkit-scrollbar {
		width: 4px;
	}
	.toc::-webkit-scrollbar-track {
		background: transparent;
	}
	.toc::-webkit-scrollbar-thumb {
		background: var(--light-text-secondary);
		border-radius: 2px;
	}
	:global(.dark) .toc::-webkit-scrollbar-thumb {
		background: var(--light-border-light);
	}
</style>
