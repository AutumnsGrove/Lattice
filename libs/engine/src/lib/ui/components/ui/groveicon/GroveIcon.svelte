<script lang="ts">
	import type { GroveIconSuite } from "./types";
	import { defaultSuite } from "./manifest";
	import { resolveIcon } from "./resolver";

	// GroveIcon - Manifest-driven service icon swap component
	//
	// Renders the canonical icon for a Grove service by looking up
	// the service slug in the active icon suite manifest.
	//
	// Usage:
	//   <GroveIcon service="arbor" class="w-5 h-5" />
	//   <GroveIcon service="lumen" size={24} />
	//   <GroveIcon service="heartwood" suite={customSuite} class="text-amber-500" />

	interface Props {
		/** Service slug to look up (e.g., "arbor", "lumen", "heartwood") */
		service: string;
		/** Icon suite to use (defaults to the default suite) */
		suite?: GroveIconSuite;
		/** CSS classes passed to the icon component */
		class?: string;
		/** Icon size in pixels */
		size?: number | string;
		/** Stroke width */
		strokeWidth?: number | string;
		/** Icon color */
		color?: string;
	}

	let {
		service,
		suite = defaultSuite,
		class: className = "",
		size,
		strokeWidth,
		color,
	}: Props = $props();

	const entry = $derived(suite[service]);
	const Icon = $derived(entry ? resolveIcon(entry.icon) : resolveIcon("HelpCircle"));
</script>

<Icon class={className} {size} {strokeWidth} {color} aria-hidden="true" />
