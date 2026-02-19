<!--
  Compose Page (Full-Page)

  Full-page compose view for mobile.
  Desktop uses the modal version.
-->
<script lang="ts">
	import { goto } from "$app/navigation";

	// TODO: Compose form logic
	// TODO: Send handler

	function handleSend() {
		// TODO: Encrypt and queue email
		goto("/inbox");
	}

	function handleDiscard() {
		// TODO: Confirm discard
		goto("/inbox");
	}
</script>

<svelte:head>
	<title>Compose - Ivy</title>
</svelte:head>

<div class="compose-page">
	<header>
		<button on:click={handleDiscard}>Cancel</button>
		<h1>New Message</h1>
		<button on:click={handleSend}>Send</button>
	</header>

	<form class="compose-form">
		<div class="field">
			<label for="to">To</label>
			<input type="email" id="to" placeholder="recipient@example.com" />
		</div>

		<div class="field">
			<label for="subject">Subject</label>
			<input type="text" id="subject" placeholder="Subject" />
		</div>

		<div class="field body">
			<!-- TODO: Rich text editor -->
			<textarea placeholder="Write your message..."></textarea>
		</div>

		<div class="attachments">
			<!-- TODO: Attachment list and upload -->
		</div>
	</form>
</div>

<style>
	.compose-page {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.compose-form {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
	}

	.field {
		margin-bottom: 1rem;
	}

	.field.body {
		flex: 1;
	}

	textarea {
		width: 100%;
		height: 100%;
		border: none;
		resize: none;
	}
</style>
