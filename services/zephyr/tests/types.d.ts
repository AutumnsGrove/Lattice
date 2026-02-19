/**
 * Test Type Declarations
 *
 * Type declarations for Cloudflare Workers APIs in tests.
 */

declare global {
  // D1 Database types
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results: T[] }>;
    run(): Promise<{ success: boolean }>;
  }
}

export {};
