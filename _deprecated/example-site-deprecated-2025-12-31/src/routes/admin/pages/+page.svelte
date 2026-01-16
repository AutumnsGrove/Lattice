<svelte:head>
	<title>Pages - Admin - The Midnight Bloom</title>
</svelte:head>

<div class="admin-pages">
	<header class="page-header">
		<h1>Pages</h1>
		<button class="btn-primary" disabled>+ New Page</button>
	</header>

	<div class="pages-grid">
		<div class="page-card">
			<h3>Home</h3>
			<p>Main landing page with hero section</p>
			<button class="btn-edit" disabled>Edit</button>
		</div>
		<div class="page-card">
			<h3>About</h3>
			<p>Our story and philosophy</p>
			<button class="btn-edit" disabled>Edit</button>
		</div>
		<div class="page-card">
			<h3>Contact</h3>
			<p>Location, hours, and contact info</p>
			<button class="btn-edit" disabled>Edit</button>
		</div>
	</div>

	<p class="demo-notice">This is a demonstration. In a real admin panel, you would be able to create and edit pages.</p>
</div>

<style>
	.admin-pages {
		max-width: 1000px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		color: hsl(var(--foreground));
		margin: 0;
		font-family: system-ui, sans-serif;
	}

	.btn-primary {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-family: system-ui, sans-serif;
		cursor: not-allowed;
		opacity: 0.7;
	}

	.pages-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.page-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
	}

	.page-card h3 {
		margin: 0 0 0.5rem 0;
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.page-card p {
		color: hsl(var(--muted-foreground));
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.btn-edit {
		background: hsl(var(--muted));
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-family: system-ui, sans-serif;
		cursor: not-allowed;
		opacity: 0.7;
		color: hsl(var(--foreground));
	}

	.demo-notice {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		text-align: center;
	}
</style>
