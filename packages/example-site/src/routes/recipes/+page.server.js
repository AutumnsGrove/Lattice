import { getAllRecipes } from '$lib/utils/content.js';

export function load() {
	const recipes = getAllRecipes();
	return { recipes };
}
