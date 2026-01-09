<script lang="ts">
	// @ts-nocheck - Select wrapper with single-select mode using string instead of string[]
	import {
		Select as ShadcnSelect,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from "$lib/ui/components/primitives/select";
	import type { Snippet } from "svelte";

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	/**
	 * Select component wrapper providing dropdown selection with options
	 *
	 * @prop {string} [value] - Selected value (bindable for two-way binding)
	 * @prop {Option[]} options - Array of options with value, label, and optional disabled flag
	 * @prop {string} [placeholder="Select an option"] - Placeholder text when no value selected
	 * @prop {boolean} [disabled=false] - Whether select is disabled
	 * @prop {string} [class] - Additional CSS classes for trigger element
	 *
	 * @example
	 * <Select bind:value={selectedValue} options={[
	 *   { value: "opt1", label: "Option 1" },
	 *   { value: "opt2", label: "Option 2", disabled: true }
	 * ]} />
	 *
	 * @example
	 * <Select bind:value={theme} placeholder="Choose theme" options={themeOptions} />
	 *
	 * @example
	 * <Select bind:value={country} options={countries} disabled={loading} />
	 */
	interface Props {
		value?: string | undefined;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	}

	let {
		value = $bindable(undefined),
		options,
		placeholder = "Select an option",
		disabled = false,
		class: className
	}: Props = $props();

	const selectedLabel = $derived(
		value ? options.find(opt => opt.value === value)?.label ?? placeholder : placeholder
	);
</script>

<!-- @ts-expect-error ShadcnSelect expects string[] for multi-select but we use string for single-select -->
<ShadcnSelect bind:value {disabled}>
	<SelectTrigger class={className}>
		{selectedLabel}
	</SelectTrigger>
	<SelectContent>
		{#each options as option (option.value)}
			<SelectItem value={option.value} disabled={option.disabled ?? false}>
				{option.label}
			</SelectItem>
		{/each}
	</SelectContent>
</ShadcnSelect>
