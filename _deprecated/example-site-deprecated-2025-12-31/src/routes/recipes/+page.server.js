import { getAllRecipes } from '$lib/data/static-content.js';

export function load() {
	const recipes = getAllRecipes();
	return { recipes };
}
