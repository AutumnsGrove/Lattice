<script lang="ts">
	/**
	 * Footer - Meadow page footer
	 *
	 * Minimal footer with links to main Grove site.
	 */
	import { cn } from '@autumnsgrove/groveengine/ui/utils';
	import { Trees, Mail, ExternalLink } from 'lucide-svelte';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<footer
	class={cn(
		'mt-auto py-8 px-6',
		'border-t border-white/20 dark:border-slate-700/30',
		'bg-white/30 dark:bg-slate-900/30',
		className
	)}
>
	<div class="max-w-4xl mx-auto">
		<!-- Links -->
		<div class="flex flex-wrap justify-center gap-6 mb-6 text-sm">
			<a
				href="https://grove.place"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 text-foreground-muted hover:text-foreground transition-colors"
			>
				<Trees class="w-4 h-4" />
				grove.place
				<ExternalLink class="w-3 h-3 opacity-50" />
			</a>

			<a
				href="mailto:hello@grove.place"
				class="inline-flex items-center gap-1.5 text-foreground-muted hover:text-foreground transition-colors"
			>
				<Mail class="w-4 h-4" />
				Contact
			</a>
		</div>

		<!-- Tagline -->
		<p class="text-center text-sm text-foreground-subtle">
			Where the forest opens up.
		</p>
	</div>
</footer>
