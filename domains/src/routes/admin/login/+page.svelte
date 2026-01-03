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
				window.location.href = '/admin';
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
	<title>Admin Login - Domain Finder</title>
</svelte:head>

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12 domain-gradient">
	<!-- Glass Login Card -->
	<div class="glass-card p-8 w-full max-w-sm">
		<!-- Logo -->
		<div class="mb-6 text-center">
			<a href="/" class="inline-block text-domain-600 hover:text-domain-700 transition-colors" aria-label="Back to home">
				<svg class="w-14 h-14 mx-auto" viewBox="0 0 100 100" fill="none">
					<circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="3" fill="none" opacity="0.2" />
					<circle cx="50" cy="50" r="20" fill="currentColor" fill-opacity="0.15" />
					<circle cx="50" cy="50" r="10" fill="currentColor" />
					<circle cx="68" cy="68" r="12" stroke="currentColor" stroke-width="3" fill="white" />
					<line x1="77" y1="77" x2="88" y2="88" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				</svg>
			</a>
		</div>

		<h1 class="text-2xl font-serif text-bark mb-2 text-center">Admin Login</h1>
		<p class="text-bark/60 font-sans mb-6 text-center text-sm">
			{#if step === 'email'}
				Enter your admin email to receive a login code
			{:else}
				Enter the code sent to {email}
			{/if}
		</p>

		<!-- Messages -->
		{#if errorMessage}
			<div class="mb-4 bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
				<p class="text-sm font-sans">{errorMessage}</p>
			</div>
		{/if}

		{#if successMessage && step === 'code'}
			<div class="mb-4 bg-domain-50/80 border border-domain-200 text-domain-700 px-4 py-3 rounded-lg">
				<p class="text-sm font-sans">{successMessage}</p>
			</div>
		{/if}

		<!-- Forms -->
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
					class="w-full text-sm text-bark/60 hover:text-domain-600 font-sans transition-colors"
				>
					Use a different email
				</button>
			</form>
		{/if}
	</div>

	<!-- Back link -->
	<a
		href="/"
		class="mt-6 text-sm text-bark/50 hover:text-domain-600 font-sans transition-colors"
	>
		Back to Domain Finder
	</a>
</main>
