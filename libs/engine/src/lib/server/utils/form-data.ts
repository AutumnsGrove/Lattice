/**
 * Typed Form Data Parsing with Zod Validation
 *
 * Replaces unsafe `formData.get("field") as string` patterns with
 * runtime-validated, fully-typed form data extraction.
 *
 * @module server/utils/form-data
 */

import { z, type ZodSchema, type ZodError } from "zod";

/**
 * Result type for form data parsing.
 * Either a typed success or a record of field-level error messages.
 */
export type FormDataResult<T> =
	| { success: true; data: T }
	| { success: false; errors: Record<string, string[]>; error: ZodError };

/**
 * Parse FormData through a Zod schema.
 *
 * Converts FormData to a plain object and validates it against the schema.
 * Returns typed data on success, or field-level errors for use with
 * SvelteKit's `fail()` helper.
 *
 * Note: Multi-value fields (repeated inputs with the same name) are not
 * supported — `Object.fromEntries` keeps only the last value. For multi-value
 * data (e.g. multi-select checkboxes, repeated tags), encode as a JSON string
 * in a single field and parse with a Zod transform.
 *
 * @example
 * ```typescript
 * const UpdateSchema = z.object({
 *   title: z.string().min(1).max(200),
 *   published: z.coerce.boolean(),
 *   limit: z.coerce.number().int().positive().optional(),
 * });
 *
 * export const actions: Actions = {
 *   update: async ({ request }) => {
 *     const formData = await request.formData();
 *     const result = parseFormData(formData, UpdateSchema);
 *     if (!result.success) return fail(400, { errors: result.errors });
 *     // result.data is fully typed: { title: string, published: boolean, limit?: number }
 *   }
 * };
 * ```
 */
export function parseFormData<T extends ZodSchema>(
	formData: FormData,
	schema: T,
): FormDataResult<z.infer<T>> {
	const raw = Object.fromEntries(formData);
	const result = schema.safeParse(raw);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return {
		success: false,
		errors: result.error.flatten().fieldErrors as Record<string, string[]>,
		error: result.error,
	};
}
