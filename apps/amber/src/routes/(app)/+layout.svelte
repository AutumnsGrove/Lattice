<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/stores";
	import Icon from "$lib/components/Icons.svelte";
	import { Logo } from "@autumnsgrove/lattice/ui/components";
	import { theme, currentUser, searchQuery, sidebarOpen } from "$lib/stores";

	let { children }: { children: Snippet } = $props();

	function toggleTheme() {
		theme.update((t) => {
			const newTheme = t === "dark" ? "light" : "dark";
			if (typeof document !== "undefined") {
				document.documentElement.setAttribute("data-theme", newTheme);
			}
			return newTheme;
		});
	}

	function toggleSidebar() {
		sidebarOpen.update((open) => !open);
	}

	function closeSidebar() {
		sidebarOpen.set(false);
	}

	// Close sidebar on route change (mobile UX)
	let previousPath = $state($page.url.pathname);
	$effect(() => {
		if ($page.url.pathname !== previousPath) {
			previousPath = $page.url.pathname;
			closeSidebar();
		}
	});

	// Close sidebar on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && $sidebarOpen) {
			closeSidebar();
		}
	}

	const navItems = [
		{ href: "/", label: "Dashboard", icon: "dashboard" as const },
		{ href: "/files", label: "Files", icon: "folder" as const },
		{ href: "/trash", label: "Trash", icon: "trash" as const },
	];
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="app-layout">
	<!-- Mobile Sidebar Overlay -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sidebar-overlay" class:visible={$sidebarOpen} onclick={closeSidebar}></div>

	<!-- Sidebar -->
	<aside class="sidebar" class:open={$sidebarOpen}>
		<div class="sidebar-header">
			<a href="/" class="logo">
				<Logo class="w-6 h-6" color="var(--color-primary)" />
				<span class="logo-text">Amber</span>
			</a>
			<button class="sidebar-close-btn" onclick={closeSidebar} title="Close menu">
				<Icon name="x" size={20} />
			</button>
		</div>

		<button class="upload-btn">
			<Icon name="upload" size={18} />
			<span>Upload Files</span>
		</button>

		<nav class="nav-main">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={$page.url.pathname === item.href ||
						(item.href !== "/" && $page.url.pathname.startsWith(item.href))}
				>
					<Icon name={item.icon} size={18} />
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-divider"></div>

		<nav class="nav-secondary">
			<a href="/settings" class="nav-item" class:active={$page.url.pathname === "/settings"}>
				<Icon name="settings" size={18} />
				<span class="nav-label">Settings</span>
			</a>
		</nav>

		<div class="sidebar-footer">
			<div class="user-info">
				<div class="user-avatar">
					{$currentUser?.name?.charAt(0) ?? "U"}
				</div>
				<div class="user-details">
					<span class="user-name">{$currentUser?.name ?? "User"}</span>
					<span class="user-email">{$currentUser?.email ?? "user@grove.place"}</span>
				</div>
			</div>
		</div>
	</aside>

	<!-- Main Content Area -->
	<div class="main-area">
		<!-- Header -->
		<header class="header">
			<button class="menu-btn" onclick={toggleSidebar} title="Open menu">
				<Icon name="menu" size={22} />
			</button>

			<div class="search-container">
				<Icon name="search" size={18} class="search-icon" />
				<input
					type="text"
					placeholder="Search files..."
					class="search-input"
					bind:value={$searchQuery}
				/>
			</div>

			<div class="header-actions">
				<button class="icon-btn" onclick={toggleTheme} title="Toggle theme">
					{#if $theme === "dark"}
						<Icon name="sun" size={20} />
					{:else}
						<Icon name="moon" size={20} />
					{/if}
				</button>

				<button class="icon-btn user-btn" title="Account">
					<div class="header-avatar">
						{$currentUser?.name?.charAt(0) ?? "U"}
					</div>
				</button>
			</div>
		</header>

		<!-- Page Content -->
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		background: var(--color-bg-primary);
	}

	/* Sidebar Overlay (mobile only) */
	.sidebar-overlay {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 40;
		opacity: 0;
		transition: opacity var(--transition-base);
	}

	.sidebar-overlay.visible {
		opacity: 1;
	}

	/* Sidebar */
	.sidebar {
		width: var(--sidebar-width);
		background: var(--color-bg-secondary);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: var(--space-4) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sidebar-close-btn {
		display: none;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.sidebar-close-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-primary);
		font-weight: var(--font-semibold);
		font-size: var(--text-xl);
	}

	.upload-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		margin: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		transition: background var(--transition-fast);
	}

	.upload-btn:hover {
		background: var(--color-primary-hover);
	}

	.nav-main,
	.nav-secondary {
		padding: var(--space-2);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.nav-item:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.nav-item.active {
		background: var(--color-primary-muted);
		color: var(--color-primary);
	}

	.nav-label {
		flex: 1;
	}

	.sidebar-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: var(--space-2) var(--space-4);
	}

	.sidebar-footer {
		margin-top: auto;
		padding: var(--space-4);
		border-top: 1px solid var(--color-border-subtle);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		font-size: var(--text-sm);
	}

	.user-details {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.user-name {
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		color: var(--color-text-primary);
	}

	.user-email {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Main Area */
	.main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Header */
	.header {
		height: var(--header-height);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		padding: 0 var(--space-4);
		gap: var(--space-3);
	}

	/* Menu button (mobile only) */
	.menu-btn {
		display: none;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.menu-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.search-container {
		flex: 1;
		max-width: 600px;
		position: relative;
	}

	.search-container :global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-tertiary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--space-2) var(--space-3) var(--space-2) 40px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		transition: all var(--transition-fast);
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		background: var(--color-bg-secondary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.icon-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.icon-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.header-avatar {
		width: 32px;
		height: 32px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		font-size: var(--text-sm);
	}

	/* Content */
	.content {
		flex: 1;
		overflow: auto;
		background: var(--color-bg-primary);
	}

	/* ========================================
	   Mobile Responsive Styles
	   ======================================== */
	@media (max-width: 768px) {
		/* Show mobile overlay */
		.sidebar-overlay {
			display: block;
			pointer-events: none;
		}

		.sidebar-overlay.visible {
			pointer-events: auto;
		}

		/* Sidebar becomes fixed overlay on mobile */
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			height: 100vh;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform var(--transition-base);
			box-shadow: var(--shadow-xl);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		/* Show close button on mobile */
		.sidebar-close-btn {
			display: flex;
		}

		/* Show hamburger menu on mobile */
		.menu-btn {
			display: flex;
		}

		/* Adjust search container for mobile */
		.search-container {
			max-width: none;
		}

		/* Hide user avatar in header on mobile (it's in sidebar) */
		.user-btn {
			display: none;
		}
	}

	/* Small mobile adjustments */
	@media (max-width: 480px) {
		.header {
			padding: 0 var(--space-3);
		}

		.search-input {
			font-size: var(--text-sm);
		}
	}
</style>
