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
		<a href="/" class="flex items-center gap-2 text-xl font-serif text-foreground hover:text-accent-muted transition-colors">
			<svg
				class="w-6 h-6"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 417 512.238"
				fill="currentColor"
			>
				<path d="M171.274 344.942h74.09v167.296h-74.09V344.942zM0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
			</svg>
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
