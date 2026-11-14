import { describe, it, expect, vi, beforeEach } from "vitest";
import { pulseHandle, createPulseFlushHook } from "../hook.js";

vi.mock("../emitter.js", () => ({
	initPulse: vi.fn(),
	emitPulseEvent: vi.fn(),
	flushPulse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../visitor.js", () => ({
	hashVisitor: vi.fn().mockResolvedValue("deadbeef01234567"),
}));

import { initPulse, emitPulseEvent, flushPulse } from "../emitter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCollector() {
	return {
		fetch: vi.fn().mockResolvedValue(new Response("ok")),
	};
}

function makeEvent(
	pathname: string,
	opts: {
		locals?: Record<string, unknown>;
		collector?: ReturnType<typeof makeCollector> | null;
		routeId?: string | null;
	} = {},
) {
	const { locals = {}, collector = makeCollector(), routeId = null } = opts;

	return {
		url: new URL(`https://example.com${pathname}`),
		request: new Request(`https://example.com${pathname}`, {
			headers: {
				"cf-connecting-ip": "1.2.3.4",
				"user-agent": "TestAgent/1.0",
			},
		}),
		route: routeId !== null ? { id: routeId } : { id: null },
		locals,
		platform: collector !== null ? { env: { PULSE_COLLECTOR: collector } } : { env: {} },
	};
}

function makeResolve(status = 200) {
	return vi.fn().mockResolvedValue(new Response("body", { status }));
}

/** Extract the options object from the most recent emitPulseEvent call */
function lastEmitOptions() {
	return vi.mocked(emitPulseEvent).mock.calls[0][1]!;
}

// ---------------------------------------------------------------------------
// pulseHandle — skip logic
// ---------------------------------------------------------------------------

describe("pulseHandle — skip logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([["/_app/immutable/chunk.js"], ["/favicon.ico"], ["/__data.json"]])(
		"skips instrumentation for prefixed route %s",
		async (pathname) => {
			const handle = pulseHandle({ app: "aspen" });
			const event = makeEvent(pathname);
			const resolve = makeResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalledWith(event);
			expect(initPulse).not.toHaveBeenCalled();
			expect(emitPulseEvent).not.toHaveBeenCalled();
		},
	);

	it("does not skip normal routes", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden/my-post");
		const resolve = makeResolve();

		await handle({ event: event as never, resolve });

		expect(emitPulseEvent).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// pulseHandle — initialization
// ---------------------------------------------------------------------------

describe("pulseHandle — initialization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("initializes pulse collector on first request with valid service binding", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden");
		const resolve = makeResolve();

		await handle({ event: event as never, resolve });

		expect(initPulse).toHaveBeenCalledOnce();
	});

	it("does not initialize when PULSE_COLLECTOR binding is missing", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden", { collector: null });
		const resolve = makeResolve();

		await handle({ event: event as never, resolve });

		expect(initPulse).not.toHaveBeenCalled();
		expect(emitPulseEvent).not.toHaveBeenCalled();
	});

	it("only initializes once across multiple requests", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const resolve = makeResolve();

		await handle({ event: makeEvent("/a") as never, resolve });
		await handle({ event: makeEvent("/b") as never, resolve });
		await handle({ event: makeEvent("/c") as never, resolve });

		expect(initPulse).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// pulseHandle — emitPulseEvent shape
// ---------------------------------------------------------------------------

describe("pulseHandle — emitPulseEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("emits a page.viewed event with correct route, method, status, duration, app, and user-agent", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden/post", { routeId: "/garden/[slug]" });
		const resolve = makeResolve(200);

		await handle({ event: event as never, resolve });

		expect(emitPulseEvent).toHaveBeenCalledOnce();
		expect(vi.mocked(emitPulseEvent).mock.calls[0][0]).toBe("page.viewed");

		const opts = lastEmitOptions();
		expect(opts.route).toBe("/garden/[slug]");
		expect(opts.method).toBe("GET");
		expect(opts.status).toBe(200);
		expect(opts.duration_ms).toBeGreaterThanOrEqual(0);
		expect(opts.app).toBe("aspen");
		expect(opts.visitor_hash).toBe("deadbeef01234567");
		expect(opts.metadata).toEqual({ ua: "TestAgent/1.0" });
	});

	it("carries an acquisition ref in metadata when the URL has one", async () => {
		const handle = pulseHandle({ app: "landing" });
		const event = makeEvent("/hello?ref=card");
		const resolve = makeResolve(200);

		await handle({ event: event as never, resolve });

		const opts = lastEmitOptions();
		expect(opts.route).toBe("/hello");
		expect(opts.metadata).toEqual({ ua: "TestAgent/1.0", ref: "card" });
	});

	it("falls back to pathname when route.id is null", async () => {
		const handle = pulseHandle({ app: "plant" });
		const event = makeEvent("/some/path", { routeId: null });
		const resolve = makeResolve(404);

		await handle({ event: event as never, resolve });

		const opts = lastEmitOptions();
		expect(opts.route).toBe("/some/path");
		expect(opts.status).toBe(404);
	});
});

// ---------------------------------------------------------------------------
// pulseHandle — extractTenantId (indirect)
// ---------------------------------------------------------------------------

describe("pulseHandle — tenant_id extraction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("extracts tenant_id from locals.tenantId", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden", { locals: { tenantId: "t_direct" } });

		await handle({ event: event as never, resolve: makeResolve() });

		const opts = lastEmitOptions();
		expect(opts.tenant_id).toBe("t_direct");
	});

	it("extracts tenant_id from locals.tenant.id", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden", {
			locals: { tenant: { id: "t_nested" } },
		});

		await handle({ event: event as never, resolve: makeResolve() });

		const opts = lastEmitOptions();
		expect(opts.tenant_id).toBe("t_nested");
	});

	it("leaves tenant_id undefined when no tenant info in locals", async () => {
		const handle = pulseHandle({ app: "aspen" });
		const event = makeEvent("/garden", { locals: {} });

		await handle({ event: event as never, resolve: makeResolve() });

		const opts = lastEmitOptions();
		expect(opts.tenant_id).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// createPulseFlushHook
// ---------------------------------------------------------------------------

describe("createPulseFlushHook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls flushPulse after resolve", async () => {
		const hook = createPulseFlushHook();
		const event = makeEvent("/garden");
		const resolve = makeResolve();

		const response = await hook({ event: event as never, resolve });

		expect(resolve).toHaveBeenCalledWith(event);
		expect(flushPulse).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
	});

	it("returns the resolved response unchanged", async () => {
		const hook = createPulseFlushHook();
		const event = makeEvent("/garden");
		const resolve = makeResolve(302);

		const response = await hook({ event: event as never, resolve });

		expect(response.status).toBe(302);
	});
});
