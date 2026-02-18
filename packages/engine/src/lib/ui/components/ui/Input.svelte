<script lang="ts">
	import { Input as ShadcnInput } from "$lib/ui/components/primitives/input";
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * Input component wrapper with label, error handling, and validation
	 *
	 * @prop {string} [label] - Input label text (renders above input)
	 * @prop {string} [error] - Error message to display (turns border red)
	 * @prop {string|number} [value] - Input value (bindable for two-way binding)
	 * @prop {string} [placeholder] - Placeholder text
	 * @prop {string} [type="text"] - Input type (text|email|password|number)
	 * @prop {boolean} [required=false] - Whether input is required (shows asterisk)
	 * @prop {boolean} [disabled=false] - Whether input is disabled
	 * @prop {string} [class] - Additional CSS classes to apply
	 * @prop {string} [id] - Input ID for label association (auto-generated if not provided)
	 * @prop {HTMLInputElement} [ref] - Reference to the underlying input element (bindable)
	 *
	 * @example
	 * <Input label="Email" type="email" bind:value={email} required />
	 *
	 * @example
	 * <Input label="Password" type="password" bind:value={password} error={passwordError} />
	 *
	 * @example
	 * <Input placeholder="Search..." bind:value={searchQuery} />
	 */
	interface Props extends Omit<HTMLInputAttributes, "class" | "files"> {
		label?: string;
		error?: string;
		value?: string | number;
		placeholder?: string;
		type?: "text" | "email" | "password" | "number";
		required?: boolean;
		disabled?: boolean;
		class?: string;
		id?: string;
		ref?: HTMLInputElement | null;
	}

	// svelte-ignore custom_element_props_identifier
	let {
		label,
		error,
		value = $bindable(""),
		placeholder,
		type = "text",
		required = false,
		disabled = false,
		class: className,
		id,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// Generate unique ID for label association if not provided
	// svelte-ignore state_referenced_locally
	const inputId = id ?? `input-${crypto.randomUUID()}`;

	const inputClass = $derived(
		cn(error && "border-destructive focus-visible:ring-destructive/20", className),
	);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label
			for={inputId}
			class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			{label}
			{#if required}
				<span class="text-destructive">*</span>
			{/if}
		</label>
	{/if}

	<!-- @ts-expect-error restProps may include files:null which ShadcnInput expects as undefined -->
	<ShadcnInput
		id={inputId}
		bind:ref
		bind:value
		{type}
		{placeholder}
		{required}
		{disabled}
		class={inputClass}
		{...restProps}
	/>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
