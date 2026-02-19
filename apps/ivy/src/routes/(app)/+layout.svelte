<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/stores";
	import { onMount } from "svelte";
	import Icon from "$lib/components/Icons.svelte";
	import GroveLogo from "$lib/components/GroveLogo.svelte";
	import {
		theme,
		isComposing,
		currentUser,
		searchQuery,
		isSidebarOpen,
		isSearchExpanded,
	} from "$lib/stores";

	let { children, data }: { children: Snippet; data: any } = $props();

	// Update currentUser store with data from server
	onMount(() => {
		if (data.user) {
			currentUser.set({
				id: data.user.id,
				email: data.user.email,
				name: data.user.name,
				avatar: data.user.image,
			});
		}
	});

	function toggleSidebar() {
		isSidebarOpen.update((v) => !v);
	}

	function closeSidebar() {
		isSidebarOpen.set(false);
	}

	function toggleSearch() {
		isSearchExpanded.update((v) => !v);
	}

	function toggleTheme() {
		theme.update((t) => {
			const newTheme = t === "dark" ? "light" : "dark";
			if (typeof document !== "undefined") {
				document.documentElement.setAttribute("data-theme", newTheme);
			}
			return newTheme;
		});
	}

	function openCompose() {
		isComposing.set(true);
	}

	async function logout() {
		try {
			await fetch("/auth/logout", { method: "POST" }); // csrf-ok
			// Page will be redirected by the server
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	const navItems = [
		{ href: "/inbox", label: "Inbox", icon: "inbox" as const, badge: 3 },
		{ href: "/sent", label: "Sent", icon: "send" as const },
		{ href: "/drafts", label: "Drafts", icon: "file" as const, badge: 1 },
		{ href: "/archive", label: "Archive", icon: "archive" as const },
		{ href: "/trash", label: "Trash", icon: "trash" as const },
	];
</script>

<div class="app-layout">
	<!-- Mobile Sidebar Backdrop -->
	{#if $isSidebarOpen}
		<button class="sidebar-backdrop" onclick={closeSidebar} aria-label="Close menu"></button>
	{/if}

	<!-- Sidebar -->
	<aside class="sidebar" class:open={$isSidebarOpen}>
		<div class="sidebar-header">
			<a href="/inbox" class="logo" onclick={closeSidebar}>
				<GroveLogo size={24} color="var(--color-primary)" />
				<span class="logo-text">Ivy</span>
			</a>
		</div>

		<button class="compose-btn" onclick={openCompose}>
			<Icon name="compose" size={18} />
			<span>Compose</span>
		</button>

		<nav class="nav-main">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={$page.url.pathname === item.href}
					onclick={closeSidebar}
				>
					<Icon name={item.icon} size={18} />
					<span class="nav-label">{item.label}</span>
					{#if item.badge}
						<span class="nav-badge">{item.badge}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="sidebar-divider"></div>

		<nav class="nav-secondary">
			<a
				href="/settings"
				class="nav-item"
				class:active={$page.url.pathname === "/settings"}
				onclick={closeSidebar}
			>
				<Icon name="settings" size={18} />
				<span class="nav-label">Settings</span>
			</a>
			<button class="nav-item" onclick={logout}>
				<Icon name="log-out" size={18} />
				<span class="nav-label">Log out</span>
			</button>
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
			<!-- Mobile menu button -->
			<button class="icon-btn menu-btn" onclick={toggleSidebar} title="Menu">
				<Icon name="menu" size={24} />
			</button>

			<!-- Desktop search bar -->
			<div class="search-container desktop-search">
				<div class="search-input-wrapper">
					<Icon name="search" size={18} class="search-icon" />
					<input
						type="text"
						placeholder="Search mail..."
						class="search-input"
						bind:value={$searchQuery}
					/>
				</div>
			</div>

			<div class="header-actions">
				<!-- Mobile search toggle -->
				<button class="icon-btn search-toggle" onclick={toggleSearch} title="Search">
					<Icon name="search" size={20} />
				</button>

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

		<!-- Mobile search dropdown -->
		{#if $isSearchExpanded}
			<div class="mobile-search-dropdown">
				<div class="search-input-wrapper">
					<Icon name="search" size={18} class="search-icon" />
					<input
						type="text"
						placeholder="Search mail..."
						class="search-input"
						bind:value={$searchQuery}
					/>
					<button class="icon-btn search-close" onclick={toggleSearch} title="Close search">
						<Icon name="x" size={18} />
					</button>
				</div>
			</div>
		{/if}

		<!-- Page Content -->
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<!-- Compose Modal -->
{#if $isComposing}
	<div class="modal-backdrop" onclick={() => isComposing.set(false)}>
		<div class="compose-modal" onclick={(e) => e.stopPropagation()}>
			<div class="compose-header">
				<h2>New Message</h2>
				<button class="icon-btn" onclick={() => isComposing.set(false)}>
					<Icon name="x" size={20} />
				</button>
			</div>

			<form class="compose-form">
				<div class="compose-field">
					<label for="to">To</label>
					<input type="email" id="to" placeholder="recipient@example.com" />
				</div>

				<div class="compose-field">
					<label for="subject">Subject</label>
					<input type="text" id="subject" placeholder="Subject" />
				</div>

				<div class="compose-body">
					<textarea placeholder="Write your message..."></textarea>
				</div>

				<div class="compose-actions">
					<div class="compose-toolbar">
						<button type="button" class="toolbar-btn" title="Bold">
							<Icon name="bold" size={16} />
						</button>
						<button type="button" class="toolbar-btn" title="Italic">
							<Icon name="italic" size={16} />
						</button>
						<button type="button" class="toolbar-btn" title="Link">
							<Icon name="link" size={16} />
						</button>
						<button type="button" class="toolbar-btn" title="Attach file">
							<Icon name="paperclip" size={16} />
						</button>
					</div>

					<div class="compose-submit">
						<button type="button" class="btn-secondary">Save Draft</button>
						<button type="submit" class="btn-primary">
							<Icon name="send" size={16} />
							<span>Send</span>
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		background: var(--color-bg-primary);
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
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-primary);
		font-weight: var(--font-semibold);
		font-size: var(--text-xl);
	}

	.compose-btn {
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

	.compose-btn:hover {
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

	.nav-badge {
		background: var(--color-badge);
		color: var(--color-text-inverse);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		padding: 2px 6px;
		border-radius: var(--radius-full);
		min-width: 20px;
		text-align: center;
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
		justify-content: space-between;
		padding: 0 var(--space-4);
		gap: var(--space-4);
	}

	.search-container {
		flex: 1;
		max-width: 600px;
		display: flex;
		align-items: center;
	}

	.search-input-wrapper :global(.search-icon) {
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

	/* Compose Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.compose-modal {
		width: 100%;
		max-width: 640px;
		max-height: 80vh;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.compose-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.compose-header h2 {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
	}

	.compose-form {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.compose-field {
		display: flex;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.compose-field label {
		width: 70px;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	.compose-field input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.compose-field input:focus {
		outline: none;
	}

	.compose-body {
		flex: 1;
		padding: var(--space-4);
		min-height: 200px;
	}

	.compose-body textarea {
		width: 100%;
		height: 100%;
		min-height: 200px;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		resize: none;
		line-height: var(--leading-relaxed);
	}

	.compose-body textarea:focus {
		outline: none;
	}

	.compose-body textarea::placeholder {
		color: var(--color-text-tertiary);
	}

	.compose-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
	}

	.compose-toolbar {
		display: flex;
		gap: var(--space-1);
	}

	.toolbar-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-tertiary);
		transition: all var(--transition-fast);
	}

	.toolbar-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.compose-submit {
		display: flex;
		gap: var(--space-2);
	}

	.btn-secondary {
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary);
		border-radius: var(--radius-md);
		color: var(--color-text-inverse);
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	/* Mobile Sidebar Backdrop */
	.sidebar-backdrop {
		display: none;
	}

	/* Menu button - hidden on desktop */
	.menu-btn {
		display: none;
	}

	/* Search wrapper for mobile expandable search */
	.search-input-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-toggle,
	.search-close {
		display: none;
	}

	/* ==========================================
	   RESPONSIVE STYLES - Tablet & Mobile
	   ========================================== */

	/* Tablet breakpoint (< 1024px) - Collapsible sidebar */
	@media (max-width: 1023px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			bottom: 0;
			z-index: 60;
			transform: translateX(-100%);
			transition: transform var(--transition-slow);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.sidebar-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 50;
			animation: fadeIn var(--transition-fast);
			border: none;
			cursor: default;
		}

		@keyframes fadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		.menu-btn {
			display: flex;
		}

		/* Larger touch targets for tablet/mobile */
		.nav-item {
			min-height: 44px;
			padding: var(--space-3) var(--space-3);
		}

		.icon-btn {
			min-width: 44px;
			min-height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.compose-btn {
			min-height: 48px;
		}
	}

	/* Mobile search dropdown - hidden by default */
	.mobile-search-dropdown {
		display: none;
	}

	/* Mobile breakpoint (< 768px) - Compact header */
	@media (max-width: 767px) {
		.header {
			padding: 0 var(--space-2);
			gap: var(--space-2);
		}

		/* Hide desktop search on mobile */
		.desktop-search {
			display: none;
		}

		/* Show search toggle on mobile */
		.search-toggle {
			display: flex;
		}

		/* Mobile search dropdown */
		.mobile-search-dropdown {
			display: flex;
			padding: var(--space-2) var(--space-3);
			background: var(--color-bg-secondary);
			border-bottom: 1px solid var(--color-border);
		}

		.mobile-search-dropdown .search-input-wrapper {
			flex: 1;
		}

		.mobile-search-dropdown .search-close {
			display: flex;
		}

		.mobile-search-dropdown .search-input {
			font-size: var(--text-base);
		}

		/* Compose modal fullscreen on mobile */
		.compose-modal {
			max-width: 100%;
			max-height: 100%;
			height: 100%;
			border-radius: 0;
		}

		.modal-backdrop {
			padding: 0;
		}

		.compose-body {
			min-height: 150px;
		}

		.compose-body textarea {
			min-height: 150px;
		}

		/* Stack compose actions on very small screens */
		.compose-actions {
			flex-wrap: wrap;
			gap: var(--space-2);
		}

		.compose-toolbar {
			order: 2;
			width: 100%;
			justify-content: center;
			border-top: 1px solid var(--color-border-subtle);
			padding-top: var(--space-2);
			margin-top: var(--space-1);
		}

		.compose-submit {
			order: 1;
			width: 100%;
			justify-content: stretch;
		}

		.compose-submit .btn-secondary,
		.compose-submit .btn-primary {
			flex: 1;
			justify-content: center;
		}
	}

	/* Small mobile (< 480px) - Extra compact */
	@media (max-width: 479px) {
		.sidebar {
			width: 100%;
			max-width: 300px;
		}

		.header-avatar {
			width: 28px;
			height: 28px;
			font-size: var(--text-xs);
		}

		.user-btn {
			min-width: 40px;
			min-height: 40px;
		}
	}
</style>
