import { error } from '@sveltejs/kit';
import { getRecipe } from '$lib/utils/content.js';

export function load({ params }) {
	const recipe = getRecipe(params.slug);

	if (!recipe) {
		throw error(404, 'Recipe not found');
	}

	return { recipe };
}
