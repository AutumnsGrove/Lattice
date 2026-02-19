<script lang="ts">
	import GroveLogo from "$lib/components/GroveLogo.svelte";
	import Icon from "$lib/components/Icons.svelte";

	const AUTH_URL = "https://login.grove.place";

	function signInWithGoogle() {
		const callbackURL = encodeURIComponent(window.location.origin + "/inbox");
		window.location.href = `${AUTH_URL}/api/auth/sign-in/google?callbackURL=${callbackURL}`;
	}

	function signInWithGitHub() {
		const callbackURL = encodeURIComponent(window.location.origin + "/inbox");
		window.location.href = `${AUTH_URL}/api/auth/sign-in/github?callbackURL=${callbackURL}`;
	}
</script>

<div class="login-page">
	<div class="login-container">
		<div class="login-header">
			<GroveLogo size={48} color="var(--color-primary)" />
			<h1>Ivy Mail</h1>
			<p>Zero-knowledge email for Grove</p>
		</div>

		<div class="login-buttons">
			<button class="login-btn google" onclick={signInWithGoogle}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 18 18"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
						fill="#4285F4"
					/>
					<path
						d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
						fill="#34A853"
					/>
					<path
						d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
						fill="#FBBC05"
					/>
					<path
						d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
						fill="#EA4335"
					/>
				</svg>
				<span>Continue with Google</span>
			</button>

			<button class="login-btn github" onclick={signInWithGitHub}>
				<Icon name="github" size={18} />
				<span>Continue with GitHub</span>
			</button>
		</div>

		<div class="login-footer">
			<p>Secure, private, and encrypted email powered by Grove</p>
		</div>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
		padding: var(--space-4);
	}

	.login-container {
		width: 100%;
		max-width: 420px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		padding: var(--space-8);
		text-align: center;
	}

	.login-header {
		margin-bottom: var(--space-8);
	}

	.login-header h1 {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-text-primary);
		margin: var(--space-4) 0 var(--space-2);
	}

	.login-header p {
		font-size: var(--text-base);
		color: var(--color-text-secondary);
	}

	.login-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.login-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-base);
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
		background: var(--color-bg-secondary);
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.login-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.login-btn:active {
		transform: translateY(0);
	}

	.login-btn.google:hover {
		border-color: #4285f4;
	}

	.login-btn.github:hover {
		border-color: #333;
	}

	.login-footer {
		padding-top: var(--space-6);
		border-top: 1px solid var(--color-border-subtle);
	}

	.login-footer p {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	@media (max-width: 479px) {
		.login-container {
			padding: var(--space-6);
		}

		.login-header h1 {
			font-size: var(--text-2xl);
		}
	}
</style>
