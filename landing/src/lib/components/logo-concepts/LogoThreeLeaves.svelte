<!--
  Grove Logo Concept 7: Three Leaves
  Three leaves arranged in a gentle spiral/cluster
  Evokes: Growth, renewal, community of individuals
-->
<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor'
	}: Props = $props();
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 32 32"
>
	<!-- Three leaf shapes rotating around a center point -->

	<!-- Leaf 1 - pointing up-left -->
	<path
		d="M16 16
		   Q10 14, 8 8
		   Q10 6, 14 8
		   Q16 12, 16 16"
		fill={color}
	/>

	<!-- Leaf 2 - pointing up-right -->
	<path
		d="M16 16
		   Q22 14, 24 8
		   Q22 6, 18 8
		   Q16 12, 16 16"
		fill={color}
	/>

	<!-- Leaf 3 - pointing down -->
	<path
		d="M16 16
		   Q14 22, 16 28
		   Q18 26, 18 22
		   Q16 18, 16 16"
		fill={color}
	/>

	<!-- Central circle - the heart/seed -->
	<circle cx="16" cy="16" r="2.5" fill={color} />
</svg>
