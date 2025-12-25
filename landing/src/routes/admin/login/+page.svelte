<script lang="ts">
	function signInWithGrove() {
		// Redirect to GroveAuth OAuth flow with return URL
		window.location.href = `/auth/login?return_to=${encodeURIComponent('/admin')}`;
	}
</script>

<svelte:head>
	<title>Admin Login - Grove</title>
</svelte:head>

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-cream">
	<!-- Logo -->
	<div class="mb-8">
		<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors">
			<svg class="w-16 h-16" viewBox="0 0 100 100" fill="none">
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
	</div>

	<h1 class="text-2xl font-serif text-bark mb-2">Admin Login</h1>
	<p class="text-bark/60 font-sans mb-8 text-center max-w-sm">
		Sign in with your Grove account to access the admin panel
	</p>

	<!-- GroveAuth Button -->
	<div class="w-full max-w-sm">
		<button
			onclick={signInWithGrove}
			class="w-full bg-white border-2 border-grove-200 hover:border-grove-400 hover:bg-grove-50 transition-all rounded-xl px-6 py-4 flex items-center justify-center gap-3 group"
		>
			<svg class="w-6 h-6 text-grove-600" viewBox="0 0 100 100" fill="none">
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
			<span class="text-lg font-sans text-bark font-medium">Sign in with Grove</span>
		</button>

		<p class="text-xs text-bark/40 font-sans text-center mt-4">
			Uses Google OAuth via GroveAuth
		</p>
	</div>

	<!-- Back link -->
	<a
		href="/"
		class="mt-8 text-sm text-bark/50 hover:text-grove-600 font-sans transition-colors"
	>
		Back to Grove
	</a>
</main>
