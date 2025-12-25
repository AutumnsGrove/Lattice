<!--
  Verification Page (Shade)

  A friendly human verification page for first-time visitors.
  Uses Cloudflare Turnstile for invisible/managed verification.
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import TurnstileWidget from '$lib/ui/components/forms/TurnstileWidget.svelte';

	interface Props {
		data: {
			siteKey: string;
			returnTo: string;
		};
	}

	let { data }: Props = $props();

	let status: 'waiting' | 'verifying' | 'success' | 'error' = $state('waiting');
	let errorMessage = $state('');

	async function handleVerification(token: string) {
		status = 'verifying';

		try {
			const response = await fetch('/api/verify/turnstile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token })
			});

			if (response.ok) {
				status = 'success';
				// Brief pause to show success, then redirect
				setTimeout(() => {
					goto(data.returnTo);
				}, 500);
			} else {
				const result = await response.json();
				status = 'error';
				errorMessage = result.message || 'Verification failed. Please try again.';
			}
		} catch (err) {
			status = 'error';
			errorMessage = 'Connection error. Please check your internet and try again.';
		}
	}

	function handleError(error: string) {
		status = 'error';
		errorMessage = 'Verification widget failed to load. Please refresh the page.';
		console.error('Turnstile error:', error);
	}
</script>

<svelte:head>
	<title>Quick Check | Grove</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="verify-page">
	<div class="verify-container">
		<div class="grove-logo">
			<svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
				<path d="M12 2C8 2 4 6 4 12c0 4 2 7 5 9v-4c-1.5-1-2.5-2.5-2.5-4.5C6.5 9 9 6.5 12 6.5S17.5 9 17.5 12.5c0 2-1 3.5-2.5 4.5v4c3-2 5-5 5-9 0-6-4-10-8-10z"/>
			</svg>
		</div>

		<h1>Just a moment...</h1>

		{#if status === 'waiting' || status === 'verifying'}
			<p class="subtitle">
				We're making sure you're a real person, not a bot.
				<br />
				This usually happens automatically.
			</p>

			<div class="widget-container">
				<TurnstileWidget
					siteKey={data.siteKey}
					onverify={handleVerification}
					onerror={handleError}
				/>
			</div>

			{#if status === 'verifying'}
				<p class="status verifying">Verifying...</p>
			{/if}
		{:else if status === 'success'}
			<p class="status success">Verified! Redirecting...</p>
		{:else if status === 'error'}
			<p class="status error">{errorMessage}</p>
			<button class="retry-button" onclick={() => window.location.reload()}>
				Try Again
			</button>
		{/if}

		<p class="info">
			This check helps protect our community from automated scraping and spam.
			<a href="/shade">Learn more about how we protect your content.</a>
		</p>
	</div>
</main>

<style>
	.verify-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--color-background, #faf9f6);
	}

	.verify-container {
		text-align: center;
		max-width: 400px;
	}

	.grove-logo {
		color: var(--color-primary, #2d5a27);
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--color-text, #1a1a1a);
	}

	.subtitle {
		color: var(--color-text-muted, #666);
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.widget-container {
		margin: 2rem 0;
		min-height: 65px;
	}

	.status {
		font-size: 0.9rem;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.status.verifying {
		color: var(--color-primary, #2d5a27);
		background: var(--color-primary-light, #e8f0e7);
	}

	.status.success {
		color: #166534;
		background: #dcfce7;
	}

	.status.error {
		color: #991b1b;
		background: #fee2e2;
	}

	.retry-button {
		padding: 0.75rem 1.5rem;
		background: var(--color-primary, #2d5a27);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-button:hover {
		background: var(--color-primary-dark, #1f3d1a);
	}

	.info {
		margin-top: 2rem;
		font-size: 0.8rem;
		color: var(--color-text-muted, #888);
		line-height: 1.5;
	}

	.info a {
		color: var(--color-primary, #2d5a27);
		text-decoration: underline;
	}
</style>
