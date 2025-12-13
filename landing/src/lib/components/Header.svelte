<script lang="ts">
	import { page } from '$app/stores';

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
		<a href="/" class="text-xl font-serif text-foreground hover:text-accent-muted transition-colors">
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
		</nav>
	</div>
</header>
