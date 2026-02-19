/**
 * Loom — Factory Helpers
 *
 * Convenience functions for getting DO stubs and making
 * fetch calls to Durable Objects from Workers or SvelteKit.
 *
 * @example
 * ```typescript
 * // Get a stub by string ID
 * const stub = getLoomStub(env.POST_CONTENT, `content:${tenantId}:${slug}`);
 * const response = await loomFetch(stub, "/content", "GET");
 * const data = await response.json();
 * ```
 */

/**
 * Get a DO stub by string ID.
 * Creates a deterministic ID from the string using `idFromName`.
 */
export function getLoomStub<T extends Rpc.DurableObjectBranded>(
  namespace: DurableObjectNamespace<T>,
  name: string,
): DurableObjectStub<T> {
  const id = namespace.idFromName(name);
  return namespace.get(id);
}

/**
 * Get a DO stub by hex ID string.
 * Used when you have an existing DO ID as a string.
 */
export function getLoomStubById<T extends Rpc.DurableObjectBranded>(
  namespace: DurableObjectNamespace<T>,
  hexId: string,
): DurableObjectStub<T> {
  const id = namespace.idFromString(hexId);
  return namespace.get(id);
}

/**
 * Make a fetch call to a DO stub.
 * Handles URL construction and JSON content-type headers.
 */
export async function loomFetch(
  stub: DurableObjectStub,
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<Response> {
  const url = new URL(path, "https://do-internal");
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
  }

  return stub.fetch(url.toString(), init);
}

/**
 * Fetch JSON from a DO stub and parse the response.
 * Throws if the response is not ok.
 */
export async function loomFetchJson<T>(
  stub: DurableObjectStub,
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<T> {
  const response = await loomFetch(stub, path, method, body);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Loom fetch failed (${response.status}): ${error}`);
  }
  return response.json() as Promise<T>;
}
