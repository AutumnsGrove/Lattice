<!--
  Fallback login page — the +page.server.ts redirect fires before this renders.
  This only appears if the server-side redirect somehow doesn't execute.
-->
<svelte:head>
	<title>Redirecting to sign in...</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-muted-foreground">Redirecting to sign in...</p>
</div>
