<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
	import { Monitor } from 'lucide-svelte';
	import Terrarium from '$lib/ui/components/terrarium/Terrarium.svelte';

	let isMobileViewport = $state(false);

	// Setup viewport check with resize listener
	$effect(() => {
		const checkViewport = () => {
			isMobileViewport = window.innerWidth < 768;
		};

		checkViewport();
		window.addEventListener('resize', checkViewport);

		return () => {
			window.removeEventListener('resize', checkViewport);
		};
	});
</script>

<svelte:head>
	<title>Terrarium — Grove</title>
</svelte:head>

{#if isMobileViewport}
	<div class="flex flex-col items-center justify-center min-h-screen p-6 text-center">
		<Monitor class="w-16 h-16 text-grove-400 mb-4" />
		<h1 class="text-2xl font-semibold text-grove-700 dark:text-grove-300 mb-2">
			Terrarium works best on larger screens
		</h1>
		<p class="text-grove-600 dark:text-grove-400 mb-6">
			For the best creative experience, please use a tablet or desktop.
		</p>
		<a href="/" class="text-grove-600 hover:text-grove-800 dark:hover:text-grove-200 underline">
			Return home
		</a>
	</div>
{:else}
	<Terrarium />
{/if}
