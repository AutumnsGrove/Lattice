import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyToClipboard, canNativeShare, share } from "./share";

// navigator.clipboard is read-only — use defineProperty to mock it
function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText },
		writable: true,
		configurable: true,
	});
}

function mockShare(fn: ReturnType<typeof vi.fn> | undefined) {
	Object.defineProperty(navigator, "share", {
		value: fn,
		writable: true,
		configurable: true,
	});
}

describe("copyToClipboard", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("returns success when clipboard write succeeds", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);
		const result = await copyToClipboard("hello");
		expect(result).toEqual({ success: true });
		expect(writeText).toHaveBeenCalledWith("hello");
	});

	it("returns failure when clipboard write throws", async () => {
		mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const result = await copyToClipboard("hello");
		expect(result).toEqual({ success: false, error: "Clipboard access denied" });
	});
});

describe("canNativeShare", () => {
	it("returns true when navigator.share is a function", () => {
		mockShare(vi.fn());
		expect(canNativeShare()).toBe(true);
	});

	it("returns false when navigator.share is undefined", () => {
		mockShare(undefined);
		expect(canNativeShare()).toBe(false);
	});
});

describe("share", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockClipboard(vi.fn().mockResolvedValue(undefined));
	});

	it("uses native share when available", async () => {
		const nativeShare = vi.fn().mockResolvedValue(undefined);
		mockShare(nativeShare);

		const result = await share({ title: "My Grove", url: "https://autumn.grove.place" });
		expect(result).toEqual({ method: "native", success: true });
		expect(nativeShare).toHaveBeenCalledWith({
			title: "My Grove",
			url: "https://autumn.grove.place",
		});
	});

	it("returns cancelled when user dismisses native share", async () => {
		const abort = new DOMException("User cancelled", "AbortError");
		mockShare(vi.fn().mockRejectedValue(abort));

		const result = await share({ url: "https://grove.place" });
		expect(result).toEqual({ method: "native", success: false, error: "cancelled" });
	});

	it("falls back to clipboard when native share is unavailable", async () => {
		mockShare(undefined);
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);

		const result = await share({ title: "My Grove", url: "https://autumn.grove.place" });
		expect(result).toEqual({ method: "clipboard", success: true });
		expect(writeText).toHaveBeenCalledWith("https://autumn.grove.place");
	});

	it("falls back to clipboard when native share throws non-abort error", async () => {
		mockShare(vi.fn().mockRejectedValue(new Error("broken")));
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);

		const result = await share({ url: "https://grove.place" });
		expect(result).toEqual({ method: "clipboard", success: true });
		expect(writeText).toHaveBeenCalledWith("https://grove.place");
	});

	it("copies text when no URL provided", async () => {
		mockShare(undefined);
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);

		const result = await share({ text: "Check out this grove!" });
		expect(result.method).toBe("clipboard");
		expect(writeText).toHaveBeenCalledWith("Check out this grove!");
	});

	it("copies title as last resort", async () => {
		mockShare(undefined);
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);

		await share({ title: "My Grove" });
		expect(writeText).toHaveBeenCalledWith("My Grove");
	});
});
