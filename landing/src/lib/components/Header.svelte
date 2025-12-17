<script lang="ts">
	import { page } from '$app/stores';
	import Logo from './Logo.svelte';

	// Determine current page for highlighting
	let currentPath = $derived($page.url.pathname);

	interface Props {
		maxWidth?: 'narrow' | 'default' | 'wide';
	}

	let { maxWidth = 'default' }: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-3xl',
		wide: 'max-w-4xl'
	};
</script>

<header class="py-6 px-6 border-b border-default">
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<a href="/" class="flex items-center gap-2 text-xl font-serif text-foreground hover:text-accent-muted transition-colors">
			<Logo class="w-6 h-6" color="#16a34a" trunkColor="#6B4423" />
			Grove
		</a>
		<nav class="flex items-center gap-6 text-sm font-sans">
			<a
				href="/vision"
				class="transition-colors {currentPath === '/vision' ? 'text-accent-muted' : 'text-foreground-subtle hover:text-accent-muted'}"
			>
				Vision
			</a>
			<a
				href="/pricing"
				class="transition-colors {currentPath === '/pricing' ? 'text-accent-muted' : 'text-foreground-subtle hover:text-accent-muted'}"
			>
				Pricing
			</a>
			<a
				href="/legal"
				class="transition-colors {currentPath.startsWith('/legal') ? 'text-accent-muted' : 'text-foreground-subtle hover:text-accent-muted'}"
			>
				Legal
			</a>
			<a
				href="/credits"
				class="transition-colors {currentPath === '/credits' ? 'text-accent-muted' : 'text-foreground-subtle hover:text-accent-muted'}"
			>
				Credits
			</a>
		</nav>
	</div>
</header>
