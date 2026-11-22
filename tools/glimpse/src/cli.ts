#!/usr/bin/env bun
/**
 * glimpse — look at what you built.
 *
 * Playwright screenshots with Grove theme injection. Two commands: capture one
 * page, or matrix every season × theme of it. Data seeding is not here on
 * purpose — `./scripts/dev-stack.sh seed [blog|empty|fake|fresh]` already owns
 * that, and one entry point per job is the whole point of a cleanup.
 */

import { devices } from "@playwright/test";

import { launch } from "./browser";
import { capture, type CaptureOptions, type CaptureResult } from "./capture";
import { matrix } from "./matrix";
import { SAFE_SEASONS, SAFE_THEMES } from "./inject";

const HELP = `
╭────────────╮
│  glimpse   │
╰────────────╯ — look at what you built

  capture <url>   Screenshot one page
  matrix <url>    Screenshot every season × theme
  devices         List device names for --device

Flags
  -s, --season <s>      ${SAFE_SEASONS.join(" | ")}
  -t, --theme <t>       ${SAFE_THEMES.join(" | ")}
  -g, --grove-mode <b>  true | false
  -o, --out <dir>       Output directory (default .glimpse)
      --name <label>    Filename label instead of the URL slug
  -S, --selector <css>  Screenshot one element
      --device <name>   Device profile, e.g. "iPhone 13"
      --viewport <WxH>  e.g. 1440x900
      --windowed        Viewport shot instead of full page
      --logs            Print console errors (always captured into .json)
      --wait <ms>       Settle time (default 500)
      --timeout <ms>    Navigation timeout (default 30000)
      --no-inject       Skip theme injection
      --json            Machine-readable output
      --seasons a,b     matrix only (default: autumn,winter)
      --themes a,b      matrix only (default: light,dark)

Examples
  bun run glimpse capture "http://localhost:5173/?subdomain=midnight-bloom" \\
    -s autumn -t dark --logs

  bun run glimpse matrix "http://localhost:5173/?subdomain=midnight-bloom" \\
    --seasons autumn,winter --themes light,dark
`;

function fail(message: string): never {
	console.error(`✗ ${message}`);
	process.exit(1);
}

function parseArgs(argv: string[]): {
	command: string;
	url?: string;
	flags: Record<string, string | boolean>;
} {
	const [command = "help", ...rest] = argv;
	const flags: Record<string, string | boolean> = {};
	let url: string | undefined;

	const takesValue = new Set([
		"--season",
		"-s",
		"--theme",
		"-t",
		"--grove-mode",
		"-g",
		"--out",
		"-o",
		"--name",
		"--selector",
		"-S",
		"--device",
		"--viewport",
		"--wait",
		"--timeout",
		"--seasons",
		"--themes",
	]);

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i] as string;
		if (arg.startsWith("-")) {
			if (takesValue.has(arg)) {
				const value = rest[++i];
				if (value === undefined) fail(`${arg} needs a value`);
				flags[arg] = value;
			} else {
				flags[arg] = true;
			}
			continue;
		}
		if (!url) url = arg;
	}

	return { command, url, flags };
}

function flag(flags: Record<string, string | boolean>, ...names: string[]): string | undefined {
	for (const name of names) {
		const value = flags[name];
		if (typeof value === "string") return value;
	}
	return undefined;
}

function boolFlag(flags: Record<string, string | boolean>, ...names: string[]): boolean {
	return names.some((name) => flags[name] === true);
}

function listFlag(
	flags: Record<string, string | boolean>,
	names: string[],
	fallback: string[],
): string[] {
	const raw = flag(flags, ...names);
	return raw
		? raw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: fallback;
}

function parseViewport(raw: string | undefined): { width: number; height: number } | null {
	if (!raw) return null;
	const match = /^(\d+)x(\d+)$/i.exec(raw);
	if (!match) fail(`--viewport wants WIDTHxHEIGHT, got "${raw}"`);
	return { width: Number(match[1]), height: Number(match[2]) };
}

function buildOptions(flags: Record<string, string | boolean>): CaptureOptions {
	const groveModeRaw = flag(flags, "--grove-mode", "-g");
	return {
		season: flag(flags, "--season", "-s") ?? null,
		theme: flag(flags, "--theme", "-t") ?? null,
		groveMode: groveModeRaw === undefined ? null : groveModeRaw === "true",
		selector: flag(flags, "--selector", "-S") ?? null,
		device: flag(flags, "--device") ?? null,
		viewport: parseViewport(flag(flags, "--viewport")),
		fullPage: !boolFlag(flags, "--windowed"),
		logs: boolFlag(flags, "--logs"),
		waitMs: Number(flag(flags, "--wait") ?? 500),
		timeoutMs: Number(flag(flags, "--timeout") ?? 30_000),
		outDir: flag(flags, "--out", "-o") ?? ".glimpse",
		name: flag(flags, "--name") ?? null,
		noInject: boolFlag(flags, "--no-inject"),
	};
}

/** Console lines worth an agent's attention, deduped. */
function problems(result: CaptureResult): string[] {
	const seen = new Set<string>();
	const lines: string[] = [];
	for (const entry of result.console) {
		if (entry.type !== "error" && entry.type !== "pageerror" && entry.type !== "warning") continue;
		const line = `[${entry.type}] ${entry.text}`;
		if (seen.has(line)) continue;
		seen.add(line);
		lines.push(line);
	}
	return lines;
}

function report(result: CaptureResult, asJson: boolean, showLogs: boolean): void {
	if (asJson) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}
	if (result.error) {
		console.error(`  ✗ ${result.url}${result.path ? ` → ${result.path}` : ""}: ${result.error}`);
		return;
	}
	console.log(`  ✓ ${result.path}  (${result.httpStatus}, ${result.durationMs}ms)`);
	if (showLogs) {
		for (const line of problems(result)) console.log(`      ${line}`);
	}
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	const { command, url, flags } = parseArgs(argv);

	if (command === "help" || command === "--help" || command === "-h") {
		console.log(HELP);
		return;
	}

	if (command === "devices") {
		const names = Object.keys(devices).sort();
		for (const name of names) console.log(`  ${name}`);
		return;
	}

	if (command !== "capture" && command !== "matrix") {
		fail(`unknown command "${command}" (try: capture, matrix, devices, help)`);
	}
	if (!url) fail(`${command} needs a URL`);

	const asJson = boolFlag(flags, "--json");
	const options = buildOptions(flags);
	const browser = await launch();

	try {
		if (command === "capture") {
			const result = await capture(browser, url, options);
			report(result, asJson, Boolean(options.logs));
			if (result.error) process.exitCode = 1;
			return;
		}

		const { results, failed } = await matrix(browser, url, {
			...options,
			seasons: listFlag(flags, ["--seasons"], ["autumn", "winter"]),
			themes: listFlag(flags, ["--themes"], ["light", "dark"]),
		});

		if (asJson) {
			console.log(JSON.stringify({ url, results, failed }, null, 2));
		} else {
			for (const result of results) report(result, false, Boolean(options.logs));
			console.log(`\n  ${results.length - failed}/${results.length} captured → ${options.outDir}`);
		}
		if (failed > 0) process.exitCode = 1;
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(`✗ ${(err as Error).message}`);
	process.exit(1);
});
