<script lang="ts">
	/**
	 * Footer - Status page footer
	 *
	 * Minimal footer with links to main Grove site and support.
	 */
	import { cn } from '$lib/utils/cn';
	import { Trees, Mail, ExternalLink } from 'lucide-svelte';
	import type { FooterLink, MaxWidth } from './types';

	interface Props {
		class?: string;
		links?: FooterLink[];
		tagline?: string;
		maxWidth?: MaxWidth;
	}

	let {
		class: className,
		links,
		tagline = 'A clearing in the forest where you can see what\'s happening.',
		maxWidth = 'default'
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	// Default links for status page
	const DEFAULT_LINKS: FooterLink[] = [
		{ href: 'https://grove.place', label: 'grove.place', icon: Trees, external: true },
		{ href: '/feed', label: 'Subscribe via RSS' },
		{ href: 'mailto:support@grove.place', label: 'Contact Support', icon: Mail }
	];

	const items = $derived(links || DEFAULT_LINKS);
</script>

<footer
	class={cn(
		'mt-auto py-8 px-6',
		'border-t border-white/20 dark:border-bark-700/30',
		'bg-white/50 dark:bg-bark-900/30',
		className
	)}
>
	<div class="{maxWidthClass[maxWidth]} mx-auto">
		<!-- Links -->
		<div class="flex flex-wrap justify-center gap-6 mb-6 text-sm">
			{#each items as link}
				<a
					href={link.href}
					target={link.external ? '_blank' : undefined}
					rel={link.external ? 'noopener noreferrer' : undefined}
					class="inline-flex items-center gap-1.5 text-foreground-muted hover:text-foreground transition-colors"
				>
					{#if link.icon}
						{@const Icon = link.icon}
						<Icon class="w-4 h-4" />
					{/if}
					{link.label}
					{#if link.external}
						<ExternalLink class="w-3 h-3 opacity-50" />
					{/if}
				</a>
			{/each}
		</div>

		<!-- Copyright -->
		<p class="text-center text-sm text-foreground-subtle">
			{tagline}
		</p>
	</div>
</footer>