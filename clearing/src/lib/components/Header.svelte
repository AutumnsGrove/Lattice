<script lang="ts">
	/**
	 * Header - Status page navigation header
	 *
	 * Clean, minimal header with Grove branding and theme toggle.
	 */
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	import { cn } from '$lib/utils/cn';
	import { Trees, Sun, Moon, Rss } from 'lucide-svelte';

	// Extract the resolvedTheme store and toggle function
	const { resolvedTheme, toggle } = themeStore;

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<header
	class={cn(
		'sticky top-0 z-40 py-4 px-6',
		'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md',
		'border-b border-white/40 dark:border-slate-700/40',
		className
	)}
>
	<div class="max-w-4xl mx-auto flex items-center justify-between">
		<!-- Logo and title -->
		<a href="/" class="flex items-center gap-2.5 group">
			<div class="p-1.5 rounded-lg bg-grove-500/10 group-hover:bg-grove-500/20 transition-colors">
				<Trees class="w-6 h-6 text-grove-600 dark:text-grove-400" />
			</div>
			<div>
				<span class="font-semibold text-foreground">Grove</span>
				<span class="text-foreground-muted ml-1">Status</span>
			</div>
		</a>

		<!-- Actions -->
		<div class="flex items-center gap-2">
			<!-- RSS Feed link -->
			<a
				href="/feed"
				class="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
				aria-label="RSS Feed"
				title="Subscribe via RSS"
			>
				<Rss class="w-5 h-5" />
			</a>

			<!-- Theme toggle -->
			<button
				type="button"
				onclick={() => toggle()}
				class="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
				aria-label="Toggle theme"
			>
				{#if $resolvedTheme === 'dark'}
					<Sun class="w-5 h-5" />
				{:else}
					<Moon class="w-5 h-5" />
				{/if}
			</button>
		</div>
	</div>
</header>
