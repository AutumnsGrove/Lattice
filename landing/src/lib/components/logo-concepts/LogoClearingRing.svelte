<!--
  Grove Logo Concept 1: The Clearing Ring
  Three organic curved strokes forming a sheltered ring shape
  Evokes: A clearing in the forest, paths meeting, open welcoming space
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
	fill="none"
>
	<!-- Three organic curved strokes creating a ring/clearing -->
	<!-- Top curve - arching branch -->
	<path
		d="M8 10 Q16 4, 24 10"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
	<!-- Bottom-left curve -->
	<path
		d="M6 14 Q4 22, 12 26"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
	<!-- Bottom-right curve -->
	<path
		d="M26 14 Q28 22, 20 26"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
	<!-- Small central dot - the heart of the clearing -->
	<circle cx="16" cy="16" r="2" fill={color} />
</svg>
