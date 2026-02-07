<script lang="ts">
	import { goto } from '$app/navigation';
	import { Mail, Loader2, RefreshCw, Check, ArrowRight } from 'lucide-svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';

	let { data } = $props();

	// Form state
	let code = $state('');
	let isVerifying = $state(false);
	let isResending = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	// Rate limit state
	let canResend = $state(data.rateLimit.canResend);
	let remainingResends = $state(data.rateLimit.remainingResends);
	let retryAfterSeconds = $state(data.rateLimit.retryAfterSeconds);

	// Countdown timer for retry
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		// Clear any existing interval before starting a new one
		// This prevents multiple intervals running simultaneously
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}

		if (retryAfterSeconds && retryAfterSeconds > 0) {
			countdownInterval = setInterval(() => {
				if (retryAfterSeconds && retryAfterSeconds > 0) {
					retryAfterSeconds--;
				} else {
					canResend = true;
					if (countdownInterval) {
						clearInterval(countdownInterval);
						countdownInterval = null;
					}
				}
			}, 1000);
		}

		return () => {
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
		};
	});

	// Format code as user types (auto-focus next input)
	function handleCodeInput(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		// Only allow digits
		const digits = input.value.replace(/\D/g, '').slice(0, 6);
		code = digits;
	}

	// Submit verification code
	async function submitCode() {
		if (code.length !== 6 || isVerifying) return;

		isVerifying = true;
		error = null;

		try {
			const res = await fetch('/api/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});

			const result = (await res.json()) as {
				success: boolean;
				error?: string;
				errorCode?: string;
			};

			if (result.success) {
				success = true;
				// Brief delay to show success state, then redirect
				setTimeout(() => {
					goto('/plans');
				}, 1000);
			} else {
				error = result.error || 'Invalid code. Please try again.';
				// Clear code on error for easy retry
				if (result.errorCode === 'invalid_code') {
					code = '';
				}
			}
		} catch {
			error = 'Unable to verify code. Please try again.';
		} finally {
			isVerifying = false;
		}
	}

	// Resend verification code
	async function resendCode() {
		if (!canResend || isResending) return;

		isResending = true;
		error = null;

		try {
			const res = await fetch('/api/verify-email/resend', {
				method: 'POST'
			});

			const result = (await res.json()) as {
				success: boolean;
				error?: string;
				retryAfterSeconds?: number;
			};

			if (result.success) {
				remainingResends = Math.max(0, remainingResends - 1);
				if (remainingResends === 0) {
					canResend = false;
				}
				// Clear old code
				code = '';
			} else {
				error = result.error || 'Unable to resend code.';
				if (result.retryAfterSeconds) {
					canResend = false;
					retryAfterSeconds = result.retryAfterSeconds;
				}
			}
		} catch {
			error = 'Unable to resend code. Please try again.';
		} finally {
			isResending = false;
		}
	}

	// Format retry time as mm:ss
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Auto-submit when 6 digits entered
	$effect(() => {
		if (code.length === 6 && !isVerifying && !success) {
			submitCode();
		}
	});
</script>

<div class="animate-fade-in max-w-2xl mx-auto px-4 py-8">
	<!-- Header -->
	<div class="text-center mb-8">
		<div
			class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
		>
			{#if success}
				<Check size={32} class="text-success" />
			{:else}
				<Mail size={32} class="text-primary" />
			{/if}
		</div>
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">
			{success ? 'Email verified!' : 'Check your email'}
		</h1>
		<p class="text-foreground-muted">
			{#if success}
				Redirecting you to choose your plan...
			{:else}
				We sent a verification code to <strong class="text-foreground">{data.email}</strong>
			{/if}
		</p>
	</div>

	<!-- Verification Form -->
	{#if !success}
		<GlassCard variant="frosted" class="max-w-md mx-auto">
			<div class="space-y-6">
				<!-- Code Input -->
				<div>
					<label for="code" class="block text-sm font-medium text-foreground mb-3 text-center">
						Enter the 6-digit code
					</label>

					<!-- Single input with letter-spacing for visual separation -->
					<div class="relative">
						<input
							type="text"
							id="code"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="one-time-code"
							maxlength="6"
							value={code}
							oninput={handleCodeInput}
							disabled={isVerifying || success}
							placeholder="000000"
							aria-label="Six digit verification code"
							aria-describedby="code-help"
							class="w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint/40 transition-all focus:outline-none focus:border-primary focus:bg-white/80 dark:focus:bg-bark-800/70 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
						/>
						{#if isVerifying}
							<div
								class="absolute right-4 top-1/2 -translate-y-1/2"
								aria-hidden="true"
							>
								<Loader2 size={24} class="animate-spin text-primary" />
							</div>
						{/if}
					</div>

					<p id="code-help" class="text-xs text-foreground-subtle mt-2 text-center">
						The code expires in 15 minutes
					</p>
				</div>

				<!-- Error Message -->
				{#if error}
					<div class="p-3 rounded-lg bg-error-bg border border-error text-error text-sm text-center">
						{error}
					</div>
				{/if}

				<!-- Verify Button (only shown if auto-submit somehow fails) -->
				<button
					type="button"
					onclick={submitCode}
					disabled={code.length !== 6 || isVerifying || success}
					class="btn-primary w-full"
				>
					{#if isVerifying}
						<Loader2 size={18} class="animate-spin" />
						Verifying...
					{:else}
						<ArrowRight size={18} />
						Verify and Continue
					{/if}
				</button>

				<!-- Resend Section -->
				<div class="pt-4 border-t border-white/20 dark:border-bark-700/20">
					<p class="text-sm text-foreground-muted text-center mb-3">
						Didn't receive the code?
					</p>

					{#if canResend}
						<button
							type="button"
							onclick={resendCode}
							disabled={isResending}
							class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
						>
							{#if isResending}
								<Loader2 size={16} class="animate-spin" />
								Sending...
							{:else}
								<RefreshCw size={16} />
								Resend code
								{#if remainingResends < 3}
									<span class="text-xs text-foreground-muted">
										({remainingResends} left)
									</span>
								{/if}
							{/if}
						</button>
					{:else if retryAfterSeconds}
						<p class="text-sm text-foreground-subtle text-center">
							You can request a new code in <strong>{formatTime(retryAfterSeconds)}</strong>
						</p>
					{:else}
						<p class="text-sm text-foreground-subtle text-center">
							Please check your spam folder or contact support
						</p>
					{/if}
				</div>
			</div>
		</GlassCard>

		<!-- Help Text -->
		<div class="mt-6 text-center">
			<p class="text-sm text-foreground-subtle">
				Need help? <a href="mailto:hello@grove.place" class="text-primary hover:underline"
					>Contact support</a
				>
			</p>
		</div>
	{/if}
</div>
