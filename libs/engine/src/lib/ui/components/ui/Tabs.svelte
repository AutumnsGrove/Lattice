<script lang="ts">
	import {
		Tabs as ShadcnTabs,
		TabsContent,
		TabsList,
		TabsTrigger
	} from "$lib/ui/components/primitives/tabs";
	import type { Snippet } from "svelte";

	interface Tab {
		value: string;
		label: string;
		disabled?: boolean;
	}

	/**
	 * Tabs component wrapper for organizing content into switchable panels
	 *
	 * @prop {string} [value] - Active tab value (bindable for two-way binding, defaults to first tab)
	 * @prop {Tab[]} tabs - Array of tabs with value, label, and optional disabled flag
	 * @prop {Snippet<[Tab]>} [content] - Snippet to render content for each tab (receives tab data)
	 * @prop {Snippet} [children] - Alternative content rendering (same for all tabs)
	 * @prop {string} [class] - Additional CSS classes for Tabs root
	 *
	 * @example
	 * <Tabs bind:value={activeTab} tabs={[
	 *   { value: "overview", label: "Overview" },
	 *   { value: "settings", label: "Settings" }
	 * ]} content={(tab) => <p>Content for {tab.label}</p>} />
	 *
	 * @example
	 * <Tabs tabs={profileTabs}>
	 *   {#snippet content(tab)}
	 *     <ProfileSection section={tab.value} />
	 *   {/snippet}
	 * </Tabs>
	 *
	 * @example
	 * <Tabs bind:value={view} tabs={dashboardTabs} class="w-full" />
	 */
	interface Props {
		value?: string | undefined;
		tabs: Tab[];
		content?: Snippet<[tab: Tab]>;
		class?: string;
		children?: Snippet;
	}

	let {
		tabs,
		value = $bindable(tabs[0]?.value ?? ""),
		content,
		class: className,
		children
	}: Props = $props();
</script>

<ShadcnTabs bind:value class={className}>
	<TabsList>
		{#each tabs as tab (tab.value)}
			<TabsTrigger value={tab.value} disabled={tab.disabled ?? false}>
				{tab.label}
			</TabsTrigger>
		{/each}
	</TabsList>

	{#each tabs as tab (tab.value)}
		<TabsContent value={tab.value}>
			{#if content}
				{@render content(tab)}
			{:else if children}
				{@render children()}
			{/if}
		</TabsContent>
	{/each}
</ShadcnTabs>
