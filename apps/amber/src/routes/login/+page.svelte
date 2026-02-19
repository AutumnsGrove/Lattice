<script lang="ts">
	import { Logo } from "@autumnsgrove/lattice/ui/components";
	import { signIn } from "$lib/auth";
	import Icon from "$lib/components/Icons.svelte";

	function handleGoogleSignIn() {
		signIn("google");
	}

	function handleGithubSignIn() {
		signIn("github");
	}
</script>

<div class="login-page">
	<div class="login-card">
		<div class="logo-section">
			<Logo class="logo-icon" color="var(--color-primary)" />
			<h1 class="app-name">Amber</h1>
			<p class="tagline">Unified Storage Management for Grove</p>
		</div>

		<div class="sign-in-section">
			<h2>Sign in to continue</h2>
			<p class="subtitle">Access all your files in one place</p>

			<div class="sign-in-buttons">
				<button class="sign-in-btn google" onclick={handleGoogleSignIn}>
					<Icon name="logo-google" size={20} />
					<span>Continue with Google</span>
				</button>

				<button class="sign-in-btn github" onclick={handleGithubSignIn}>
					<Icon name="logo-github" size={20} />
					<span>Continue with GitHub</span>
				</button>
			</div>
		</div>

		<div class="footer-section">
			<p class="footer-text">
				Part of the <a href="https://grove.place" target="_blank" rel="noopener">Grove Platform</a>
			</p>
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-primary);
		padding: var(--space-4);
	}

	.login-card {
		width: 100%;
		max-width: 420px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-8);
		box-shadow: var(--shadow-lg);
	}

	.logo-section {
		text-align: center;
		margin-bottom: var(--space-8);
	}

	:global(.logo-icon) {
		width: 64px;
		height: 64px;
		margin: 0 auto var(--space-4);
	}

	.app-name {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-primary);
		margin-bottom: var(--space-2);
	}

	.tagline {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.sign-in-section {
		margin-bottom: var(--space-6);
	}

	.sign-in-section h2 {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
		margin-bottom: var(--space-2);
		text-align: center;
	}

	.subtitle {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-align: center;
		margin-bottom: var(--space-6);
	}

	.sign-in-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.sign-in-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		font-size: var(--text-base);
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.sign-in-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	.sign-in-btn.google {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.sign-in-btn.github {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.footer-section {
		text-align: center;
		padding-top: var(--space-6);
		border-top: 1px solid var(--color-border-subtle);
	}

	.footer-text {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.footer-text a {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: var(--font-medium);
	}

	.footer-text a:hover {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.login-card {
			padding: var(--space-6);
		}

		.app-name {
			font-size: var(--text-2xl);
		}
	}
</style>
