<!--
  Compose Modal Component

  Gmail-style overlay modal for composing emails.
-->
<script lang="ts">
	import { isComposing } from "$lib/stores";

	export let replyTo: string | null = null;
	export let subject: string = "";

	let to = replyTo || "";
	let body = "";
	let attachments: File[] = [];

	function handleSend() {
		// TODO: Validate fields
		// TODO: Encrypt and queue email
		// TODO: Close modal
		$isComposing = false;
	}

	function handleDiscard() {
		// TODO: Confirm if content exists
		$isComposing = false;
	}

	function handleAttach(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			attachments = [...attachments, ...Array.from(input.files)];
		}
	}
</script>

{#if $isComposing}
	<div class="modal-overlay">
		<div class="compose-modal">
			<header>
				<h2>New Message</h2>
				<button class="close" on:click={handleDiscard}>×</button>
			</header>

			<form on:submit|preventDefault={handleSend}>
				<div class="field">
					<input type="email" bind:value={to} placeholder="To" required />
				</div>

				<div class="field">
					<input type="text" bind:value={subject} placeholder="Subject" />
				</div>

				<div class="field body">
					<!-- TODO: Rich text editor -->
					<textarea bind:value={body} placeholder="Write your message..."></textarea>
				</div>

				<footer>
					<div class="attachments">
						<input type="file" multiple on:change={handleAttach} />
						{#if attachments.length > 0}
							<span>{attachments.length} file(s) attached</span>
						{/if}
					</div>

					<div class="actions">
						<button type="button" on:click={handleDiscard}>Discard</button>
						<button type="submit" class="primary">Send</button>
					</div>
				</footer>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		padding: 1rem;
	}

	.compose-modal {
		background: white;
		border-radius: 8px 8px 0 0;
		width: 500px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #f5f5f5;
		border-radius: 8px 8px 0 0;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	.close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
	}

	form {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.field {
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.field input,
	.field textarea {
		width: 100%;
		border: none;
		outline: none;
	}

	.field.body {
		flex: 1;
	}

	textarea {
		height: 200px;
		resize: none;
	}

	footer {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-top: 1px solid #e0e0e0;
	}

	.primary {
		background: #1976d2;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
