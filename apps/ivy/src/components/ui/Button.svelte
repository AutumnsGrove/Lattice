<!--
  Button Component

  Reusable button with variants.
-->
<script lang="ts">
	export let variant: "primary" | "secondary" | "danger" | "ghost" = "secondary";
	export let size: "sm" | "md" | "lg" = "md";
	export let disabled = false;
	export let type: "button" | "submit" | "reset" = "button";
</script>

<button class="btn {variant} {size}" {type} {disabled} on:click>
	<slot />
</button>

<style>
	.btn {
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Sizes */
	.sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
	}
	.md {
		padding: 0.5rem 1rem;
		font-size: 1rem;
	}
	.lg {
		padding: 0.75rem 1.5rem;
		font-size: 1.125rem;
	}

	/* Variants */
	.primary {
		background: #1976d2;
		color: white;
	}
	.primary:hover:not(:disabled) {
		background: #1565c0;
	}

	.secondary {
		background: #e0e0e0;
		color: #333;
	}
	.secondary:hover:not(:disabled) {
		background: #d0d0d0;
	}

	.danger {
		background: #d32f2f;
		color: white;
	}
	.danger:hover:not(:disabled) {
		background: #c62828;
	}

	.ghost {
		background: transparent;
		color: #333;
	}
	.ghost:hover:not(:disabled) {
		background: #f5f5f5;
	}
</style>
