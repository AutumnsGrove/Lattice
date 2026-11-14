import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;

	let curiosCount = 0;

	if (env?.DB && locals.tenantId) {
		const [timelineCurio, galleryCurio] = await Promise.all([
			env.DB.prepare("SELECT enabled FROM timeline_curio_config WHERE tenant_id = ?")
				.bind(locals.tenantId)
				.first<{ enabled: number }>()
				.catch(() => null),
			env.DB.prepare("SELECT enabled FROM gallery_curio_config WHERE tenant_id = ?")
				.bind(locals.tenantId)
				.first<{ enabled: number }>()
				.catch(() => null),
		]);

		curiosCount = (timelineCurio?.enabled === 1 ? 1 : 0) + (galleryCurio?.enabled === 1 ? 1 : 0);
	}

	return { curiosCount };
};
