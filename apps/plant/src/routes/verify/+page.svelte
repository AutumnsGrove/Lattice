<!--
  Human verification for Plant (Shade)

  Shown once per browser, before the signup forms. The cookie it earns is the
  same `grove_verified` cookie Aspen uses, so a human who has already solved a
  challenge on their own blog is not asked again here.
-->
<script lang="ts">
	import TurnstileWidget from "@autumnsgrove/lattice/ui/components/forms/TurnstileWidget.svelte";

	interface Props {
		data: { siteKey: string; returnTo: string };
	}

	let { data }: Props = $props();

	let status: "waiting" | "verifying" | "success" | "error" = $state("waiting");
	let errorMessage = $state("");

	async function handleVerification(token: string) {
		status = "verifying";
		try {
			const response = await fetch("/api/verify/turnstile", {
				// csrf-ok — verification runs before anyone is signed in
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});

			if (response.ok) {
				status = "success";
				// Hard redirect: a soft navigation would not pick up the new cookie.
				setTimeout(() => {
					window.location.href = data.returnTo;
				}, 500);
				return;
			}

			const result = (await response.json()) as { message?: string };
			status = "error";
			errorMessage = result.message ?? "Verification failed. Please try again.";
		} catch {
			status = "error";
			errorMessage = "We couldn't reach the verification service.";
		}
	}
</script>

<svelte:head>
	<title>One quick check · Grove</title>
</svelte:head>

<main class="verify">
	<h1>One quick check</h1>
	<p class="lede">
		We ask everyone once, to keep the garden free of the things that write themselves.
	</p>

	{#if status === "success"}
		<p class="note">Thank you — taking you onward.</p>
	{:else if status === "error"}
		<p class="error">{errorMessage}</p>
	{/if}

	<div class="widget">
		<TurnstileWidget siteKey={data.siteKey} onverify={handleVerification} />
	</div>

	{#if status === "verifying"}
		<p class="note">Checking…</p>
	{/if}
</main>

<style>
	.verify {
		max-width: 32rem;
		margin: 4rem auto;
		padding: 0 1.5rem;
		text-align: center;
	}
	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.75rem;
	}
	.lede {
		color: #52605a;
		line-height: 1.6;
		margin-bottom: 2rem;
	}
	.widget {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
	.note {
		color: #52605a;
	}
	.error {
		color: #9c3b3b;
	}
</style>
