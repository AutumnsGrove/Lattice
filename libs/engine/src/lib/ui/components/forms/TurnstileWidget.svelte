<script lang="ts">
	/**
	 * TurnstileWidget - Cloudflare Turnstile human verification (Shade)
	 *
	 * Usage:
	 * <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onverify={(token) => handleToken(token)} />
	 *
	 * The widget is invisible in "managed" mode - users only see it when suspicious.
	 */


	interface Props {
		siteKey: string;
		theme?: 'light' | 'dark' | 'auto';
		size?: 'normal' | 'compact';
		onverify?: (token: string) => void;
		onerror?: (error: string) => void;
		onexpire?: () => void;
	}

	let {
		siteKey,
		theme = 'auto',
		size = 'normal',
		onverify,
		onerror,
		onexpire
	}: Props = $props();

	let container: HTMLDivElement;
	let widgetId: string | null = null;

	// Load the Turnstile script if not already loaded
	function loadScript(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (window.turnstile) {
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Turnstile script'));
			document.head.appendChild(script);
		});
	}

	function renderWidget() {
		if (!window.turnstile || !container) return;

		widgetId = window.turnstile.render(container, {
			sitekey: siteKey,
			theme,
			size,
			callback: (token: string) => {
				onverify?.(token);
			},
			'error-callback': (error: string) => {
				onerror?.(error);
			},
			'expired-callback': () => {
				onexpire?.();
			}
		});
	}

	// Load and render Turnstile widget (runs once on mount)
	let turnstileInitialized = false;

	$effect(() => {
		// Only initialize once
		if (!turnstileInitialized) {
			turnstileInitialized = true;

			(async () => {
				try {
					await loadScript();
					renderWidget();
				} catch (err) {
					console.error('Turnstile load error:', err);
					onerror?.(err instanceof Error ? err.message : 'Failed to load Turnstile');
				}
			})();
		}

		// Always return cleanup (runs on unmount or if effect re-runs)
		return () => {
			if (widgetId && window.turnstile) {
				window.turnstile.remove(widgetId);
			}
		};
	});

	// Reset the widget (useful after form submission)
	export function reset() {
		if (widgetId && window.turnstile) {
			window.turnstile.reset(widgetId);
		}
	}

	// Get the current token
	export function getToken(): string | undefined {
		if (widgetId && window.turnstile) {
			return window.turnstile.getResponse(widgetId);
		}
		return undefined;
	}
</script>

<div bind:this={container} class="turnstile-container"></div>

<style>
	.turnstile-container {
		display: flex;
		justify-content: center;
		min-height: 65px;
	}
</style>
