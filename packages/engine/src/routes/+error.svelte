<script>
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} - The Grove</title>
</svelte:head>

<div class="error-page">
	<h1>{page.status}</h1>
	<p class="message">{page.error?.message || 'Page not found'}</p>
	<p class="description">The page you're looking for doesn't exist or has been moved.</p>
	<a href="/" class="home-link">Go back home</a>
</div>

<style>
	.error-page {
		text-align: center;
		padding: 4rem 2rem;
		max-width: 600px;
		margin: 0 auto;
	}
	h1 {
		font-size: 6rem;
		margin: 0 0 1rem 0;
		color: #2c5f2d;
		line-height: 1;
		transition: color 0.3s ease;
	}
	:global(.dark) h1 {
		color: var(--accent-success);
	}
	.message {
		font-size: 1.5rem;
		color: var(--light-border-secondary);
		margin: 0 0 1rem 0;
		font-weight: 600;
		transition: color 0.3s ease;
	}
	.description {
		font-size: 1.1rem;
		color: #666;
		margin: 0 0 2rem 0;
		transition: color 0.3s ease;
	}
	.home-link {
		display: inline-block;
		padding: 0.75rem 2rem;
		background: #2c5f2d;
		color: white;
		text-decoration: none;
		border-radius: 20px;
		font-weight: 600;
		transition: background 0.2s, transform 0.2s;
	}
	:global(.dark) .home-link {
		background: var(--accent-success);
		color: var(--light-bg-primary);
	}
	.home-link:hover {
		background: #4a9d4f;
		transform: translateY(-2px) scale(1.05);
		filter: brightness(1.1);
		box-shadow: 0 4px 12px rgba(44, 95, 45, 0.3);
	}
	:global(.dark) .home-link:hover {
		background: var(--accent-success-light);
		box-shadow: 0 4px 12px rgba(92, 184, 95, 0.4);
	}
	@media (max-width: 768px) {
		h1 {
			font-size: 4rem;
		}
		.message {
			font-size: 1.25rem;
		}
		.error-page {
			padding: 2rem 1rem;
		}
	}
</style>
