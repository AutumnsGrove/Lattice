<script lang="ts">
	import type { PageData } from './$types';
	import { getUserDisplayName } from '@autumnsgrove/groveengine/utils';
	import { GlassConfirmDialog } from '@autumnsgrove/groveengine/ui';

	let { data }: { data: PageData } = $props();

	// Get display name for greeting (see docs/grove-user-identity.md)
	const userName = $derived(getUserDisplayName(data.user));

	// Dialog state
	let showSignOutDialog = $state(false);

	function handleSignOutClick() {
		showSignOutDialog = true;
	}

	async function handleSignOutConfirm() {
		await fetch('/api/auth/signout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Grove</title>
</svelte:head>

<div class="min-h-screen bg-cream">
	<!-- Header -->
	<header class="bg-white border-b border-grove-200 px-6 py-4">
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors" aria-label="Go to home">
					<svg class="w-8 h-8" viewBox="0 0 100 100" fill="none">
						<path
							d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
							fill="currentColor"
							fill-opacity="0.3"
						/>
						<path
							d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
							fill="currentColor"
						/>
						<path d="M50 70V85" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
					</svg>
				</a>
				<div>
					<h1 class="text-xl font-serif text-bark">Admin Dashboard</h1>
					<p class="text-sm text-bark/50 font-sans">Welcome back, {userName}.</p>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		<!-- Quick Links -->
		<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Feedback Card -->
			<a
				href="/admin/feedback"
				class="bg-white border border-grove-200 rounded-xl p-6 hover:border-grove-300 transition-colors group"
			>
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-grove-100 rounded-lg flex items-center justify-center text-grove-600 group-hover:bg-grove-200 transition-colors">
						<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-bark mb-1">Wanderer Feedback</h2>
						<p class="text-sm text-bark/60 font-sans">
							View and respond to feedback from the community.
						</p>
					</div>
				</div>
			</a>

			<!-- Subscribers Card -->
			<a
				href="/admin/subscribers"
				class="bg-white border border-grove-200 rounded-xl p-6 hover:border-grove-300 transition-colors group"
			>
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-grove-100 rounded-lg flex items-center justify-center text-grove-600 group-hover:bg-grove-200 transition-colors">
						<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-bark mb-1">Email Subscribers</h2>
						<p class="text-sm text-bark/60 font-sans">
							View and manage email signups. Copy all subscriber emails for mass communication.
						</p>
					</div>
				</div>
			</a>

			<!-- CDN Card -->
			<a
				href="/admin/cdn"
				class="bg-white border border-grove-200 rounded-xl p-6 hover:border-grove-300 transition-colors group"
			>
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-grove-100 rounded-lg flex items-center justify-center text-grove-600 group-hover:bg-grove-200 transition-colors">
						<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-bark mb-1">CDN Manager</h2>
						<p class="text-sm text-bark/60 font-sans">
							Upload and manage CDN assets including images, fonts, and other files.
						</p>
					</div>
				</div>
			</a>

			<!-- Porch Card -->
			<a
				href="/admin/porch"
				class="bg-white border border-grove-200 rounded-xl p-6 hover:border-grove-300 transition-colors group"
			>
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-grove-100 rounded-lg flex items-center justify-center text-grove-600 group-hover:bg-grove-200 transition-colors">
						<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-bark mb-1">The Porch</h2>
						<p class="text-sm text-bark/60 font-sans">
							View and respond to support conversations from Wanderers.
						</p>
					</div>
				</div>
			</a>

			<!-- Greenhouse Card -->
			<a
				href="/admin/greenhouse"
				class="bg-white border border-grove-200 rounded-xl p-6 hover:border-grove-300 transition-colors group"
			>
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors">
						<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-bark mb-1">Greenhouse</h2>
						<p class="text-sm text-bark/60 font-sans">
							Manage early access to experimental features for trusted tenants.
						</p>
					</div>
				</div>
			</a>
		</section>

		<!-- Quick Stats (optional, can expand later) -->
		<section class="mt-8">
			<h2 class="text-lg font-serif text-bark mb-4">Quick Actions</h2>
			<div class="bg-white border border-grove-200 rounded-xl p-6">
				<div class="flex flex-col gap-3">
					<a href="/" class="text-grove-600 hover:text-grove-700 font-sans text-sm transition-colors">
						← Back to Grove
					</a>
					<button
						onclick={handleSignOutClick}
						class="text-left text-bark/60 hover:text-red-600 font-sans text-sm transition-colors"
					>
						Sign Out
					</button>
				</div>
			</div>
		</section>
	</main>
</div>

<GlassConfirmDialog
	bind:open={showSignOutDialog}
	title="Sign Out"
	message="Are you sure you want to sign out of the admin dashboard?"
	confirmLabel="Sign Out"
	variant="default"
	onconfirm={handleSignOutConfirm}
/>
