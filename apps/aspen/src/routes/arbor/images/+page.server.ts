import type { PageServerLoad } from "./$types";
import { canUploadImages } from "@autumnsgrove/lattice/server/upload-gate";
import { buildUploadAccessRequestUrl } from "@autumnsgrove/lattice/platform/config/porch";

/**
 * Two things this page needs and the Arbor layout cannot know:
 *
 * 1. **Whether uploads are actually on.** The banner used to key off the
 *    `image_uploads` graft alone, but the real gate is `image_uploads &&
 *    !uploads_suspended` (`upload-gate.ts`), and `uploads_suspended` defaults to
 *    true. A grove with the graft on and uploads suspended saw no banner at all
 *    and just collected 403s (#1626). One answer, asked once, from the same
 *    function the upload endpoint uses.
 * 2. **Where to ask, if they are not.** There is now a next step instead of a
 *    dead end, and it is built in exactly one place (`buildUploadAccessRequestUrl`)
 *    so this banner, the gallery and the editor ask the same question.
 */
export const load: PageServerLoad = async ({ locals, platform }) => {
	const db = platform?.env?.DB;
	const kv = platform?.env?.CACHE_KV;
	const tenantId = locals.tenantId;

	const flagsEnv = db && kv ? { DB: db, FLAGS_KV: kv } : null;
	const gate =
		flagsEnv && tenantId ? await canUploadImages(tenantId, locals.user?.id, flagsEnv) : null;

	const tenant = locals.context.type === "tenant" ? locals.context.tenant : null;

	return {
		/** `null` when the gate could not be evaluated — leave the banner alone rather than lie. */
		uploadsAllowed: gate ? gate.allowed : null,
		uploadAccessUrl: tenant
			? buildUploadAccessRequestUrl({
					subdomain: tenant.subdomain,
					name: locals.user?.name,
					email: locals.user?.email,
				})
			: null,
	};
};
