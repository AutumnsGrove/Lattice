/**
 * Cloudflare Turnstile Type Declarations
 *
 * These types define the Turnstile widget API loaded from
 * https://challenges.cloudflare.com/turnstile/v0/api.js
 */

interface TurnstileRenderOptions {
	sitekey: string;
	callback?: (token: string) => void;
	'error-callback'?: (error: string) => void;
	'expired-callback'?: () => void;
	theme?: 'light' | 'dark' | 'auto';
	size?: 'normal' | 'compact';
	tabindex?: number;
	action?: string;
	cData?: string;
	'response-field'?: boolean;
	'response-field-name'?: string;
	'refresh-expired'?: 'auto' | 'manual' | 'never';
	language?: string;
	appearance?: 'always' | 'execute' | 'interaction-only';
	retry?: 'auto' | 'never';
	'retry-interval'?: number;
}

interface TurnstileWidget {
	render(container: HTMLElement | string, options: TurnstileRenderOptions): string;
	reset(widgetId?: string): void;
	remove(widgetId: string): void;
	getResponse(widgetId?: string): string | undefined;
	isExpired(widgetId?: string): boolean;
	execute(container?: HTMLElement | string, options?: TurnstileRenderOptions): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileWidget;
	}
}

export {};
