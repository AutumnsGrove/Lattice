<script lang="ts">
	import { LogIn, LogOut, User, ChevronDown } from '../icons/lucide';
	import type { AccountStatusProps, HeaderUser } from './types';

	let {
		user = null,
		loading = false,
		signInHref = 'https://heartwood.grove.place',
		signInLabel = 'Sign in',
		userHref = '/arbor',
		signOutHref = '/logout',
		signOutLabel = 'Sign out',
		compact = false,
		dropdown = true,
		menuItems
	}: AccountStatusProps = $props();

	let dropdownOpen = $state(false);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('[data-account-status]')) {
			closeDropdown();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDropdown();
		}
	}

	$effect(() => {
		if (dropdownOpen) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<!-- Loading state: skeleton pulse -->
{#if loading}
	<div
		class="w-8 h-8 rounded-full bg-foreground-subtle/20 animate-pulse"
		aria-label="Loading account status"
		role="status"
	></div>

<!-- Unauthenticated: sign-in link -->
{:else if !user}
	<a
		href={signInHref}
		class="flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-accent-muted transition-colors"
	>
		<LogIn class="w-4 h-4" />
		<span>{signInLabel}</span>
	</a>

<!-- Authenticated: avatar with optional dropdown -->
{:else}
	<div class="relative" data-account-status>
		{#if dropdown}
			<!-- Dropdown trigger button -->
			<button
				onclick={toggleDropdown}
				class="flex items-center gap-2 text-foreground-subtle hover:text-accent-muted transition-colors rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-surface-hover"
				aria-expanded={dropdownOpen}
				aria-haspopup="true"
			>
				{#if user.avatarUrl}
					<img
						src={user.avatarUrl}
						alt=""
						class="w-7 h-7 rounded-full object-cover ring-1 ring-white/40"
						loading="lazy"
						decoding="async"
					/>
				{:else}
					<div class="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
						<User class="w-4 h-4 text-accent-muted" />
					</div>
				{/if}
				{#if !compact}
					<span class="text-sm hidden lg:inline max-w-[120px] truncate">{user.name || 'Your Grove'}</span>
				{/if}
				<ChevronDown class="w-3.5 h-3.5 transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
			</button>

			<!-- Dropdown menu -->
			{#if dropdownOpen}
				<div
					class="absolute right-0 top-full mt-2 w-64 rounded-xl
						bg-white/80 dark:bg-cream-100/65 backdrop-blur-md
						border border-white/40 dark:border-cream-100/20
						shadow-lg z-50 overflow-hidden"
					role="menu"
				>
					<!-- User info section -->
					<div class="px-4 py-3 border-b border-black/5 dark:border-white/10">
						<div class="flex items-center gap-3">
							{#if user.avatarUrl}
								<img
									src={user.avatarUrl}
									alt=""
									class="w-10 h-10 rounded-full object-cover ring-1 ring-white/40"
									loading="lazy"
									decoding="async"
								/>
							{:else}
								<div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
									<User class="w-5 h-5 text-accent-muted" />
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-foreground truncate">
									{user.name || 'Your Grove'}
								</p>
								{#if user.email}
									<p class="text-xs text-foreground-subtle truncate">{user.email}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Dashboard link -->
					<a
						href={userHref}
						class="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground-subtle hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
						role="menuitem"
						onclick={closeDropdown}
					>
						<User class="w-4 h-4" />
						<span>Your Grove</span>
					</a>

					<!-- Custom menu items slot -->
					{#if menuItems}
						{@render menuItems()}
					{/if}

					<!-- Divider + sign out -->
					<div class="border-t border-black/5 dark:border-white/10">
						<a
							href={signOutHref}
							class="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground-subtle hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
							role="menuitem"
							onclick={closeDropdown}
						>
							<LogOut class="w-4 h-4" />
							<span>{signOutLabel}</span>
						</a>
					</div>
				</div>
			{/if}

		{:else}
			<!-- No dropdown: avatar links directly -->
			<a
				href={userHref}
				class="flex items-center gap-2 text-foreground-subtle hover:text-accent-muted transition-colors"
				title="Go to your Grove"
			>
				{#if user.avatarUrl}
					<img
						src={user.avatarUrl}
						alt=""
						class="w-7 h-7 rounded-full object-cover ring-1 ring-white/40"
						loading="lazy"
						decoding="async"
					/>
				{:else}
					<div class="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
						<User class="w-4 h-4 text-accent-muted" />
					</div>
				{/if}
				{#if !compact}
					<span class="text-sm hidden lg:inline">{user.name || 'Your Grove'}</span>
				{/if}
			</a>
		{/if}
	</div>
{/if}
