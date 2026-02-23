import { describe, it, expect } from "vitest";
import { isRedirect, isHttpError } from "./type-guards";

describe("isRedirect", () => {
	it("returns true for valid redirect objects", () => {
		expect(isRedirect({ status: 302, location: "/login" })).toBe(true);
		expect(isRedirect({ status: 307, location: "https://example.com" })).toBe(true);
	});

	it("returns false for non-redirect objects", () => {
		expect(isRedirect(null)).toBe(false);
		expect(isRedirect(undefined)).toBe(false);
		expect(isRedirect("redirect")).toBe(false);
		expect(isRedirect(42)).toBe(false);
		expect(isRedirect({ status: 302 })).toBe(false); // missing location
		expect(isRedirect({ location: "/login" })).toBe(false); // missing status
		expect(isRedirect({ status: "302", location: "/login" })).toBe(false); // wrong type
	});

	it("returns false for Error instances without redirect shape", () => {
		expect(isRedirect(new Error("something broke"))).toBe(false);
	});
});

describe("isHttpError", () => {
	it("returns true for valid HttpError objects", () => {
		expect(isHttpError({ status: 404, body: { message: "Not found" } })).toBe(true);
		expect(isHttpError({ status: 500, body: { message: "Server error" } })).toBe(true);
	});

	it("requires body.message to be a string", () => {
		expect(isHttpError({ status: 500, body: { other: "field" } })).toBe(false);
		expect(isHttpError({ status: 500, body: { message: 123 } })).toBe(false);
	});

	it("returns false for null body", () => {
		expect(isHttpError({ status: 500, body: null })).toBe(false);
	});

	it("returns false for non-error objects", () => {
		expect(isHttpError(null)).toBe(false);
		expect(isHttpError(undefined)).toBe(false);
		expect(isHttpError("error")).toBe(false);
		expect(isHttpError({ status: 500 })).toBe(false); // missing body
		expect(isHttpError({ body: { message: "err" } })).toBe(false); // missing status
	});

	it("returns false for Error instances", () => {
		expect(isHttpError(new Error("something broke"))).toBe(false);
	});
});
