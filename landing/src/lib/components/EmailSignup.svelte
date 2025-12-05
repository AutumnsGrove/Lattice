<script lang="ts">
	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'already_signed_up' | 'error'>('idle');
	let errorMessage = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!email || !email.includes('@')) {
			status = 'error';
			errorMessage = 'Please enter a valid email address';
			return;
		}

		status = 'loading';

		try {
			const response = await fetch('/api/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = (await response.json()) as { error?: string };

			if (response.ok) {
				status = 'success';
				email = '';
			} else if (response.status === 409) {
				status = 'already_signed_up';
				email = '';
			} else {
				status = 'error';
				errorMessage = data.error || 'Something went wrong. Please try again.';
			}
		} catch {
			status = 'error';
			errorMessage = 'Unable to connect. Please try again.';
		}
	}
</script>

{#if status === 'success'}
	<div
		class="bg-grove-50 border border-grove-200 rounded-lg px-6 py-4 text-center max-w-md animate-in"
	>
		<svg class="w-8 h-8 text-grove-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" />
			<polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<p class="text-grove-800 font-sans font-medium">You're on the list!</p>
		<p class="text-grove-600 text-sm font-sans mt-1">Check your inbox for a welcome note.</p>
		<p class="text-grove-500 text-xs font-sans mt-2">We'll be in touch when Grove blooms.</p>
	</div>
{:else if status === 'already_signed_up'}
	<div
		class="bg-grove-50 border border-grove-200 rounded-lg px-6 py-4 text-center max-w-md animate-in"
	>
		<svg class="w-8 h-8 text-grove-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<p class="text-grove-800 font-sans font-medium">You're already on the list!</p>
		<p class="text-grove-600 text-sm font-sans mt-1">Thank you for being so excited.</p>
		<p class="text-grove-500 text-xs font-sans mt-2">We'll be in touch when Grove blooms.</p>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="w-full max-w-md">
		<div class="flex flex-col sm:flex-row gap-3">
			<input
				type="email"
				name="email"
				autocomplete="email"
				bind:value={email}
				placeholder="your@email.com"
				class="input-field flex-1"
				disabled={status === 'loading'}
				required
			/>
			<button type="submit" class="btn-primary whitespace-nowrap" disabled={status === 'loading'}>
				{#if status === 'loading'}
					<span class="inline-flex items-center gap-2">
						<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
							<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
						</svg>
						Joining...
					</span>
				{:else}
					Notify me
				{/if}
			</button>
		</div>

		{#if status === 'error'}
			<p class="text-red-600 text-sm mt-2 font-sans">{errorMessage}</p>
		{/if}

		<p class="text-bark/40 text-xs mt-3 text-center font-sans">
			No spam, ever. Unsubscribe anytime.
		</p>
	</form>
{/if}

<style>
	.animate-in {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
