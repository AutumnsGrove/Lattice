/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Platform {
      env?: {};
      context?: ExecutionContext;
      caches?: CacheStorage;
    }
  }
}

export {};
