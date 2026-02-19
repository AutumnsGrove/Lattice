/**
 * Loom — Promise Lock Map
 *
 * Named promise dedup — prevents concurrent execution of the same
 * async operation. Used by TenantDO for D1 config refresh and
 * anywhere else you need "if already running, await the existing promise."
 *
 * @example
 * ```typescript
 * const locks = new PromiseLockMap();
 *
 * // Only one refresh runs at a time, concurrent callers await the same promise
 * const config = await locks.withLock("refresh", () => this.fetchConfigFromD1());
 * ```
 */

export class PromiseLockMap {
  private readonly locks = new Map<string, Promise<unknown>>();

  /**
   * Execute `fn` under a named lock. If a lock with the same name
   * is already held, returns the existing promise instead of starting
   * a new execution.
   */
  async withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.locks.get(name);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.locks.delete(name);
    });

    this.locks.set(name, promise);
    return promise;
  }

  /** Check if a named lock is currently held. */
  isLocked(name: string): boolean {
    return this.locks.has(name);
  }

  /** Number of currently held locks. */
  get size(): number {
    return this.locks.size;
  }
}
