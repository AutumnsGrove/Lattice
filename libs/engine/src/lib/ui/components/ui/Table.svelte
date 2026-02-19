<script lang="ts">
	import {
		Table as ShadcnTable,
		TableHeader,
		TableBody,
		TableRow,
		TableCell
	} from "$lib/ui/components/primitives/table";
	import type { Snippet } from "svelte";

	/**
	 * Table component wrapper providing simple table layout
	 * Note: This is a basic wrapper - use TableHeader, TableBody, TableRow, TableCell from shadcn directly
	 *
	 * @prop {string} [class] - Additional CSS classes for table
	 * @prop {Snippet} [children] - Table content (typically TableHeader and TableBody)
	 *
	 * @example
	 * <Table>
	 *   <TableHeader>
	 *     <TableRow>
	 *       <TableCell>Name</TableCell>
	 *       <TableCell>Email</TableCell>
	 *     </TableRow>
	 *   </TableHeader>
	 *   <TableBody>
	 *     <TableRow>
	 *       <TableCell>John</TableCell>
	 *       <TableCell>john@example.com</TableCell>
	 *     </TableRow>
	 *   </TableBody>
	 * </Table>
	 *
	 * @example
	 * <Table class="w-full">
	 *   {#each users as user}
	 *     <TableRow>
	 *       <TableCell>{user.name}</TableCell>
	 *       <TableCell>{user.email}</TableCell>
	 *     </TableRow>
	 *   {/each}
	 * </Table>
	 *
	 * @example
	 * import { Table, TableHeader, TableBody, TableRow, TableCell } from "$lib/components/ui";
	 */
	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<ShadcnTable class={className}>
	{#if children}
		{@render children()}
	{/if}
</ShadcnTable>
