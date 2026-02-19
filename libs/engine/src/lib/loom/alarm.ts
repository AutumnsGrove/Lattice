/**
 * Loom — Alarm Scheduler
 *
 * Deduplicating alarm management for Durable Objects.
 * Wraps the raw `state.storage.getAlarm/setAlarm/deleteAlarm` API
 * with the "only schedule if none pending" pattern used by 5/7 DOs.
 *
 * @example
 * ```typescript
 * // Schedule cleanup in 60 seconds (no-op if alarm already pending)
 * await this.alarms.ensureScheduled(60_000);
 *
 * // Force-reschedule (e.g. after processing, schedule next batch)
 * await this.alarms.schedule(100);
 *
 * // Cancel any pending alarm
 * await this.alarms.cancel();
 * ```
 */

import type { LoomLogger } from "./logger.js";

export class AlarmScheduler {
  private readonly storage: DurableObjectStorage;
  private readonly log: LoomLogger;

  constructor(storage: DurableObjectStorage, log: LoomLogger) {
    this.storage = storage;
    this.log = log;
  }

  /**
   * Schedule an alarm `ms` milliseconds from now,
   * but only if no alarm is currently pending (dedup).
   * Returns true if a new alarm was scheduled.
   */
  async ensureScheduled(ms: number): Promise<boolean> {
    const current = await this.storage.getAlarm();
    if (current !== null) {
      return false;
    }
    await this.storage.setAlarm(Date.now() + ms);
    this.log.debug("Alarm scheduled", { delayMs: ms });
    return true;
  }

  /**
   * Unconditionally schedule an alarm `ms` milliseconds from now.
   * Overwrites any existing pending alarm.
   */
  async schedule(ms: number): Promise<void> {
    await this.storage.setAlarm(Date.now() + ms);
    this.log.debug("Alarm force-scheduled", { delayMs: ms });
  }

  /** Cancel any pending alarm. */
  async cancel(): Promise<void> {
    await this.storage.deleteAlarm();
    this.log.debug("Alarm cancelled");
  }

  /** Check if an alarm is currently pending. */
  async isPending(): Promise<boolean> {
    const current = await this.storage.getAlarm();
    return current !== null;
  }

  /** Get the scheduled alarm time, or null if none. */
  async getScheduledTime(): Promise<number | null> {
    return this.storage.getAlarm();
  }
}
