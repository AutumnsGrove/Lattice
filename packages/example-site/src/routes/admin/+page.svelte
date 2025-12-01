<script>
	// Demo stats
	const stats = {
		posts: 3,
		pages: 3,
		recipes: 1,
		products: 6
	};
</script>

<svelte:head>
	<title>Admin Dashboard - The Midnight Bloom</title>
</svelte:head>

<div class="dashboard">
	<header class="page-header">
		<h1>Dashboard</h1>
		<p class="demo-notice">This is a demonstration admin panel. Changes are not saved.</p>
	</header>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
			</div>
			<div class="stat-info">
				<span class="stat-number">{stats.posts}</span>
				<span class="stat-label">Blog Posts</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
			</div>
			<div class="stat-info">
				<span class="stat-number">{stats.pages}</span>
				<span class="stat-label">Pages</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path></svg>
			</div>
			<div class="stat-info">
				<span class="stat-number">{stats.recipes}</span>
				<span class="stat-label">Recipes</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
			</div>
			<div class="stat-info">
				<span class="stat-number">{stats.products}</span>
				<span class="stat-label">Products</span>
			</div>
		</div>
	</div>

	<section class="quick-actions">
		<h2>Quick Actions</h2>
		<div class="actions-grid">
			<a href="/admin/blog" class="action-btn">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
				New Blog Post
			</a>
			<a href="/admin/pages" class="action-btn">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
				New Page
			</a>
			<a href="/admin/images" class="action-btn">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
				Upload Media
			</a>
			<a href="/admin/settings" class="action-btn">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
				Site Settings
			</a>
		</div>
	</section>

	<section class="recent-activity">
		<h2>Recent Posts</h2>
		<div class="activity-list">
			<div class="activity-item">
				<span class="activity-title">Why We Don't Play Music</span>
				<span class="activity-date">Dec 1, 2025</span>
			</div>
			<div class="activity-item">
				<span class="activity-title">Our Favorite Midnight Regulars</span>
				<span class="activity-date">Nov 28, 2025</span>
			</div>
			<div class="activity-item">
				<span class="activity-title">The Art of Brewing Patience</span>
				<span class="activity-date">Nov 15, 2025</span>
			</div>
		</div>
	</section>
</div>

<style>
	.dashboard {
		max-width: 1000px;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.demo-notice {
		color: hsl(var(--accent));
		font-size: 0.9rem;
		margin: 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		padding: 0.75rem;
		border-radius: 8px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-number {
		font-size: 1.75rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.stat-label {
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
	}

	.quick-actions {
		margin-bottom: 3rem;
	}

	.quick-actions h2 {
		font-size: 1.25rem;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
		color: hsl(var(--foreground));
		text-decoration: none;
		font-family: system-ui, sans-serif;
		transition: border-color 0.2s;
	}

	.action-btn:hover {
		border-color: hsl(var(--primary));
	}

	.recent-activity h2 {
		font-size: 1.25rem;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.activity-list {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
	}

	.activity-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.activity-item:last-child {
		border-bottom: none;
	}

	.activity-title {
		color: hsl(var(--foreground));
	}

	.activity-date {
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}
</style>
