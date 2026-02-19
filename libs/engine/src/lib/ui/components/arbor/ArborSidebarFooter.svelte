<!--
  ArborSidebarFooter — User info, footer links, and logout

  Renders differently in expanded (full labels) vs collapsed (icon-only) states.
  Supports custom snippet override via the `customFooter` prop.
  Internal component — not exported to consumers.
-->
<script lang="ts">
	import { LogOut, HelpCircle, MessageCircle } from "lucide-svelte";
	import type { Snippet } from "svelte";
	import type { ArborFooterLink } from "./types";

	interface Props {
		showExpanded: boolean;
		user?: { email?: string; name?: string | null; [key: string]: unknown } | null;
		footerLinks?: ArborFooterLink[];
		logoutHref?: string;
		onLogout?: () => void;
		customFooter?: Snippet;
	}

	let { showExpanded, user, footerLinks, logoutHref, onLogout, customFooter }: Props = $props();

	/** Map of known link labels to their default icons */
	const defaultIcons: Record<string, typeof HelpCircle> = {
		"Help Center": HelpCircle,
		"Get Support": MessageCircle,
	};

	function getIcon(link: ArborFooterLink) {
		return link.icon || defaultIcons[link.label] || HelpCircle;
	}

	function handleLogout(e: MouseEvent) {
		if (onLogout) {
			e.preventDefault();
			onLogout();
		}
	}
</script>

{#if customFooter}
	{@render customFooter()}
{:else if showExpanded}
	<div class="arbor-footer">
		{#if user}
			<div class="arbor-user-info">
				<span class="arbor-email">{user.email ?? "Guest (Demo Mode)"}</span>
			</div>
		{/if}
		{#if footerLinks}
			{#each footerLinks as link}
				{@const Icon = getIcon(link)}
				<a
					href={link.href}
					target={link.external ? "_blank" : undefined}
					rel={link.external ? "noopener noreferrer" : undefined}
					class="arbor-help-link"
				>
					<Icon class="arbor-help-icon" />
					<span>{link.label}</span>
				</a>
			{/each}
		{/if}
		<!-- Logout precedence: logoutHref (link) wins over onLogout (callback).
         When both are provided, we render a navigating <a>. The callback-only
         path uses a proper <button> for correct semantics. -->
		{#if logoutHref || onLogout}
			{#if user}
				{#if onLogout && !logoutHref}
					<button class="arbor-logout-btn" onclick={handleLogout}>
						<LogOut class="arbor-logout-icon" />
						<span>Logout</span>
					</button>
				{:else}
					<a href={logoutHref ?? "/auth/logout"} class="arbor-logout-btn">
						<LogOut class="arbor-logout-icon" />
						<span>Logout</span>
					</a>
				{/if}
			{:else}
				<a href={logoutHref ?? "/auth/login"} class="arbor-logout-btn">
					<LogOut class="arbor-logout-icon" />
					<span>Sign In</span>
				</a>
			{/if}
		{/if}
	</div>
{:else}
	<div class="arbor-footer-collapsed">
		{#if footerLinks}
			{#each footerLinks as link}
				{@const Icon = getIcon(link)}
				<a
					href={link.href}
					target={link.external ? "_blank" : undefined}
					rel={link.external ? "noopener noreferrer" : undefined}
					class="arbor-help-link-icon"
					title={link.label}
					aria-label={link.label}
				>
					<Icon class="arbor-help-icon" />
				</a>
			{/each}
		{/if}
		{#if logoutHref || onLogout}
			{#if user}
				{#if onLogout && !logoutHref}
					<button
						class="arbor-logout-btn-icon"
						title="Logout"
						aria-label="Logout"
						onclick={handleLogout}
					>
						<LogOut class="arbor-logout-icon" />
					</button>
				{:else}
					<a
						href={logoutHref ?? "/auth/logout"}
						class="arbor-logout-btn-icon"
						title="Logout"
						aria-label="Logout"
					>
						<LogOut class="arbor-logout-icon" />
					</a>
				{/if}
			{:else}
				<a
					href={logoutHref ?? "/auth/login"}
					class="arbor-logout-btn-icon"
					title="Sign In"
					aria-label="Sign In"
				>
					<LogOut class="arbor-logout-icon" />
				</a>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.arbor-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--grove-border-subtle);
		transition: border-color 0.3s ease;
		flex-shrink: 0;
	}

	.arbor-footer-collapsed {
		padding: 0.75rem;
		border-top: 1px solid var(--grove-border-subtle);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	:global(.dark) .arbor-footer-collapsed {
		border-color: var(--grove-border-subtle);
	}

	.arbor-user-info {
		margin-bottom: 0.75rem;
	}

	.arbor-email {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		word-break: break-all;
		transition: color 0.3s ease;
	}

	:global(.dark) .arbor-email {
		color: var(--grove-text-muted);
	}

	/* Expanded links */
	.arbor-help-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--grove-overlay-12);
		color: var(--color-text-muted);
		text-decoration: none;
		border-radius: var(--border-radius-button);
		font-size: 0.85rem;
		transition:
			background 0.2s,
			color 0.2s;
		margin-bottom: 0.5rem;
	}

	:global(.dark) .arbor-help-link {
		background: var(--grove-overlay-10);
		color: var(--grove-text-strong);
	}

	.arbor-help-link:hover {
		background: var(--grove-overlay-20);
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-help-link:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #16a34a));
		outline-offset: 2px;
	}

	:global(.dark) .arbor-help-link:hover {
		background: var(--grove-overlay-18);
		color: var(--grove-300, #86efac);
	}

	/* Collapsed icon-only links */
	.arbor-help-link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: var(--grove-overlay-12);
		color: var(--color-text-muted);
		text-decoration: none;
		border-radius: var(--border-radius-button);
		transition:
			background 0.2s,
			color 0.2s;
		margin-bottom: 0.5rem;
	}

	:global(.dark) .arbor-help-link-icon {
		background: var(--grove-overlay-10);
		color: var(--grove-text-strong);
	}

	.arbor-help-link-icon:hover {
		background: var(--grove-overlay-20);
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-help-link-icon:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #16a34a));
		outline-offset: 2px;
	}

	:global(.dark) .arbor-help-link-icon:hover {
		background: var(--grove-overlay-18);
		color: var(--grove-300, #86efac);
	}

	:global(.arbor-help-icon) {
		width: 1rem;
		height: 1rem;
	}

	/* Logout buttons */
	.arbor-logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--grove-overlay-12);
		color: var(--color-text-muted);
		text-decoration: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		width: 100%;
		border-radius: var(--border-radius-button);
		font-size: 0.85rem;
		transition:
			background 0.2s,
			color 0.2s;
	}

	:global(.dark) .arbor-logout-btn {
		background: var(--grove-overlay-10);
		color: var(--grove-text-strong);
	}

	.arbor-logout-btn:hover {
		background: var(--grove-overlay-20);
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-logout-btn:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #16a34a));
		outline-offset: 2px;
	}

	:global(.dark) .arbor-logout-btn:hover {
		background: var(--grove-overlay-18);
		color: var(--grove-300, #86efac);
	}

	.arbor-logout-btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: var(--grove-overlay-12);
		color: var(--color-text-muted);
		text-decoration: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		border-radius: var(--border-radius-button);
		transition:
			background 0.2s,
			color 0.2s;
	}

	:global(.dark) .arbor-logout-btn-icon {
		background: var(--grove-overlay-10);
		color: var(--grove-text-strong);
	}

	.arbor-logout-btn-icon:hover {
		background: var(--grove-overlay-20);
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-logout-btn-icon:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #16a34a));
		outline-offset: 2px;
	}

	:global(.dark) .arbor-logout-btn-icon:hover {
		background: var(--grove-overlay-18);
		color: var(--grove-300, #86efac);
	}

	:global(.arbor-logout-icon) {
		width: 1rem;
		height: 1rem;
	}
</style>
