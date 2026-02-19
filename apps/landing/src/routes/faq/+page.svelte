<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { FaqPage } from '@autumnsgrove/lattice/ui';

	let { data } = $props();
</script>

<SEO
	title="FAQ — Grove"
	description="Frequently asked questions about Grove — your cozy blog platform away from big tech."
	url="/faq"
/>

<Header user={data.user} />

<main class="min-h-screen">
	<FaqPage />
</main>

<Footer />
