<script lang="ts">
	/**
	 * GroveGlassTag — Floating glassmorphic label for an island.
	 * Shows the package name and line count with smooth counter animation.
	 */

	interface Props {
		name: string;
		lines: number;
		visible: boolean;
	}

	let { name, lines, visible }: Props = $props();

	/** Format number with locale separator */
	function formatLines(n: number): string {
		return n.toLocaleString();
	}
</script>

<div
	class="pointer-events-none absolute left-1/2 -translate-x-1/2 transition-all duration-500"
	class:opacity-0={!visible}
	class:opacity-100={visible}
	class:-translate-y-2={!visible}
	class:-translate-y-6={visible}
	style:top="0"
>
	<div
		class="whitespace-nowrap rounded-lg border border-white/20 bg-white/15 px-3 py-1.5 text-center backdrop-blur-sm"
	>
		<div class="text-xs font-semibold text-bark-900 dark:text-cream-50">
			{name}
		</div>
		<div class="text-[10px] tabular-nums text-bark-700 dark:text-cream-300">
			{formatLines(lines)} lines
		</div>
	</div>
</div>
