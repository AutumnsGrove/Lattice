import type { PageServerLoad } from './$types';

interface Visit {
	id: string;
	visit_number: string;
	category: string;
	subject: string;
	status: string;
	created_at: number;
	updated_at: number;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		return {
			user: null,
			visits: [],
		};
	}

	let visits: Visit[] = [];

	if (platform?.env?.DB) {
		try {
			const result = await platform.env.DB.prepare(
				`SELECT id, visit_number, category, subject, status, created_at, updated_at
				 FROM porch_visits
				 WHERE user_id = ?
				 ORDER BY created_at DESC
				 LIMIT 50`
			)
				.bind(locals.user.id)
				.all<Visit>();

			visits = result.results || [];
		} catch (err) {
			console.error('Failed to load visits:', err);
		}
	}

	return {
		user: locals.user,
		visits,
	};
};
