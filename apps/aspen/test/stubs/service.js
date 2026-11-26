/**
 * Stub for a cross-worker service binding (AUTH, ZEPHYR, LUMEN, PULSE_COLLECTOR).
 *
 * Service bindings point at other deployments. Booting Heartwood, Zephyr, and
 * Pulse for every Aspen test buys fidelity that belongs in their own suites, so
 * they are stubbed at the boundary — but a stub that only succeeds cannot test
 * a sad path, which is the whole point of the suites these feed.
 *
 * Tests choose the answer per service by writing to the shared `STUB_CONTROL`
 * KV namespace:
 *
 *     await setServiceMode("auth", "fail")   // 503 from every AUTH call
 *     await setServiceMode("auth", "ok")     // back to the default
 *
 * Each stub worker knows which service it is via the `STUB_SERVICE` text binding.
 */
export default {
	/**
	 * @param {Request} _request
	 * @param {{ STUB_SERVICE: string, STUB_CONTROL: KVNamespace }} env
	 */
	async fetch(_request, env) {
		const service = env.STUB_SERVICE;
		const mode = await env.STUB_CONTROL.get(service);
		/** @param {unknown} body @param {number} [status] */
		const json = (body, status = 200) =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "content-type": "application/json" },
			});

		if (mode === "fail") {
			return json({ error: "stub_unavailable", service }, 503);
		}

		if (mode === "error-500") {
			return json({ error: "stub_internal_error", service }, 500);
		}

		// Any other value is a canned response body, so a suite can pin the exact
		// payload a binding would have returned (`{"valid":true,...}`).
		if (mode) {
			try {
				return json(JSON.parse(mode));
			} catch {
				return json({ error: "stub_misconfigured", service, mode }, 500);
			}
		}

		switch (service) {
			case "auth":
				// "No session" is the honest default: an unauthenticated request is
				// what most tests start from. Tests that need a session set
				// `mode` to a JSON session payload (see setServicePayload).
				return json({ valid: false });
			case "zephyr":
				return json({ id: "stub-email", success: true });
			case "lumen":
				return json({ text: "", usage: { input_tokens: 0, output_tokens: 0 } });
			case "pulse":
				return json({ accepted: true });
			default:
				return json({ ok: true, service });
		}
	},
};
