<!--
  Verification Page (Shade)

  A friendly human verification page for first-time visitors.
  Uses Cloudflare Turnstile for invisible/managed verification.
-->

<script lang="ts">
	import TurnstileWidget from '$lib/ui/components/forms/TurnstileWidget.svelte';
	import { GroveTerm } from '$lib/ui';

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
				// Brief pause to show success, then do a HARD redirect
				// (soft navigation via goto won't pick up the new verification cookie)
				setTimeout(() => {
					window.location.href = data.returnTo;
				}, 500);
			} else {
				const result = (await response.json()) as { message?: string };
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
	<title>Entering the Grove</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="verify-page">
	<div class="verify-container">
		<div class="grove-logo">
			<svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
				<path d="M12 2C8 2 4 6 4 12c0 4 2 7 5 9v-4c-1.5-1-2.5-2.5-2.5-4.5C6.5 9 9 6.5 12 6.5S17.5 9 17.5 12.5c0 2-1 3.5-2.5 4.5v4c3-2 5-5 5-9 0-6-4-10-8-10z"/>
			</svg>
		</div>

		<h1>Entering the Grove...</h1>

		{#if status === 'waiting' || status === 'verifying'}
			<p class="subtitle">
				This site uses <strong><GroveTerm term="shade">Shade</GroveTerm></strong> to protect the author's writing from AI scrapers
				and automated harvesting. We're just making sure you're a real person
				here to read, not a bot here to collect.
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
			This usually takes a moment. Once verified, you won't see this again.
			<br />
			<a href="https://grove.place/shade">Learn how Grove protects creative work →</a>
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
		background: var(--color-background);
	}

	.verify-container {
		text-align: center;
		max-width: 420px;
	}

	.grove-logo {
		color: var(--color-primary);
		margin-bottom: 1.5rem;
	}

	h1 {
		font-family: var(--font-serif, Georgia, serif);
		font-size: 1.75rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-foreground);
	}

	.subtitle {
		color: var(--color-muted-foreground);
		margin-bottom: 2rem;
		line-height: 1.7;
		font-size: 0.95rem;
	}

	.subtitle strong {
		color: var(--color-foreground);
		font-weight: 600;
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
		color: var(--color-primary);
		background: var(--color-accent);
	}

	.status.success {
		color: var(--color-success-foreground);
		background: var(--color-success-light);
	}

	.status.error {
		color: var(--color-error-foreground);
		background: var(--color-error-light);
	}

	.retry-button {
		padding: 0.75rem 1.5rem;
		background: var(--color-primary);
		color: var(--color-primary-foreground);
		border: none;
		border-radius: var(--radius-grove, 6px);
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-button:hover {
		background: var(--color-primary-hover);
	}

	.info {
		margin-top: 2rem;
		font-size: 0.8rem;
		color: var(--color-muted-foreground);
		line-height: 1.6;
	}

	.info a {
		color: var(--color-primary);
		text-decoration: none;
		transition: color 0.2s;
	}

	.info a:hover {
		text-decoration: underline;
	}
</style>
