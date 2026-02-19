/**
 * Loom — WebSocket Manager
 *
 * Handles WebSocket lifecycle for DOs that need live connections:
 * accept, broadcast, cleanup. Supports both regular and
 * hibernation-aware WebSocket patterns.
 *
 * Used by PostMetaDO (regular) and SentinelDO (hibernation-aware).
 */

import type { LoomLogger } from "./logger.js";
import type { LoomWebSocketMessage } from "./types.js";

export class WebSocketManager {
  private readonly state: DurableObjectState;
  private readonly log: LoomLogger;

  /** Whether to use hibernation-aware WebSocket API. */
  private readonly hibernation: boolean;

  constructor(
    state: DurableObjectState,
    log: LoomLogger,
    options?: { hibernation?: boolean },
  ) {
    this.state = state;
    this.log = log;
    this.hibernation = options?.hibernation ?? false;
  }

  /**
   * Accept a WebSocket upgrade request.
   * Returns the client-side Response to send back to the caller.
   */
  accept(request: Request, tags?: string[]): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (this.hibernation) {
      this.state.acceptWebSocket(server, tags);
    } else {
      server.accept();
    }

    this.log.debug("WebSocket accepted", { tags });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Broadcast a message to all connected WebSockets.
   * Automatically cleans up dead connections.
   */
  broadcast(
    message: string | Record<string, unknown>,
    exclude?: WebSocket,
  ): void {
    const payload =
      typeof message === "string" ? message : JSON.stringify(message);
    const sockets = this.getConnections();
    let sent = 0;
    let cleaned = 0;

    for (const ws of sockets) {
      if (ws === exclude) continue;
      try {
        ws.send(payload);
        sent++;
      } catch {
        try {
          ws.close(1011, "Broadcast failed");
        } catch {
          // Already closed
        }
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log.debug("Broadcast cleanup", { sent, cleaned });
    }
  }

  /** Get all currently connected WebSockets. */
  getConnections(tag?: string): WebSocket[] {
    if (this.hibernation) {
      return this.state.getWebSockets(tag);
    }
    // For non-hibernation, the state tracks them too
    return this.state.getWebSockets(tag);
  }

  /** Count of currently connected WebSockets. */
  get connectionCount(): number {
    return this.getConnections().length;
  }

  /**
   * Parse a raw WebSocket message into a typed structure.
   * Attempts JSON parse for text frames.
   */
  parseMessage(data: string | ArrayBuffer): LoomWebSocketMessage {
    if (typeof data === "string") {
      let json: unknown = null;
      try {
        json = JSON.parse(data);
      } catch {
        // Not JSON — that's fine
      }
      return { data, json };
    }
    return { data, json: null };
  }

  /** Safely close a WebSocket with an optional reason. */
  close(ws: WebSocket, code = 1000, reason?: string): void {
    try {
      ws.close(code, reason);
    } catch {
      // Already closed
    }
  }
}
