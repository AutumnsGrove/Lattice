<script>
	import { page } from '$app/stores';

	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'home' },
		{ href: '/admin/blog', label: 'Blog Posts', icon: 'file-text' },
		{ href: '/admin/pages', label: 'Pages', icon: 'layout' },
		{ href: '/admin/images', label: 'Media', icon: 'image' },
		{ href: '/admin/settings', label: 'Settings', icon: 'settings' }
	];
</script>

<svelte:head>
	<style>
		/* Prevent horizontal overflow and zoom issues on mobile admin */
		html, body {
			overflow-x: hidden;
			max-width: 100vw;
		}
		/* Prevent iOS zoom on input focus */
		@media screen and (max-width: 768px) {
			input, textarea, select {
				font-size: 16px !important;
			}
		}
	</style>
</svelte:head>

<div class="admin-layout">
	<aside class="admin-sidebar">
		<div class="sidebar-header">
			<h2>Admin Panel</h2>
			<span class="demo-badge">Demo</span>
		</div>
		<nav class="sidebar-nav">
			{#each navItems as item}
				<a href={item.href} class:active={$page.url.pathname === item.href}>
					{#if item.icon === 'home'}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
					{:else if item.icon === 'file-text'}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
					{:else if item.icon === 'layout'}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
					{:else if item.icon === 'image'}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
					{:else if item.icon === 'settings'}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
					{/if}
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="sidebar-footer">
			<a href="/">← Back to Site</a>
		</div>
	</aside>

	<main class="admin-main">
		{@render children()}
	</main>
</div>

<style>
	.admin-layout {
		display: grid;
		grid-template-columns: 250px 1fr;
		min-height: 100vh;
		max-width: 100vw;
		overflow-x: hidden;
		touch-action: manipulation;
	}

	.admin-sidebar {
		background: hsl(var(--card));
		border-right: 1px solid hsl(var(--border));
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.sidebar-header {
		padding: 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.demo-badge {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.sidebar-nav {
		flex: 1;
		padding: 1rem 0;
	}

	.sidebar-nav a {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: background 0.2s, color 0.2s;
		font-family: system-ui, sans-serif;
	}

	.sidebar-nav a:hover {
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
	}

	.sidebar-nav a.active {
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		border-right: 3px solid hsl(var(--primary));
	}

	.sidebar-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid hsl(var(--border));
	}

	.sidebar-footer a {
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		font-size: 0.9rem;
	}

	.sidebar-footer a:hover {
		color: hsl(var(--primary));
	}

	.admin-main {
		padding: 2rem;
		background: hsl(var(--background));
		overflow-y: auto;
		overflow-x: hidden;
		min-width: 0;
		max-width: 100%;
	}

	@media (max-width: 768px) {
		.admin-layout {
			grid-template-columns: 1fr;
		}

		.admin-sidebar {
			position: relative;
			height: auto;
		}

		.sidebar-nav {
			display: flex;
			overflow-x: auto;
			padding: 0;
			-webkit-overflow-scrolling: touch;
		}

		.sidebar-nav a {
			padding: 1rem;
			white-space: nowrap;
			border-right: none;
		}

		.sidebar-nav a.active {
			border-right: none;
			border-bottom: 3px solid hsl(var(--primary));
		}

		.admin-main {
			padding: 1rem;
		}
	}

	/* Prevent iOS zoom on input focus - inputs must be 16px+ */
	@media (max-width: 768px) {
		:global(.admin-layout input),
		:global(.admin-layout textarea),
		:global(.admin-layout select) {
			font-size: 16px !important;
		}
	}
</style>
