<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { Logo } from '../nature';
	import {
		Github,
		ExternalLink,
		BookOpen,
		MapPin,
		Tag,
		Telescope,
		Mail,
		PenLine,
		Hammer,
		Scroll,
		Grape,
		Trees
	} from 'lucide-svelte';
	import { seasonStore } from '../../stores/season';
	import type { FooterLink, MaxWidth, Season } from './types';
	import { DEFAULT_RESOURCE_LINKS, DEFAULT_CONNECT_LINKS, DEFAULT_LEGAL_LINKS } from './defaults';

	interface Props {
		resourceLinks?: FooterLink[];
		connectLinks?: FooterLink[];
		legalLinks?: FooterLink[];
		season?: Season;
		maxWidth?: MaxWidth;
	}

	let {
		resourceLinks,
		connectLinks,
		legalLinks,
		season,
		maxWidth = 'default'
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	const resources = resourceLinks || DEFAULT_RESOURCE_LINKS;
	const connect = connectLinks || DEFAULT_CONNECT_LINKS;
	const legal = legalLinks || DEFAULT_LEGAL_LINKS;
</script>

<footer class="py-12 border-t border-default">
	<div class="{maxWidthClass[maxWidth]} mx-auto px-6">
		<!-- Three Column Layout (stacked on mobile) -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-10">
			<!-- Column 1: Grove Brand -->
			<div class="text-center sm:text-left">
				<div class="flex items-center gap-2 justify-center sm:justify-start mb-3">
					<Logo class="w-6 h-6" season={season || $seasonStore} />
					<span class="text-xl font-serif text-foreground">Grove</span>
				</div>
				<p class="text-sm font-sans text-foreground-subtle italic mb-4">
					A place to Be
				</p>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					A quiet corner of the internet where your words can grow and flourish.
				</p>
			</div>

			<!-- Column 2: Resources -->
			<div class="text-center sm:text-left">
				<h3 class="text-sm font-sans font-medium text-foreground uppercase tracking-wide mb-4">Resources</h3>
				<ul class="space-y-2.5 text-sm font-sans">
					{#each resources as link}
						<li>
							<a href={link.href} class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
								{#if link.icon}
									<svelte:component this={link.icon} class="w-4 h-4" />
								{/if}
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Column 3: Connect -->
			<div class="text-center sm:text-left">
				<h3 class="text-sm font-sans font-medium text-foreground uppercase tracking-wide mb-4">Connect</h3>
				<ul class="space-y-2.5 text-sm font-sans">
					{#each connect as link}
						<li>
							<a
								href={link.href}
								target={link.external ? '_blank' : undefined}
								rel={link.external ? 'noopener noreferrer' : undefined}
								class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors"
							>
								{#if link.icon}
									<svelte:component this={link.icon} class="w-4 h-4" />
								{/if}
								{link.label}
								{#if link.external}
									<ExternalLink class="w-3 h-3" />
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Bottom Bar -->
		<div class="pt-6 border-t border-default">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
				<!-- Copyright & Legal Links -->
				<div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-xs font-sans text-foreground-subtle">
					<span>&copy; {new Date().getFullYear()} Autumn Brown</span>
					<span class="text-divider">·</span>
					<span>Made with care</span>
					<span class="text-divider hidden sm:inline">·</span>
					<a href="/credits" class="hover:text-accent-muted transition-colors">Credits</a>
					<span class="text-divider">·</span>
					{#each legal as link, index}
						<a href={link.href} class="hover:text-accent-muted transition-colors">{link.label}</a>
						{#if index < legal.length - 1}
							<span class="text-divider">·</span>
						{/if}
					{/each}
				</div>

				<!-- Theme Toggle -->
				<div class="flex items-center gap-2">
					<span class="text-xs text-foreground-faint font-sans">Theme</span>
					<ThemeToggle />
				</div>
			</div>
		</div>
	</div>
</footer>