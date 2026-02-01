#!/usr/bin/env bun
/**
 * Grove Broadcast CLI
 *
 * Send email broadcasts to Grove subscribers using Resend.
 *
 * Usage:
 *   bun run scripts/email/broadcast.ts <command> [options]
 *
 * Commands:
 *   sync              Sync D1 subscribers to Resend Audience
 *   sync-unsubs       Sync unsubscribes from Resend back to D1 (deletes them)
 *   list              List all broadcasts
 *   create            Create a new broadcast draft
 *   preview <id>      Show broadcast details
 *   send <id>         Send a draft broadcast
 *
 * Environment Variables:
 *   RESEND_API_KEY      Your Resend API key
 *   RESEND_AUDIENCE_ID  The Resend audience ID for Grove
 *
 * Examples:
 *   bun run scripts/email/broadcast.ts sync
 *   bun run scripts/email/broadcast.ts create --subject "Hello Grove!" --body "path/to/email.html"
 *   bun run scripts/email/broadcast.ts send abc123
 */

import { parseArgs } from "util";
import {
  syncSubscribersToResend,
  syncUnsubscribesToD1,
  listBroadcasts,
  getBroadcast,
  createBroadcast,
  sendBroadcast,
  listAllContacts,
} from "./lib/resend";
import { getSubscriberCount } from "./lib/d1";
import { buildBroadcastEmail, wrapInGroveTemplate } from "./lib/templates";

// =============================================================================
// HELPERS
// =============================================================================

function printUsage() {
  console.log(`
📧 Grove Broadcast CLI

Usage:
  bun run scripts/email/broadcast.ts <command> [options]

Commands:
  sync              Sync D1 subscribers to Resend Audience
  sync-unsubs       Sync unsubscribes from Resend → D1 (DELETES unsubscribed users)
  list              List recent broadcasts
  create            Create a new broadcast draft
  preview <id>      Show broadcast details
  send <id>         Send a draft broadcast
  status            Show sync status (D1 vs Resend counts)

Create Options:
  --subject, -s     Email subject line (required)
  --body, -b        Path to HTML body content file, or raw HTML string
  --name, -n        Internal name for the broadcast (optional)
  --from, -f        From address (default: "Autumn <autumn@grove.place>")

Examples:
  # Check status
  bun run scripts/email/broadcast.ts status

  # Sync subscribers to Resend
  bun run scripts/email/broadcast.ts sync

  # Sync unsubscribes back (and delete them from D1)
  bun run scripts/email/broadcast.ts sync-unsubs

  # Create a draft broadcast
  bun run scripts/email/broadcast.ts create \\
    --subject "Big news from Grove" \\
    --body ./docs/internal/grove-launch-email-v6.html

  # List broadcasts to find the ID
  bun run scripts/email/broadcast.ts list

  # Preview before sending
  bun run scripts/email/broadcast.ts preview abc-123

  # Send it!
  bun run scripts/email/broadcast.ts send abc-123
`);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status: string): string {
  switch (status) {
    case "draft":
      return "📝 Draft";
    case "queued":
      return "⏳ Queued";
    case "sent":
      return "✅ Sent";
    default:
      return status;
  }
}

// =============================================================================
// COMMANDS
// =============================================================================

async function cmdStatus() {
  console.log("\n📊 Grove Broadcast Status\n");

  // D1 counts
  const d1Counts = await getSubscriberCount();
  console.log("D1 Database:");
  console.log(`  Active subscribers: ${d1Counts.active}`);
  console.log(`  Unsubscribed: ${d1Counts.unsubscribed}`);

  // Resend counts
  const contacts = await listAllContacts();
  const activeContacts = contacts.filter((c) => !c.unsubscribed);
  const unsubContacts = contacts.filter((c) => c.unsubscribed);

  console.log("\nResend Audience:");
  console.log(`  Active contacts: ${activeContacts.length}`);
  console.log(`  Unsubscribed: ${unsubContacts.length}`);

  // Sync recommendations
  const needsSync = d1Counts.active > activeContacts.length;
  const needsUnsubSync = unsubContacts.length > 0;

  if (needsSync || needsUnsubSync) {
    console.log("\n⚠️  Recommendations:");
    if (needsSync) {
      console.log(
        `  • Run 'sync' to add ${d1Counts.active - activeContacts.length} new subscribers to Resend`,
      );
    }
    if (needsUnsubSync) {
      console.log(
        `  • Run 'sync-unsubs' to delete ${unsubContacts.length} unsubscribed user(s) from D1`,
      );
    }
  } else {
    console.log("\n✓ Everything is in sync!");
  }

  console.log("");
}

async function cmdSync() {
  const result = await syncSubscribersToResend();

  console.log("\n📊 Sync Complete:");
  console.log(`  Added: ${result.added}`);
  console.log(`  Already existed: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    result.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log("");
}

async function cmdSyncUnsubs() {
  console.log("\n🗑️  Syncing unsubscribes from Resend → D1");
  console.log("   (Unsubscribed contacts will be DELETED from D1)\n");

  const result = await syncUnsubscribesToD1();

  console.log("\n📊 Unsubscribe Sync Complete:");
  console.log(`  Deleted from D1: ${result.deleted}`);
  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    result.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log("");
}

async function cmdList() {
  const broadcasts = await listBroadcasts(20);

  if (broadcasts.length === 0) {
    console.log("\n📭 No broadcasts found.\n");
    return;
  }

  console.log("\n📬 Recent Broadcasts:\n");
  console.log(
    "  ID                                    Status      Name / Created",
  );
  console.log(
    "  ─────────────────────────────────────────────────────────────────────",
  );

  for (const b of broadcasts) {
    const id = (b.id || "").substring(0, 36);
    const status = formatStatus(b.status || "unknown").padEnd(10);
    const name = b.name || formatDate(b.created_at);
    console.log(`  ${id}  ${status}  ${name}`);
  }

  console.log("\n  Use 'preview <id>' to see subject and content.");

  console.log("");
}

async function cmdPreview(id: string) {
  const broadcast = await getBroadcast(id);

  console.log("\n📧 Broadcast Preview\n");
  console.log(`  ID:        ${broadcast.id}`);
  console.log(`  Name:      ${broadcast.name || "(unnamed)"}`);
  console.log(`  Status:    ${formatStatus(broadcast.status)}`);
  console.log(`  From:      ${broadcast.from}`);
  console.log(`  Subject:   ${broadcast.subject}`);
  console.log(`  Created:   ${formatDate(broadcast.created_at)}`);
  console.log(`  Scheduled: ${formatDate(broadcast.scheduled_at)}`);
  console.log(`  Sent:      ${formatDate(broadcast.sent_at)}`);

  if (broadcast.preview_text) {
    console.log(`  Preview:   ${broadcast.preview_text}`);
  }

  console.log("\n  HTML Preview (first 500 chars):");
  console.log("  ───────────────────────────────");
  const preview = broadcast.html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 500);
  console.log(`  ${preview}...`);

  console.log("");
}

async function cmdCreate(options: {
  subject: string;
  body: string;
  name?: string;
  from?: string;
}) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    throw new Error("RESEND_AUDIENCE_ID environment variable is required");
  }

  // Read body content
  let bodyContent: string;
  try {
    // Try to read as file first
    const file = Bun.file(options.body);
    if (await file.exists()) {
      bodyContent = await file.text();
    } else {
      // Treat as raw HTML
      bodyContent = options.body;
    }
  } catch {
    bodyContent = options.body;
  }

  // Build the email with Grove template
  const { html, text } = buildBroadcastEmail(bodyContent);

  // Create the broadcast
  const result = await createBroadcast({
    segmentId: audienceId,
    from: options.from || "Autumn <autumn@grove.place>",
    subject: options.subject,
    html,
    text,
    name: options.name,
    replyTo: "autumn@grove.place",
  });

  console.log("\n✅ Broadcast created!\n");
  console.log(`  ID:      ${result.id}`);
  console.log(`  Subject: ${options.subject}`);
  console.log(`  Status:  📝 Draft`);
  console.log(
    `\n  Preview: bun run scripts/email/broadcast.ts preview ${result.id}`,
  );
  console.log(
    `  Send:    bun run scripts/email/broadcast.ts send ${result.id}`,
  );
  console.log("");
}

async function cmdSend(id: string) {
  // Get broadcast details first
  const broadcast = await getBroadcast(id);

  if (broadcast.status !== "draft") {
    console.log(`\n❌ Cannot send: broadcast is already ${broadcast.status}\n`);
    return;
  }

  // Get audience count
  const contacts = await listAllContacts();
  const activeContacts = contacts.filter((c) => !c.unsubscribed);

  console.log("\n📧 Ready to Send Broadcast\n");
  console.log(`  Subject:    ${broadcast.subject}`);
  console.log(`  Recipients: ${activeContacts.length} active contact(s)`);
  console.log(`  From:       ${broadcast.from}`);

  // Confirm send
  console.log("\n⚠️  This will send the email to all active contacts.");
  process.stdout.write("  Type 'SEND' to confirm: ");

  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  reader.releaseLock();

  const input = new TextDecoder().decode(value).trim();

  if (input !== "SEND") {
    console.log("\n❌ Cancelled.\n");
    return;
  }

  // Send it
  const result = await sendBroadcast(id);

  console.log("\n✅ Broadcast sent!\n");
  console.log(`  ID: ${result.id}`);
  console.log(`  ${activeContacts.length} email(s) queued for delivery.`);
  console.log("");
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case "status":
        await cmdStatus();
        break;

      case "sync":
        await cmdSync();
        break;

      case "sync-unsubs":
        await cmdSyncUnsubs();
        break;

      case "list":
        await cmdList();
        break;

      case "preview": {
        const id = args[1];
        if (!id) {
          console.error("\n❌ Error: preview requires a broadcast ID\n");
          console.error(
            "  Usage: bun run scripts/email/broadcast.ts preview <id>\n",
          );
          process.exit(1);
        }
        await cmdPreview(id);
        break;
      }

      case "create": {
        const { values } = parseArgs({
          args: args.slice(1),
          options: {
            subject: { type: "string", short: "s" },
            body: { type: "string", short: "b" },
            name: { type: "string", short: "n" },
            from: { type: "string", short: "f" },
          },
        });

        if (!values.subject) {
          console.error("\n❌ Error: --subject is required\n");
          console.error(
            "  Usage: bun run scripts/email/broadcast.ts create --subject 'Hello!' --body './email.html'\n",
          );
          process.exit(1);
        }

        if (!values.body) {
          console.error("\n❌ Error: --body is required\n");
          console.error(
            "  Usage: bun run scripts/email/broadcast.ts create --subject 'Hello!' --body './email.html'\n",
          );
          process.exit(1);
        }

        await cmdCreate({
          subject: values.subject,
          body: values.body,
          name: values.name,
          from: values.from,
        });
        break;
      }

      case "send": {
        const id = args[1];
        if (!id) {
          console.error("\n❌ Error: send requires a broadcast ID\n");
          console.error(
            "  Usage: bun run scripts/email/broadcast.ts send <id>\n",
          );
          process.exit(1);
        }
        await cmdSend(id);
        break;
      }

      default:
        console.error(`\n❌ Unknown command: ${command}\n`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(
      `\n❌ Error: ${error instanceof Error ? error.message : error}\n`,
    );
    process.exit(1);
  }
}

main();
