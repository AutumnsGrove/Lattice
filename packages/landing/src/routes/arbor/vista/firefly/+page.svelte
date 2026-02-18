<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/groveengine/ui";
	import { Flame } from "lucide-svelte";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Firefly — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Firefly</h1>
	<p class="text-foreground-muted font-sans mt-1">Queen Firefly — ephemeral server management</p>
</div>

<GlassCard class="p-10 text-center">
	<Flame class="w-14 h-14 mx-auto mb-4 text-foreground/20" />
	<p class="text-lg font-serif text-foreground mb-2">Queen Firefly is still in the workshop</p>
	<p class="text-sm font-sans text-foreground-muted max-w-md mx-auto">
		Her metrics will appear here once she's deployed. Grove's ephemeral server system is coming —
		runners, sessions, and pool health will all show up on this page.
	</p>
</GlassCard>
