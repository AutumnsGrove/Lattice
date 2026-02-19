<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { Logo } from '../ui';
	import { GroveDivider } from '../nature';
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
		Trees,
		Leaf
	} from 'lucide-svelte';
	import { seasonStore } from '../../stores/season.svelte';
	import { groveModeStore } from '../../stores/grove-mode.svelte';
	import type { FooterLink, MaxWidth, Season } from './types';
	import { resolveNavLabel } from './types';
	import { DEFAULT_RESOURCE_LINKS, DEFAULT_CONNECT_LINKS, DEFAULT_LEGAL_LINKS, DIVIDER_VERTICAL } from './defaults';

	import defaultManifestData from '$lib/data/grove-term-manifest.json';

	// Easter egg: cycle through seasons when clicking the footer logo
	function handleLogoClick() {
		seasonStore.cycle();
	}

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

	const resources = $derived(resourceLinks || DEFAULT_RESOURCE_LINKS);
	const connect = $derived(connectLinks || DEFAULT_CONNECT_LINKS);
	const legal = $derived(legalLinks || DEFAULT_LEGAL_LINKS);

	// Resolve nav labels based on Grove Mode
	function labelFor(link: FooterLink): string {
		return resolveNavLabel(link, groveModeStore.current, defaultManifestData);
	}
</script>

<footer class="py-12 border-t border-default">
	<div class="{maxWidthClass[maxWidth]} mx-auto px-6">
		<!-- Responsive Layout: Brand only (mobile) → Three columns with glass dividers (desktop) -->
		<!-- Resources/Connect sections are in the mobile overflow menu instead -->
		<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-6 sm:mb-10">
			<!-- Column 1: Grove Brand (always visible) -->
			<div class="text-center sm:text-left lg:flex-1">
				<div class="flex items-center gap-2 justify-center sm:justify-start mb-3">
					<!-- Easter egg: click logo to cycle seasons -->
					<Logo
						class="w-6 h-6"
						season={season || seasonStore.current}
						interactive
						onclick={handleLogoClick}
						title="Click for a surprise"
						ariaLabel="Cycle through seasons"
					/>
					<span class="text-xl font-serif text-foreground">Grove</span>
				</div>
				<p class="text-sm font-sans text-foreground-subtle italic mb-4">
					A place to Be
				</p>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					A quiet corner of the internet where your words can grow and flourish.
				</p>
			</div>

			{#if resources.length > 0}
			<!-- Vertical Divider (hidden on mobile/tablet) -->
			<div class="hidden lg:flex items-center px-2">
				<GroveDivider {...DIVIDER_VERTICAL} />
			</div>

			<!-- Column 2: Resources (hidden on mobile) -->
			<div class="hidden sm:block text-center sm:text-left lg:flex-1">
				<h3 class="text-sm font-sans font-medium text-foreground uppercase tracking-wide mb-4">Resources</h3>
				<ul class="space-y-2.5 text-sm font-sans">
					{#each resources as link}
						<li>
							<a href={link.href} class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
								{#if link.icon}
									{@const Icon = link.icon}
								<Icon class="w-4 h-4" />
								{/if}
								{labelFor(link)}
							</a>
						</li>
					{/each}
				</ul>
			</div>
			{/if}

			{#if connect.length > 0}
			<!-- Vertical Divider (hidden on mobile/tablet) -->
			<div class="hidden lg:flex items-center px-2">
				<GroveDivider {...DIVIDER_VERTICAL} />
			</div>

			<!-- Column 3: Connect (hidden on mobile) -->
			<div class="hidden sm:block text-center sm:text-left lg:flex-1">
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
									{@const Icon = link.icon}
								<Icon class="w-4 h-4" />
								{/if}
								{labelFor(link)}
								{#if link.external}
									<ExternalLink class="w-3 h-3" />
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
			{/if}
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
					<a href="https://grove.place/credits" class="hover:text-accent-muted transition-colors">Credits</a>
					<span class="text-divider">·</span>
					{#each legal as link, index}
						<a href={link.href} class="hover:text-accent-muted transition-colors">{labelFor(link)}</a>
						{#if index < legal.length - 1}
							<span class="text-divider">·</span>
						{/if}
					{/each}
				</div>

				<!-- Theme Toggle + Grove Mode Toggle -->
				<div class="flex items-center gap-4">
					<!-- Grove Mode Toggle -->
					<button
						type="button"
						class="grove-mode-toggle flex items-center gap-1.5 text-xs font-sans transition-colors py-2 px-1 -my-2 -mx-1"
						class:grove-mode-active={groveModeStore.current}
						onclick={() => groveModeStore.toggle()}
						aria-label={groveModeStore.current ? 'Disable Grove Mode (show standard terms)' : 'Enable Grove Mode (show nature-themed terms)'}
						aria-pressed={groveModeStore.current}
						title={groveModeStore.current ? 'Grove Mode is on' : 'Grove Mode is off'}
					>
						<Leaf class="w-3.5 h-3.5" />
						<span>Grove Mode</span>
					</button>

					<span class="text-divider">·</span>

					<!-- Theme Toggle -->
					<div class="flex items-center gap-2">
						<span class="text-xs text-foreground-faint font-sans">Theme</span>
						<ThemeToggle />
					</div>
				</div>
			</div>
		</div>
	</div>
</footer>

<style>
	.grove-mode-toggle {
		color: var(--color-foreground-faint, #9ca3af);
		cursor: pointer;
	}

	.grove-mode-toggle:hover {
		color: var(--color-foreground-subtle, #6b7280);
	}

	.grove-mode-active {
		color: var(--color-accent, #16a34a);
	}

	.grove-mode-active:hover {
		color: var(--color-accent-muted, #15803d);
	}

	/* Focus indicator for keyboard navigation */
	.grove-mode-toggle:focus-visible {
		outline: 2px solid var(--color-accent, #16a34a);
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.grove-mode-toggle {
			transition: none;
		}
	}
</style>
