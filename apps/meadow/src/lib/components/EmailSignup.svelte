<script lang="ts">
	interface Props {
		variant?: 'default' | 'dark';
	}

	let { variant = 'default' }: Props = $props();

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'already_signed_up' | 'error'>('idle');
	let errorMessage = $state('');

	// Basic email validation - catches obvious mistakes while letting the server do thorough validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!email || !emailRegex.test(email)) {
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
		class="{variant === 'dark' ? 'bg-purple-900/40 border-purple-600/40' : 'bg-accent border-accent'} border rounded-lg px-6 py-4 text-center max-w-md animate-in"
	>
		<svg class="{variant === 'dark' ? 'text-amber-400' : 'text-accent-muted'} w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" />
			<polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<p class="{variant === 'dark' ? 'text-white' : 'text-accent'} font-sans font-medium">You're on the list!</p>
		<p class="{variant === 'dark' ? 'text-purple-200' : 'text-accent-muted'} text-sm font-sans mt-1">Check your inbox for a welcome note.</p>
		<p class="{variant === 'dark' ? 'text-purple-300/80' : 'text-accent-subtle'} text-xs font-sans mt-2">We'll be in touch when Grove blooms.</p>
	</div>
{:else if status === 'already_signed_up'}
	<div
		class="{variant === 'dark' ? 'bg-purple-900/40 border-purple-600/40' : 'bg-accent border-accent'} border rounded-lg px-6 py-4 text-center max-w-md animate-in"
	>
		<svg class="{variant === 'dark' ? 'text-pink-400' : 'text-accent-muted'} w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<p class="{variant === 'dark' ? 'text-white' : 'text-accent'} font-sans font-medium">You're already on the list!</p>
		<p class="{variant === 'dark' ? 'text-purple-200' : 'text-accent-muted'} text-sm font-sans mt-1">Thank you for being so excited.</p>
		<p class="{variant === 'dark' ? 'text-purple-300/80' : 'text-accent-subtle'} text-xs font-sans mt-2">We'll be in touch when Grove blooms.</p>
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
				class="{variant === 'dark' ? 'dark-input' : 'input-field'} flex-1"
				disabled={status === 'loading'}
				required
			/>
			<button type="submit" class="{variant === 'dark' ? 'dark-btn' : 'btn-primary'} whitespace-nowrap" disabled={status === 'loading'}>
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
			<p class="{variant === 'dark' ? 'text-red-400' : 'text-error'} text-sm mt-2 font-sans">{errorMessage}</p>
		{/if}

		<p class="{variant === 'dark' ? 'text-purple-300/70' : 'text-foreground-faint'} text-xs mt-3 text-center font-sans">
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

	/*
	 * Dark variant styles for midnight bloom aesthetic (variant="dark")
	 *
	 * These styles are defined here rather than as Tailwind classes because:
	 * 1. Pseudo-selectors like ::placeholder, :focus, :hover, :disabled need CSS
	 * 2. Complex gradients and box-shadows are cleaner in CSS
	 * 3. Component-scoped styles keep the dark variant self-contained
	 *
	 * Color palette (midnight bloom):
	 * - purple-800/30 (#581c87 @ 30%) - input background
	 * - violet-500/30 (#8b5cf6 @ 30%) - input border
	 * - purple-400/50 (#c084fc @ 50%) - placeholder text
	 * - amber-400 (#fbbf24) - focus ring, button gradient
	 * - amber-500 (#f59e0b) - button gradient end
	 * - indigo-950 (#1e1b4b) - button text (for contrast on amber)
	 */

	.dark-input {
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		border-radius: 0.5rem;
		background-color: rgba(88, 28, 135, 0.3); /* purple-800/30 */
		border: 1px solid rgba(139, 92, 246, 0.3); /* violet-500/30 */
		color: white;
		transition: all 0.2s;
	}

	.dark-input::placeholder {
		color: rgba(192, 132, 252, 0.5); /* purple-400/50 */
	}

	.dark-input:focus {
		outline: none;
		border-color: rgba(251, 191, 36, 0.5); /* amber-400/50 */
		box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1); /* amber-400/10 */
	}

	.dark-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dark-btn {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.5rem;
		background: linear-gradient(to right, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9)); /* amber-400 -> amber-500 */
		color: #1e1b4b; /* indigo-950 for contrast */
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.dark-btn:hover:not(:disabled) {
		background: linear-gradient(to right, rgba(251, 191, 36, 1), rgba(245, 158, 11, 1));
		transform: translateY(-1px);
	}

	.dark-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}
</style>
