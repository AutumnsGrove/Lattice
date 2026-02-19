/**
 * Loom — Test Utilities
 *
 * Mock factories for DO state and env objects.
 * Used in unit tests to exercise LoomDO subclasses
 * without a real Cloudflare runtime.
 *
 * @example
 * ```typescript
 * import { createMockDOState, createMockStorage } from '@autumnsgrove/lattice/loom/testing';
 *
 * const state = createMockDOState("test-id");
 * const env = { DB: createMockD1() };
 * const DO = new MyDO(state, env);
 * ```
 */

// ============================================================================
// Mock Storage
// ============================================================================

/** Create a minimal mock of DurableObjectStorage for testing. */
export function createMockStorage(): DurableObjectStorage {
  const kv = new Map<string, unknown>();
  let alarm: number | null = null;

  const sqlRows = new Map<string, unknown[]>();

  const mockSql = {
    exec: (_query: string, ..._bindings: unknown[]) => ({
      one: () => null,
      toArray: () => [],
      columnNames: [] as string[],
      raw: () => [] as unknown[][],
      [Symbol.iterator]: function* () {
        /* empty */
      },
    }),
  } as unknown as SqlStorage;

  return {
    get: async (key: string) => kv.get(key),
    put: async (key: string, value: unknown) => {
      kv.set(key, value);
    },
    delete: async (key: string) => kv.delete(key),
    list: async () => kv as unknown as Map<string, unknown>,
    getAlarm: async () => alarm,
    setAlarm: async (ms: number) => {
      alarm = ms;
    },
    deleteAlarm: async () => {
      alarm = null;
    },
    sql: mockSql,
    // Stubs for less common methods
    deleteAll: async () => {},
    transaction: async (fn: () => Promise<void>) => fn(),
    sync: async () => {},
    transactionSync: (fn: () => void) => fn(),
    getCurrentBookmark: async () => "",
    getBookmarkForTime: async () => "",
    onNextSessionRestart: async () => {},
  } as unknown as DurableObjectStorage;
}

// ============================================================================
// Mock DO State
// ============================================================================

/** Create a minimal mock of DurableObjectState for testing. */
export function createMockDOState(idName = "test-do"): DurableObjectState {
  const storage = createMockStorage();
  const webSockets: WebSocket[] = [];

  return {
    id: {
      toString: () => idName,
      name: idName,
      equals: (other: DurableObjectId) => other.toString() === idName,
    } as DurableObjectId,
    storage,
    blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn(),
    waitUntil: (_promise: Promise<unknown>) => {},
    acceptWebSocket: (_ws: WebSocket, _tags?: string[]) => {
      webSockets.push(_ws);
    },
    getWebSockets: (_tag?: string) => webSockets,
    setWebSocketAutoResponse: () => {},
    getWebSocketAutoResponse: () => null,
    getTags: () => [],
    abort: () => {},
  } as unknown as DurableObjectState;
}

// ============================================================================
// Mock Env Helpers
// ============================================================================

/** Create a mock D1Database for testing. */
export function createMockD1(): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [], success: true, meta: {} }),
        first: async () => null,
        run: async () => ({ success: true, meta: {} }),
        raw: async () => [],
      }),
      all: async () => ({ results: [], success: true, meta: {} }),
      first: async () => null,
      run: async () => ({ success: true, meta: {} }),
      raw: async () => [],
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

/** Create a mock R2Bucket for testing. */
export function createMockR2(): R2Bucket {
  const objects = new Map<string, string>();

  return {
    put: async (key: string, value: unknown) => {
      objects.set(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
      return {} as R2Object;
    },
    get: async (key: string) => {
      const val = objects.get(key);
      if (!val) return null;
      return {
        text: async () => val,
        json: async () => JSON.parse(val),
        body: new ReadableStream(),
        bodyUsed: false,
      } as unknown as R2ObjectBody;
    },
    head: async (key: string) => {
      if (!objects.has(key)) return null;
      return {} as R2Object;
    },
    delete: async (key: string) => {
      objects.delete(key);
    },
    list: async () => ({
      objects: [],
      truncated: false,
      delimitedPrefixes: [],
    }),
    createMultipartUpload: async () => ({}) as R2MultipartUpload,
    resumeMultipartUpload: () => ({}) as R2MultipartUpload,
  } as unknown as R2Bucket;
}
