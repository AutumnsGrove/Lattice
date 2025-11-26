<script>
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
