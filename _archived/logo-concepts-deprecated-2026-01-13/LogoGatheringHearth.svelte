<!--
  Grove Logo: The Gathering
  TreePine + TreeDeciduous leaning toward Flame + Heart
  Evokes: "Different trees, same fire. Love in the gathering."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Gathering
	 * Composed from Lucide: TreePine, TreeDeciduous, Flame
	 */
	interface Props {
		class?: string;
		color?: string;
		fireColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		fireColor,
		title
	}: Props = $props();

	const fire = $derived(fireColor ?? '#f97316');

	// Lucide icon paths
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	const treeDeciduous = {
		canopy: 'M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z',
		trunk: 'M12 19v3'
	};

	const flame = 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4';
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 48 32"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Left TreePine (angled slightly toward center) -->
	<g transform="translate(0, 2) scale(0.8) rotate(5, 12, 22)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right TreeDeciduous (angled toward center) -->
	<g transform="translate(28, 4) scale(0.7) rotate(-5, 12, 22)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Fire glow -->
	<circle cx="24" cy="24" r="5" fill={fire} opacity="0.2" />

	<!-- Lucide Flame (centered at bottom) -->
	<g transform="translate(18, 16) scale(0.5)" stroke={fire} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d={flame} />
	</g>

	<!-- Ground -->
	<path d="M4 28h40" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
