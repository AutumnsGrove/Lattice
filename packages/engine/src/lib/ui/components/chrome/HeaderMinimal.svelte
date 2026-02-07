<script lang="ts">
	/**
	 * Header - Status page navigation header
	 *
	 * Clean, minimal header with Grove branding and theme toggle.
	 */
	import { Trees, Sun, Moon, Rss } from 'lucide-svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		brandTitle?: string;
		subtitle?: string;
		maxWidth?: 'narrow' | 'default' | 'wide';
	}

	let {
		class: className,
		brandTitle = 'Grove',
		subtitle = 'Status',
		maxWidth = 'default'
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};
</script>

<header
	class={cn(
		'sticky top-0 z-grove-sticky py-4 px-6',
		'bg-white/80 dark:bg-bark-900/60 backdrop-blur-md',
		'border-b border-white/40 dark:border-bark-700/40',
		className
	)}
>
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo and title -->
		<a href="/" class="flex items-center gap-2.5 group">
			<div class="p-1.5 rounded-lg bg-grove-500/10 group-hover:bg-grove-500/20 transition-colors">
				<Trees class="w-6 h-6 text-grove-600 dark:text-grove-400" />
			</div>
			<div>
				<span class="font-semibold text-foreground">{brandTitle}</span>
				<span class="text-foreground-muted ml-1">{subtitle}</span>
			</div>
		</a>

		<!-- Actions -->
		<div class="flex items-center gap-2">
			<!-- RSS Feed link -->
			<a
				href="/feed"
				class="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-cream-200/50 dark:hover:bg-bark-800/50 transition-colors"
				aria-label="RSS Feed"
				title="Subscribe via RSS"
			>
				<Rss class="w-5 h-5" />
			</a>

			<!-- Theme toggle -->
			<ThemeToggle />
		</div>
	</div>
</header>