import type { RequestHandler } from "./$types";

/**
 * W3C TDMRep — Text and Data Mining Reservation Protocol.
 * https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/
 *
 * Declares that Grove reserves all text and data mining rights
 * under EU CDSM Directive Article 4. This is a horizontal opt-out
 * that applies to all TDM operators without naming them individually.
 */
export const GET: RequestHandler = async () => {
	const body = JSON.stringify(
		[
			{
				location: "/",
				"tdm-reservation": 1,
				"tdm-policy": "https://grove.place/shade",
			},
		],
		null,
		"\t",
	);

	return new Response(body, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
};
