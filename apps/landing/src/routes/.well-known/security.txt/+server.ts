import type { RequestHandler } from "./$types";

/**
 * RFC 9116 security.txt — machine-readable security contact info.
 * https://securitytxt.org/
 *
 * Serves plaintext at /.well-known/security.txt so automated scanners
 * and security researchers can find our disclosure policy.
 */
export const GET: RequestHandler = async () => {
	// Expires one year from now (RFC 9116 recommends updating regularly)
	const expires = new Date();
	expires.setFullYear(expires.getFullYear() + 1);

	const body = `# Grove Security Contact
# https://grove.place/security

Contact: mailto:security@grove.place
Contact: https://grove.place/security
Expires: ${expires.toISOString()}
Preferred-Languages: en
Canonical: https://grove.place/.well-known/security.txt
Policy: https://grove.place/security
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
};
