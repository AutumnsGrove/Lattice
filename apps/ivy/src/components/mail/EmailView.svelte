<!--
  Email View Component

  Displays a single email message.
  HTML content is sanitized and rendered in a sandboxed iframe.
-->
<script lang="ts">
	import type { DecryptedEmail } from "$lib/types";

	export let email: DecryptedEmail;

	// TODO: Implement DOMPurify sanitization
	// TODO: Render in sandboxed iframe
</script>

<article class="email-view">
	<header class="email-header">
		<div class="from">{email.from}</div>
		<div class="to">To: {email.to.join(", ")}</div>
		<div class="date">{email.date}</div>
	</header>

	<div class="email-body">
		<!-- TODO: Sandboxed iframe with sanitized HTML -->
		<p>{email.textBody || "No content"}</p>
	</div>

	{#if email.attachments.length > 0}
		<div class="attachments">
			<h4>Attachments</h4>
			<ul>
				{#each email.attachments as attachment}
					<li>
						<button>{attachment.filename} ({attachment.size} bytes)</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</article>

<style>
	.email-view {
		padding: 1rem;
	}

	.email-header {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.from {
		font-weight: 600;
	}

	.to,
	.date {
		color: #666;
		font-size: 0.875rem;
	}

	.email-body {
		line-height: 1.6;
	}

	.attachments {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
	}
</style>
