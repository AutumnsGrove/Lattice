<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Vineyard - Grove Documentation System</title>
	<meta name="description" content="Explore Grove tools through interactive demos and documentation" />
</svelte:head>

{@render children()}
