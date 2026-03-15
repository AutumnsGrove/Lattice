<script lang="ts">
	/**
	 * Email Button — Retro "Email Me!" button with mailbox icon.
	 * Links to owner's contact page or mailto.
	 */
	import type { EmailButtonConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: EmailButtonConfig } = $props();

	const contactUrl = $derived(config.contactUrl || '#');
	const label = $derived(config.label || 'Email Me!');
</script>

<a
	href={contactUrl}
	class="email-button"
	aria-label={label}
	rel="noopener noreferrer"
>
	<svg class="email-icon" viewBox="0 0 24 24" aria-hidden="true">
		<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
		<path d="M2 6 L12 13 L22 6" fill="none" stroke="currentColor" stroke-width="1.5" />
	</svg>
	<span class="email-label">{label}</span>
</a>

<style>
	.email-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: linear-gradient(180deg, #6366f1, #4f46e5);
		color: #fff;
		border: 2px outset rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		text-decoration: none;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		transition: transform 0.1s ease;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
	}

	.email-button:hover {
		transform: translateY(-1px);
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
	}

	.email-button:active {
		transform: translateY(1px);
		box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
		border-style: inset;
	}

	.email-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.email-label {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	:global(.dark) .email-button {
		background: linear-gradient(180deg, #818cf8, #6366f1);
	}

	@media (prefers-reduced-motion: reduce) {
		.email-button { transition: none; }
	}
</style>
