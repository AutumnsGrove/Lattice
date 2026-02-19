<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
	import { theme, currentUser } from "$lib/stores";
	import { signOut } from "$lib/auth";

	function toggleTheme() {
		theme.update((t) => {
			const newTheme = t === "dark" ? "light" : "dark";
			if (typeof document !== "undefined") {
				document.documentElement.setAttribute("data-theme", newTheme);
			}
			return newTheme;
		});
	}

	function handleSignOut() {
		if (confirm("Are you sure you want to sign out?")) {
			signOut();
		}
	}
</script>

<svelte:head>
	<title>Settings - Amber</title>
</svelte:head>

<div class="settings-page">
	<div class="page-header">
		<h1>Settings</h1>
	</div>

	<!-- Account Section -->
	<section class="settings-section">
		<h2 class="section-title">ACCOUNT</h2>
		<div class="settings-card">
			<div class="setting-row">
				<div class="user-profile">
					<div class="user-avatar">
						{$currentUser?.name?.charAt(0) ?? "U"}
					</div>
					<div class="user-details">
						<span class="user-name">{$currentUser?.name ?? "Grove User"}</span>
						<span class="user-email">{$currentUser?.email ?? "user@grove.place"}</span>
					</div>
				</div>
				<button class="btn btn-secondary">Edit Profile</button>
			</div>
		</div>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<Icon name="log-out" size={20} />
					<div>
						<span class="setting-label">Sign Out</span>
						<span class="setting-description">Sign out of your account</span>
					</div>
				</div>
				<button class="btn btn-secondary" onclick={handleSignOut}>Sign Out</button>
			</div>
		</div>
	</section>

	<!-- Appearance Section -->
	<section class="settings-section">
		<h2 class="section-title">APPEARANCE</h2>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<Icon name="moon" size={20} />
					<div>
						<span class="setting-label">Theme</span>
						<span class="setting-description">Switch between dark and light mode</span>
					</div>
				</div>
				<div class="theme-toggle">
					<button
						class="theme-btn"
						class:active={$theme === "light"}
						onclick={() => {
							if ($theme !== "light") toggleTheme();
						}}
					>
						Light
					</button>
					<button
						class="theme-btn"
						class:active={$theme === "dark"}
						onclick={() => {
							if ($theme !== "dark") toggleTheme();
						}}
					>
						Dark
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- Storage Section -->
	<section class="settings-section">
		<h2 class="section-title">STORAGE</h2>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<Icon name="storage" size={20} />
					<div>
						<span class="setting-label">Storage Plan</span>
						<span class="setting-description">Manage your storage subscription</span>
					</div>
				</div>
				<button class="btn btn-primary">Upgrade</button>
			</div>
		</div>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<Icon name="export" size={20} />
					<div>
						<span class="setting-label">Export Data</span>
						<span class="setting-description">Download all your files as a ZIP archive</span>
					</div>
				</div>
				<button class="btn btn-secondary">Export</button>
			</div>
		</div>
	</section>

	<!-- Danger Zone -->
	<section class="settings-section">
		<h2 class="section-title danger">DANGER ZONE</h2>
		<div class="settings-card danger">
			<div class="setting-row">
				<div class="setting-info">
					<Icon name="trash" size={20} />
					<div>
						<span class="setting-label">Delete All Files</span>
						<span class="setting-description">Permanently delete all your stored files</span>
					</div>
				</div>
				<button class="btn btn-danger">Delete All</button>
			</div>
		</div>
	</section>
</div>

<style>
	.settings-page {
		padding: var(--space-6);
		max-width: 800px;
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.page-header h1 {
		font-size: var(--text-2xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	/* Sections */
	.settings-section {
		margin-bottom: var(--space-6);
	}

	.section-title {
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: var(--color-text-tertiary);
		letter-spacing: 0.05em;
		margin-bottom: var(--space-3);
	}

	.section-title.danger {
		color: var(--color-error);
	}

	/* Cards */
	.settings-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		margin-bottom: var(--space-2);
	}

	.settings-card.danger {
		border-color: var(--color-error);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		gap: var(--space-4);
	}

	.setting-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-secondary);
	}

	.setting-info > div {
		display: flex;
		flex-direction: column;
	}

	.setting-label {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.setting-description {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	/* User Profile */
	.user-profile {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.user-avatar {
		width: 44px;
		height: 44px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		font-size: var(--text-lg);
	}

	.user-details {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.user-email {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	/* Theme Toggle */
	.theme-toggle {
		display: flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-lg);
		padding: var(--space-1);
	}

	.theme-btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.theme-btn:hover {
		color: var(--color-text-primary);
	}

	.theme-btn.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}

	/* Buttons */
	.btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.btn-danger {
		background: transparent;
		color: var(--color-error);
		border: 1px solid var(--color-error);
	}

	.btn-danger:hover {
		background: var(--color-error-muted);
	}
</style>
