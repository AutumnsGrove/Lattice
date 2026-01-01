<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Unsubscribe - Grove</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container">
	<div class="card">
		<!-- Grove Logo -->
		<svg class="logo" width="50" height="61" viewBox="0 0 417 512" xmlns="http://www.w3.org/2000/svg">
			<path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z" />
			<path
				fill="#16a34a"
				d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"
			/>
		</svg>

		{#if form?.success}
			<!-- Successfully unsubscribed -->
			<h1>You've been unsubscribed</h1>
			<p class="message">
				<strong>{form.email}</strong> has been removed from our mailing list.
			</p>
			<p class="secondary">We're sorry to see you go. If you ever want to rejoin, you're always welcome back.</p>
			<a href="/" class="link">Return to Grove</a>

		{:else if form?.error}
			<!-- Error during unsubscribe -->
			<h1>Something went wrong</h1>
			<p class="message error">{form.error}</p>
			<a href="/" class="link">Return to Grove</a>

		{:else if data.status === 'confirm'}
			<!-- Confirmation form -->
			<h1>Unsubscribe from Grove</h1>
			<p class="message">
				Are you sure you want to unsubscribe <strong>{data.email}</strong> from our mailing list?
			</p>
			<p class="secondary">You'll no longer receive updates about Grove.</p>

			<form method="POST">
				<input type="hidden" name="email" value={data.email} />
				<input type="hidden" name="token" value={data.token} />
				<button type="submit" class="button">Yes, unsubscribe me</button>
			</form>

			<a href="/" class="link cancel">No, keep me subscribed</a>

		{:else if data.status === 'already_unsubscribed'}
			<!-- Already unsubscribed -->
			<h1>Already unsubscribed</h1>
			<p class="message">
				<strong>{data.email}</strong> is already unsubscribed from our mailing list.
			</p>
			<a href="/" class="link">Return to Grove</a>

		{:else if data.status === 'not_found'}
			<!-- Email not in list -->
			<h1>Not subscribed</h1>
			<p class="message">{data.message}</p>
			<a href="/" class="link">Return to Grove</a>

		{:else}
			<!-- Invalid link -->
			<h1>Invalid link</h1>
			<p class="message">{data.message}</p>
			<p class="secondary">
				If you're trying to unsubscribe, please use the link from your email.
			</p>
			<a href="/" class="link">Return to Grove</a>
		{/if}
	</div>

	<p class="footer">grove.place</p>
</div>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background-color: #fefdfb;
		font-family: Georgia, Cambria, 'Times New Roman', serif;
	}

	.card {
		max-width: 420px;
		width: 100%;
		text-align: center;
		padding: 2.5rem;
		background: white;
		border-radius: 16px;
		box-shadow: 0 4px 24px rgba(61, 41, 20, 0.08);
	}

	.logo {
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: normal;
		color: #3d2914;
		margin: 0 0 1rem 0;
	}

	.message {
		font-size: 1rem;
		line-height: 1.6;
		color: #3d2914;
		margin: 0 0 0.75rem 0;
	}

	.message.error {
		color: #dc2626;
	}

	.message strong {
		font-weight: 600;
	}

	.secondary {
		font-size: 0.9rem;
		color: #3d2914;
		opacity: 0.7;
		margin: 0 0 1.5rem 0;
	}

	form {
		margin-bottom: 1rem;
	}

	.button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background-color: #dc2626;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.button:hover {
		background-color: #b91c1c;
	}

	.link {
		display: inline-block;
		color: #16a34a;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.link:hover {
		text-decoration: underline;
	}

	.link.cancel {
		color: #3d2914;
		opacity: 0.6;
	}

	.footer {
		margin-top: 2rem;
		font-size: 0.75rem;
		color: #3d2914;
		opacity: 0.4;
	}
</style>
