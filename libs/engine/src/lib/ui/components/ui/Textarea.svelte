<script lang="ts">
	import { Textarea as ShadcnTextarea } from "$lib/ui/components/primitives/textarea";
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * Textarea component wrapper with label, error handling, and validation
	 *
	 * @prop {string} [label] - Textarea label text (renders above textarea)
	 * @prop {string} [error] - Error message to display (turns border red)
	 * @prop {string} [value] - Textarea value (bindable for two-way binding)
	 * @prop {string} [placeholder] - Placeholder text
	 * @prop {number} [rows] - Number of visible text rows
	 * @prop {boolean} [required=false] - Whether textarea is required (shows asterisk)
	 * @prop {boolean} [disabled=false] - Whether textarea is disabled
	 * @prop {string} [class] - Additional CSS classes to apply
	 * @prop {string} [id] - Textarea ID for label association (auto-generated if not provided)
	 *
	 * @example
	 * <Textarea label="Description" bind:value={description} required />
	 *
	 * @example
	 * <Textarea label="Notes" bind:value={notes} rows={5} error={notesError} />
	 *
	 * @example
	 * <Textarea placeholder="Enter your message..." bind:value={message} />
	 */
	interface Props extends Omit<HTMLTextareaAttributes, "class"> {
		label?: string;
		error?: string;
		value?: string;
		placeholder?: string;
		rows?: number;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		id?: string;
	}

	// svelte-ignore custom_element_props_identifier
	let {
		label,
		error,
		value = $bindable(""),
		placeholder,
		rows,
		required = false,
		disabled = false,
		class: className,
		id,
		...restProps
	}: Props = $props();

	// Generate unique ID for label association if not provided
	// svelte-ignore state_referenced_locally
	const textareaId = id ?? `textarea-${crypto.randomUUID()}`;

	const textareaClass = $derived(
		cn(error && "border-destructive focus-visible:ring-destructive/20", className),
	);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label
			for={textareaId}
			class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			{label}
			{#if required}
				<span class="text-destructive">*</span>
			{/if}
		</label>
	{/if}

	<ShadcnTextarea
		id={textareaId}
		bind:value
		{placeholder}
		{rows}
		{required}
		{disabled}
		class={textareaClass}
		{...restProps}
	/>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
