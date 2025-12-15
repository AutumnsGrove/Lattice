<script lang="ts">
	import { Mail } from 'lucide-svelte';

	// Google icon component
	const GoogleIcon = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
	</svg>`;

	// GitHub icon
	const GitHubIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
	</svg>`;
</script>

<div class="animate-fade-in">
	<!-- Welcome header -->
	<div class="text-center mb-10">
		<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-6">
			<svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-primary">
				<path d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z" fill="currentColor" fill-opacity="0.15"/>
				<path d="M50 20C40 32 30 40 30 55C30 70 38 80 50 80C62 80 70 70 70 55C70 40 60 32 50 20Z" fill="currentColor" fill-opacity="0.3"/>
				<path d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z" fill="currentColor"/>
				<path d="M50 70V95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
			</svg>
		</div>

		<h1 class="text-3xl md:text-4xl font-medium text-foreground mb-3">
			Plant your blog
		</h1>
		<p class="text-lg text-foreground-muted max-w-md mx-auto">
			A warm corner of the internet for your words to grow. Let's get you set up.
		</p>
	</div>

	<!-- Auth options -->
	<div class="card max-w-md mx-auto">
		<h2 class="text-lg font-medium text-foreground mb-6 text-center">
			Choose how to sign in
		</h2>

		<div class="space-y-3">
			<!-- Google -->
			<a href="/auth?provider=google" class="btn-auth">
				{@html GoogleIcon}
				<span>Continue with Google</span>
			</a>

			<!-- GitHub -->
			<a href="/auth?provider=github" class="btn-auth">
				{@html GitHubIcon}
				<span>Continue with GitHub</span>
			</a>

			<!-- Divider -->
			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-default"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-3 bg-surface-elevated text-foreground-subtle">or</span>
				</div>
			</div>

			<!-- Email magic code -->
			<a href="/auth?provider=email" class="btn-auth">
				<Mail size={20} />
				<span>Continue with Email</span>
			</a>
		</div>

		<p class="text-sm text-foreground-subtle text-center mt-6">
			By continuing, you agree to our
			<a href="https://grove.place/legal/terms" class="text-primary hover:underline">Terms of Service</a>
			and
			<a href="https://grove.place/legal/privacy" class="text-primary hover:underline">Privacy Policy</a>.
		</p>
	</div>

	<!-- Why Grove -->
	<div class="mt-12 text-center">
		<h3 class="text-sm font-medium text-foreground-subtle uppercase tracking-wide mb-4">
			Why Grove?
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-xl mx-auto">
			<div class="text-center">
				<div class="text-2xl mb-2">🌱</div>
				<p class="text-sm text-foreground-muted">Your own space, away from algorithms</p>
			</div>
			<div class="text-center">
				<div class="text-2xl mb-2">✨</div>
				<p class="text-sm text-foreground-muted">Beautiful by default, customizable if you want</p>
			</div>
			<div class="text-center">
				<div class="text-2xl mb-2">💚</div>
				<p class="text-sm text-foreground-muted">Built with care, not surveillance</p>
			</div>
		</div>
	</div>
</div>
