<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		Home,
		Info,
		Telescope,
		CreditCard,
		BookOpen,
		Trees,
		Map,
		PenLine,
		Scale,
		Heart,
		X
	} from 'lucide-svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();

	let currentPath = $derived($page.url.pathname);

	// References for focus management
	let closeButtonRef: HTMLButtonElement | undefined = $state();
	let menuPanelRef: HTMLDivElement | undefined = $state();
	let previouslyFocusedElement: HTMLElement | null = null;

	// Close on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			onClose();
		}

		// Focus trap: Tab key cycles within menu
		if (event.key === 'Tab' && open && menuPanelRef) {
			const focusableElements = menuPanelRef.querySelectorAll<HTMLElement>(
				'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				// Shift+Tab on first element: wrap to last
				event.preventDefault();
				lastElement?.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				// Tab on last element: wrap to first
				event.preventDefault();
				firstElement?.focus();
			}
		}
	}

	// Focus management when menu opens/closes
	$effect(() => {
		if (open) {
			// Store the previously focused element to restore later
			previouslyFocusedElement = document.activeElement as HTMLElement;
			// Focus the close button when menu opens
			requestAnimationFrame(() => {
				closeButtonRef?.focus();
			});
		} else if (previouslyFocusedElement) {
			// Restore focus when menu closes
			previouslyFocusedElement.focus();
			previouslyFocusedElement = null;
		}
	});

	// Navigation items with icons
	type NavItem = {
		href: string;
		label: string;
		icon: typeof Home;
		external?: boolean;
	};

	const navItems: NavItem[] = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/about', label: 'About', icon: Info },
		{ href: '/vision', label: 'Vision', icon: Telescope },
		{ href: '/roadmap', label: 'Roadmap', icon: Map },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/knowledge', label: 'Knowledge', icon: BookOpen },
		{ href: '/forest', label: 'Forest', icon: Trees },
		{ href: 'https://autumnsgrove.com/blog', label: 'Blog', icon: PenLine, external: true },
		{ href: '/legal', label: 'Legal', icon: Scale },
		{ href: '/credits', label: 'Credits', icon: Heart }
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
{#if open}
	<button
		type="button"
		class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity"
		onclick={onClose}
		aria-label="Close menu"
	></button>
{/if}

<!-- Slide-out panel -->
<div
	bind:this={menuPanelRef}
	class="fixed top-0 right-0 z-[70] h-full w-64 transform bg-surface border-l border-default shadow-xl transition-transform duration-300 ease-out {open
		? 'translate-x-0'
		: 'translate-x-full'}"
	role="dialog"
	aria-modal="true"
	aria-label="Navigation menu"
	aria-hidden={!open}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-default">
		<span class="text-sm font-medium text-foreground-subtle">Menu</span>
		<button
			bind:this={closeButtonRef}
			type="button"
			onclick={onClose}
			class="p-2 -mr-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
			aria-label="Close menu"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="p-2">
		{#each navItems as item}
			{@const Icon = item.icon}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noopener noreferrer' : undefined}
				onclick={onClose}
				class="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
					{active
					? 'bg-accent/10 text-accent-muted'
					: 'text-foreground hover:bg-surface-hover hover:text-accent-muted'}"
			>
				<Icon class="w-5 h-5 flex-shrink-0" />
				<span class="text-sm font-medium">{item.label}</span>
				{#if item.external}
					<span class="text-xs text-foreground-subtle ml-auto">External</span>
				{/if}
			</a>
		{/each}
	</nav>
</div>
