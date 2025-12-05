<script lang="ts">
	let email = $state('');
	let code = $state('');
	let step = $state<'email' | 'code'>('email');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function requestCode() {
		if (!email) return;

		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/request-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const result = (await response.json()) as { success?: boolean; error?: string };

			if (response.ok && result.success) {
				step = 'code';
				successMessage = 'Check your email for the login code';
			} else {
				throw new Error(result.error || 'Failed to send code');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send code';
		} finally {
			isLoading = false;
		}
	}

	async function verifyCode() {
		if (!code) return;

		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/verify-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code })
			});

			const result = (await response.json()) as { success?: boolean; error?: string };

			if (response.ok && result.success) {
				window.location.href = '/admin/cdn';
			} else {
				throw new Error(result.error || 'Invalid code');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Invalid code';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login - Grove</title>
</svelte:head>

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Logo -->
	<div class="mb-8">
		<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors">
			<svg class="w-16 h-16" viewBox="0 0 100 100" fill="none">
				<path
					d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
					fill="currentColor"
					fill-opacity="0.15"
				/>
				<path
					d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
					fill="currentColor"
				/>
				<path d="M50 70V95" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
			</svg>
		</a>
	</div>

	<h1 class="text-2xl font-serif text-bark mb-2">Admin Login</h1>
	<p class="text-bark/60 font-sans mb-8 text-center">
		{#if step === 'email'}
			Enter your admin email to receive a login code
		{:else}
			Enter the code sent to {email}
		{/if}
	</p>

	<!-- Messages -->
	{#if errorMessage}
		<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg w-full max-w-sm">
			<p class="text-sm font-sans">{errorMessage}</p>
		</div>
	{/if}

	{#if successMessage && step === 'code'}
		<div class="mb-4 bg-grove-50 border border-grove-200 text-grove-700 px-4 py-3 rounded-lg w-full max-w-sm">
			<p class="text-sm font-sans">{successMessage}</p>
		</div>
	{/if}

	<!-- Forms -->
	<div class="w-full max-w-sm">
		{#if step === 'email'}
			<form onsubmit={(e) => { e.preventDefault(); requestCode(); }}>
				<input
					type="email"
					bind:value={email}
					placeholder="admin@example.com"
					class="input-field mb-4"
					required
					disabled={isLoading}
				/>
				<button
					type="submit"
					class="btn-primary w-full"
					disabled={isLoading || !email}
				>
					{isLoading ? 'Sending...' : 'Send Login Code'}
				</button>
			</form>
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); verifyCode(); }}>
				<input
					type="text"
					bind:value={code}
					placeholder="Enter 6-character code"
					class="input-field mb-4 text-center tracking-widest uppercase"
					maxlength="6"
					required
					disabled={isLoading}
				/>
				<button
					type="submit"
					class="btn-primary w-full mb-4"
					disabled={isLoading || !code}
				>
					{isLoading ? 'Verifying...' : 'Verify Code'}
				</button>
				<button
					type="button"
					onclick={() => { step = 'email'; code = ''; errorMessage = ''; successMessage = ''; }}
					class="w-full text-sm text-bark/60 hover:text-grove-600 font-sans transition-colors"
				>
					Use a different email
				</button>
			</form>
		{/if}
	</div>

	<!-- Back link -->
	<a
		href="/"
		class="mt-8 text-sm text-bark/50 hover:text-grove-600 font-sans transition-colors"
	>
		Back to Grove
	</a>
</main>
