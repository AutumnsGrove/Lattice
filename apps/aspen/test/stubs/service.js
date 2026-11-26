/**
 * Stub for a cross-worker service binding (AUTH, ZEPHYR, LUMEN, PULSE_COLLECTOR).
 *
 * Service bindings point at other deployments. Booting Heartwood, Zephyr, and
 * Pulse for every Aspen test buys fidelity that belongs in their own suites, so
 * they are stubbed at the boundary — but a stub that only succeeds cannot test
 * a sad path, which is the whole point of these suites.
 *
 * Tests choose the answer per service by writing to the shared `STUB_CONTROL`
 * KV namespace (see `setService` in `test/harness.ts`):
 *
 *   await setService("auth", "fail")        // 503 from every call
 *   await setService("auth", "error-500")   // 500 from every call
 *   await setService("auth", {              // pin an endpoint's answer
 *     "/session/validate": { body: { valid: true, user } },
 *   })
 *
 * The value is either `"fail"`, `"error-500"`, or a map of path substring →
 * `{ status?, body? }`. The longest matching substring wins. With no control
 * value set, each service answers its own realistic default.
 *
 * Each stub worker knows which service it is via the `STUB_SERVICE` text binding.
 */
export default {
	/**
	 * @param {Request} request
	 * @param {{ STUB_SERVICE: string, STUB_CONTROL: KVNamespace }} env
	 */
	async fetch(request, env) {
		const service = env.STUB_SERVICE;
		const path = new URL(request.url).pathname;
		const control = await env.STUB_CONTROL.get(service);

		/** @param {unknown} body @param {number} [status] */
		const json = (body, status = 200) =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "content-type": "application/json" },
			});

		if (control === "fail") return json({ error: "stub_unavailable", service }, 503);
		if (control === "error-500") return json({ error: "stub_internal_error", service }, 500);

		if (control) {
			/** @type {Record<string, { status?: number, body?: unknown }>} */
			let routes;
			try {
				routes = JSON.parse(control);
			} catch {
				return json({ error: "stub_misconfigured", service, control }, 500);
			}
			const match = Object.keys(routes)
				.filter((key) => path.includes(key))
				.sort((a, b) => b.length - a.length)[0];
			if (match) return json(routes[match].body ?? {}, routes[match].status ?? 200);
		}

		if (service === "auth") {
			if (path.includes("/session/validate")) {
				// "Nobody is signed in" is the honest default: that is where most
				// tests start. A test that needs a session pins the payload.
				return json({ valid: false });
			}
			if (path.includes("/session/list")) return json({ sessions: [] });
			if (path.includes("/session/revoke-all")) return json({ revoked: 0 });
			return json({ ok: true });
		}
		if (service === "zephyr") return json({ id: "stub-email", success: true });
		if (service === "lumen") {
			return json({ text: "", usage: { input_tokens: 0, output_tokens: 0 } });
		}
		if (service === "pulse") return json({ accepted: true });
		return json({ ok: true, service });
	},
};
