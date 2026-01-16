<svelte:head>
	<title>Blog Posts - Admin - The Midnight Bloom</title>
</svelte:head>

<div class="admin-blog">
	<header class="page-header">
		<h1>Blog Posts</h1>
		<a href="/admin/blog/new" class="btn-primary">+ New Post</a>
	</header>

	<div class="posts-table">
		<table>
			<thead>
				<tr>
					<th>Title</th>
					<th>Date</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Why We Don't Play Music</td>
					<td>Dec 1, 2025</td>
					<td><span class="status published">Published</span></td>
					<td>
						<a href="/admin/blog/edit/why-we-dont-play-music" class="btn-small">Edit</a>
						<button class="btn-small danger" disabled>Delete</button>
					</td>
				</tr>
				<tr>
					<td>Our Favorite Midnight Regulars</td>
					<td>Nov 28, 2025</td>
					<td><span class="status published">Published</span></td>
					<td>
						<a href="/admin/blog/edit/our-favorite-midnight-regulars" class="btn-small">Edit</a>
						<button class="btn-small danger" disabled>Delete</button>
					</td>
				</tr>
				<tr>
					<td>The Art of Brewing Patience</td>
					<td>Nov 15, 2025</td>
					<td><span class="status published">Published</span></td>
					<td>
						<a href="/admin/blog/edit/the-art-of-brewing-patience" class="btn-small">Edit</a>
						<button class="btn-small danger" disabled>Delete</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<p class="demo-notice">This is a demo admin panel. Click "Edit" to modify existing posts or "New Post" to create one from scratch.</p>
</div>

<style>
	.admin-blog {
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
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.posts-table {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 2rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid hsl(var(--border));
	}

	th {
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		font-weight: 600;
		font-family: system-ui, sans-serif;
	}

	td {
		color: hsl(var(--foreground));
	}

	tr:last-child td {
		border-bottom: none;
	}

	.status {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.status.published {
		background: hsl(120 40% 90%);
		color: hsl(120 40% 30%);
	}

	.btn-small {
		background: hsl(var(--muted));
		border: none;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.85rem;
		margin-right: 0.5rem;
		color: hsl(var(--foreground));
		text-decoration: none;
		display: inline-block;
	}

	a.btn-small {
		cursor: pointer;
		opacity: 1;
	}

	a.btn-small:hover {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	button.btn-small {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.btn-small.danger {
		background: hsl(0 40% 90%);
		color: hsl(0 40% 30%);
	}

	.demo-notice {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		text-align: center;
	}
</style>
