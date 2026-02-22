/**
 * Alert and Notification Logic
 *
 * Sends email notifications via Zephyr for backup job completion or failures.
 */

import type { Env, BackupResult } from "../types";
import { formatBytes } from "./utils";

interface BackupJobResult {
	jobId: string;
	triggerType: "scheduled" | "manual";
	startedAt: number;
	completedAt: number;
	successfulCount: number;
	failedCount: number;
	totalSizeBytes: number;
	durationMs: number;
	results: BackupResult[];
}

/**
 * Send alert via Zephyr email gateway
 */
export async function sendAlert(
	env: Env,
	result: BackupJobResult,
	alertType: "success" | "failure",
): Promise<void> {
	if (!env.ZEPHYR_API_KEY || !env.ZEPHYR_URL) {
		console.log("Zephyr not configured, skipping alert");
		return;
	}

	try {
		const { subject, html } = formatEmailContent(result, alertType);

		const response = await fetch(`${env.ZEPHYR_URL}/send`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": env.ZEPHYR_API_KEY,
			},
			body: JSON.stringify({
				type: "notification",
				template: "raw",
				to: env.ALERT_EMAIL,
				subject,
				html,
			}),
		});

		if (!response.ok) {
			console.error(`Zephyr alert failed: ${response.status}`);
		} else {
			console.log(`Zephyr alert sent: ${alertType}`);
		}
	} catch (error) {
		console.error("Failed to send Zephyr alert:", error);
	}
}

/**
 * Format backup result as email content
 */
function formatEmailContent(
	result: BackupJobResult,
	alertType: "success" | "failure",
): { subject: string; html: string } {
	const isSuccess = alertType === "success";
	const totalDatabases = result.successfulCount + result.failedCount;
	const duration = `${(result.durationMs / 1000).toFixed(1)}s`;
	const timestamp = new Date(result.completedAt * 1000).toISOString();

	const subject = isSuccess
		? `Patina Backup Completed — ${totalDatabases}/${totalDatabases} databases`
		: `Patina Backup Failed — ${result.failedCount} database(s) failed`;

	const failedRows = result.results
		.filter((r) => r.status === "failed")
		.map(
			(r) => `
      <tr style="background: #fef2f2;">
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${r.database_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">Failed</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${r.error_message || "Unknown error"}</td>
      </tr>`,
		)
		.join("");

	const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="padding: 24px; background: ${isSuccess ? "#f0fdf4" : "#fef2f2"}; border-radius: 8px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 8px; color: ${isSuccess ? "#166534" : "#991b1b"};">
          ${isSuccess ? "Backup Completed" : "Backup Failed"}
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${timestamp}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Databases</td>
          <td style="padding: 8px 0; font-weight: 600;">${result.successfulCount}/${totalDatabases} successful</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Total Size</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatBytes(result.totalSizeBytes)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Duration</td>
          <td style="padding: 8px 0; font-weight: 600;">${duration}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Trigger</td>
          <td style="padding: 8px 0; font-weight: 600;">${result.triggerType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Job ID</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 13px;">${result.jobId}</td>
        </tr>
      </table>

      ${
				result.failedCount > 0
					? `
      <h3 style="margin: 16px 0 8px; color: #991b1b;">Failed Databases</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Database</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Status</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Error</th>
          </tr>
        </thead>
        <tbody>${failedRows}</tbody>
      </table>`
					: ""
			}

      <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        Patina — Automated D1 Backup System
      </p>
    </div>
  `;

	return { subject, html };
}
