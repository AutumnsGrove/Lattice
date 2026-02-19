// Update Search Configuration
// POST /api/config

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateConfig } from '$lib/server/db';

interface ConfigBody {
	driver_model?: string;
	swarm_model?: string;
	max_batches?: number;
	candidates_per_batch?: number;
	target_good_results?: number;
	creativity?: number;
	rdap_delay_seconds?: number;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// Check authentication
	if (!locals.user?.is_admin) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	let body: ConfigBody;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid request body');
	}

	// Validate values
	if (body.max_batches !== undefined && (body.max_batches < 1 || body.max_batches > 10)) {
		throw error(400, 'max_batches must be between 1 and 10');
	}

	if (body.candidates_per_batch !== undefined && (body.candidates_per_batch < 10 || body.candidates_per_batch > 100)) {
		throw error(400, 'candidates_per_batch must be between 10 and 100');
	}

	if (body.target_good_results !== undefined && (body.target_good_results < 5 || body.target_good_results > 100)) {
		throw error(400, 'target_good_results must be between 5 and 100');
	}

	if (body.creativity !== undefined && (body.creativity < 0 || body.creativity > 1)) {
		throw error(400, 'creativity must be between 0 and 1');
	}

	if (body.rdap_delay_seconds !== undefined && (body.rdap_delay_seconds < 0.1 || body.rdap_delay_seconds > 30)) {
		throw error(400, 'rdap_delay_seconds must be between 0.1 and 30');
	}

	try {
		await updateConfig(platform.env.DB, body);

		return json({ success: true });
	} catch (err) {
		console.error('[Update Config Error]', err);
		throw error(500, 'Failed to update configuration');
	}
};
