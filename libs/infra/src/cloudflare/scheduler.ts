/**
 * Cloudflare Cron Triggers adapter for GroveScheduler.
 *
 * Registers named handlers that get dispatched when
 * Cloudflare fires cron trigger events.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type {
	GroveScheduler,
	ScheduleHandler,
	ScheduleEvent,
	ScheduleInfo,
	SchedulerInfo,
	GroveObserver,
} from "../types.js";

export class CloudflareScheduler implements GroveScheduler {
	private readonly handlers = new Map<string, ScheduleHandler>();
	private readonly cronMap = new Map<string, string>();

	constructor(private readonly observer?: GroveObserver) {}

	on(name: string, handler: ScheduleHandler): void {
		this.handlers.set(name, handler);
	}

	/**
	 * Register a handler with its cron expression for schedule listing.
	 */
	register(name: string, cron: string, handler: ScheduleHandler): void {
		this.handlers.set(name, handler);
		this.cronMap.set(name, cron);
	}

	/**
	 * Dispatch a Cloudflare ScheduledEvent to the appropriate handler.
	 * Called from the Worker's `scheduled()` export.
	 */
	async dispatch(cron: string, scheduledTime: Date): Promise<void> {
		const start = performance.now();

		// Find handler by cron expression
		for (const [name, registeredCron] of this.cronMap) {
			if (registeredCron === cron) {
				const handler = this.handlers.get(name);
				if (handler) {
					const event: ScheduleEvent = {
						name,
						scheduledTime,
						cron,
					};
					try {
						await handler(event);
						const durationMs = performance.now() - start;
						this.observer?.({
							service: "scheduler",
							operation: "dispatch",
							durationMs,
							ok: true,
							detail: `${name} (${cron})`,
						});
					} catch (error) {
						const durationMs = performance.now() - start;
						this.observer?.({
							service: "scheduler",
							operation: "dispatch",
							durationMs,
							ok: false,
							detail: `${name} (${cron})`,
							error: error instanceof Error ? error.message : String(error),
						});
						throw error;
					}
					return;
				}
			}
		}

		// Fallback: try matching by name directly
		const handler = this.handlers.get(cron);
		if (handler) {
			try {
				await handler({
					name: cron,
					scheduledTime,
					cron,
				});
				const durationMs = performance.now() - start;
				this.observer?.({
					service: "scheduler",
					operation: "dispatch",
					durationMs,
					ok: true,
					detail: cron,
				});
			} catch (error) {
				const durationMs = performance.now() - start;
				this.observer?.({
					service: "scheduler",
					operation: "dispatch",
					durationMs,
					ok: false,
					detail: cron,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
			return;
		}

		logGroveError("InfraSDK", SRV_ERRORS.SCHEDULE_UNMATCHED, {
			detail: `cron: ${cron}`,
		});
	}

	schedules(): ScheduleInfo[] {
		return Array.from(this.cronMap.entries()).map(([name, cron]) => ({
			name,
			cron,
		}));
	}

	info(): SchedulerInfo {
		return { provider: "cloudflare-cron" };
	}
}
