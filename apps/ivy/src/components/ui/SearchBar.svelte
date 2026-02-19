<!--
  Search Bar Component

  Client-side search across decrypted emails.
-->
<script lang="ts">
	import { searchQuery } from "$lib/stores";

	let inputValue = "";

	function handleSearch() {
		$searchQuery = inputValue;
		// TODO: Trigger client-side search in IndexedDB
	}

	function handleClear() {
		inputValue = "";
		$searchQuery = "";
	}
</script>

<div class="search-bar">
	<input
		type="search"
		bind:value={inputValue}
		placeholder="Search emails..."
		on:keydown={(e) => e.key === "Enter" && handleSearch()}
	/>
	{#if inputValue}
		<button class="clear" on:click={handleClear}>×</button>
	{/if}
	<button class="search" on:click={handleSearch}>Search</button>
</div>

<style>
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f5f5f5;
		border-radius: 4px;
	}

	input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-size: 1rem;
	}

	.clear {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.25rem;
		color: #666;
	}

	.search {
		background: #1976d2;
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
