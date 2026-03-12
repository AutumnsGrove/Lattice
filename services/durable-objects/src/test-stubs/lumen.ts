/**
 * Lumen stub for DO tests.
 * TriageDO imports createLumenClient — this provides a no-op stub.
 */

export interface LumenClient {
	infer: (...args: unknown[]) => Promise<unknown>;
}

export function createLumenClient(_config: unknown): LumenClient {
	return {
		infer: async () => ({ text: "", tool_calls: [] }),
	};
}
