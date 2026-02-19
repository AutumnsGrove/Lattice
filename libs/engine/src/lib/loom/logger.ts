/**
 * Loom — Structured Logger
 *
 * Auto-tagged with DO name and ID. Emits structured JSON to console
 * so Cloudflare's log aggregation can parse and filter.
 *
 * Replaces inconsistent `console.error("[ClassName]")` patterns
 * across all 7 DOs with a unified structured format.
 */

import type { LoomLogLevel, LoomLogEntry } from "./types.js";

export class LoomLogger {
  private readonly doName: string;
  private readonly doId: string;

  constructor(doName: string, doId: string) {
    this.doName = doName;
    this.doId = doId;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.emit("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.emit("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.emit("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.emit("error", message, data);
  }

  /** Log an error with a caught exception as context. */
  errorWithCause(
    message: string,
    cause: unknown,
    data?: Record<string, unknown>,
  ): void {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    this.emit("error", message, { ...data, cause: causeMessage });
  }

  private emit(
    level: LoomLogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: LoomLogEntry = {
      do: this.doName,
      id: this.doId,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const json = JSON.stringify(entry);

    switch (level) {
      case "debug":
        console.debug(json);
        break;
      case "info":
        console.log(json);
        break;
      case "warn":
        console.warn(json);
        break;
      case "error":
        console.error(json);
        break;
    }
  }
}
