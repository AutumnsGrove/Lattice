<script lang="ts">
	import { cn } from "$lib/ui/utils";
	import {
		Info,
		AlertTriangle,
		Sparkles,
		PartyPopper,
		X,
	} from "lucide-svelte";
	import type { GroveMessage, GroveMessageType } from "./types";

	interface Props {
		messages: GroveMessage[];
		dismissible?: boolean;
		centered?: boolean;
		class?: string;
	}

	let {
		messages,
		dismissible = false,
		centered = false,
		class: className,
	}: Props = $props();

	// localStorage key for dismissed message IDs
	const STORAGE_KEY = "grove_dismissed_messages";

	// Track dismissed IDs in reactive state
	let dismissedIds = $state<Set<string>>(loadDismissed());

	function loadDismissed(): Set<string> {
		if (typeof window === "undefined") return new Set();
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? new Set(JSON.parse(stored)) : new Set();
		} catch {
			return new Set();
		}
	}

	function dismiss(id: string) {
		dismissedIds.add(id);
		dismissedIds = new Set(dismissedIds);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissedIds]));
		} catch {
			// localStorage full or unavailable — dismiss visually only
		}
	}

	// Filter out dismissed, sort pinned first
	let visibleMessages = $derived(
		messages
			.filter((m) => !dismissedIds.has(m.id))
			.sort((a, b) => {
				if (a.pinned && !b.pinned) return -1;
				if (!a.pinned && b.pinned) return 1;
				return 0;
			}),
	);

	// Type → icon mapping
	const typeConfig: Record<
		GroveMessageType,
		{
			icon: typeof Info;
			accent: string;
			bg: string;
			border: string;
		}
	> = {
		info: {
			icon: Info,
			accent: "text-teal-700 dark:text-teal-300",
			bg: "bg-teal-50/60 dark:bg-teal-950/30",
			border: "border-teal-300/50 dark:border-teal-700/40",
		},
		warning: {
			icon: AlertTriangle,
			accent: "text-amber-700 dark:text-amber-300",
			bg: "bg-amber-50/60 dark:bg-amber-950/30",
			border: "border-amber-300/50 dark:border-amber-700/40",
		},
		celebration: {
			icon: PartyPopper,
			accent: "text-emerald-700 dark:text-emerald-300",
			bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
			border: "border-emerald-300/50 dark:border-emerald-700/40",
		},
		update: {
			icon: Sparkles,
			accent: "text-violet-700 dark:text-violet-300",
			bg: "bg-violet-50/60 dark:bg-violet-950/30",
			border: "border-violet-300/50 dark:border-violet-700/40",
		},
	};

	// Parse body text into segments of plain text and links
	// Matches: https://..., http://..., and bare domains like grove.place/path
	const URL_RE =
		/(?:https?:\/\/[^\s<]+)|(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gi;

	interface TextSegment {
		type: "text";
		value: string;
	}
	interface LinkSegment {
		type: "link";
		href: string;
		label: string;
	}
	type BodySegment = TextSegment | LinkSegment;

	function parseBody(text: string): BodySegment[] {
		const segments: BodySegment[] = [];
		let lastIndex = 0;

		for (const match of text.matchAll(URL_RE)) {
			const matchStart = match.index!;
			// Add text before match
			if (matchStart > lastIndex) {
				segments.push({ type: "text", value: text.slice(lastIndex, matchStart) });
			}
			const raw = match[0];
			const href = raw.startsWith("http") ? raw : `https://${raw}`;
			segments.push({ type: "link", href, label: raw });
			lastIndex = matchStart + raw.length;
		}

		// Add remaining text
		if (lastIndex < text.length) {
			segments.push({ type: "text", value: text.slice(lastIndex) });
		}

		return segments.length > 0 ? segments : [{ type: "text", value: text }];
	}

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		} catch {
			return "";
		}
	}
</script>

{#if visibleMessages.length > 0}
	<div
		class={cn("flex flex-col gap-3", className)}
		role="region"
		aria-label="Messages from Grove"
	>
		{#each visibleMessages as message (message.id)}
			{@const config = typeConfig[message.message_type]}
			{#if centered}
				<!-- Centered banner variant (landing page) -->
				<div
					class={cn(
						"relative rounded-xl border backdrop-blur-sm px-5 py-4 text-center",
						"transition-opacity duration-200",
						config.bg,
						config.border,
					)}
					role="article"
				>
					<h3
						class="font-sans font-medium text-sm text-foreground leading-snug mb-1"
					>
						{message.title}
					</h3>
					<p
						class="font-sans text-sm text-foreground-muted leading-relaxed whitespace-pre-line"
					>
						{#each parseBody(message.body) as segment}
							{#if segment.type === "link"}
								<a
									href={segment.href}
									target="_blank"
									rel="noopener noreferrer"
									class="underline decoration-current/40 hover:decoration-current transition-colors"
								>{segment.label}</a>
							{:else}
								{segment.value}
							{/if}
						{/each}
					</p>
				</div>
			{:else}
				<!-- Default variant (arbor admin) -->
				<div
					class={cn(
						"relative rounded-xl border backdrop-blur-sm px-4 py-3",
						"transition-opacity duration-200",
						config.bg,
						config.border,
					)}
					role="article"
				>
					<div class="flex items-start gap-3">
						<!-- Icon -->
						<div class={cn("mt-0.5 flex-shrink-0", config.accent)}>
							<config.icon class="w-5 h-5" aria-hidden="true" />
						</div>

						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-baseline gap-2 mb-0.5">
								<h3
									class="font-sans font-medium text-sm text-foreground leading-snug"
								>
									{message.title}
								</h3>
								{#if message.pinned}
									<span
										class="text-[10px] font-sans font-medium uppercase tracking-wider text-foreground-faint"
										>pinned</span
									>
								{/if}
							</div>
							<p
								class="font-sans text-sm text-foreground-muted leading-relaxed whitespace-pre-line"
							>
								{#each parseBody(message.body) as segment}
									{#if segment.type === "link"}
										<a
											href={segment.href}
											target="_blank"
											rel="noopener noreferrer"
											class="underline decoration-current/40 hover:decoration-current transition-colors"
										>{segment.label}</a>
									{:else}
										{segment.value}
									{/if}
								{/each}
							</p>
							<time
								class="block mt-1 text-xs text-foreground-faint font-sans"
								datetime={message.created_at}
							>
								{formatDate(message.created_at)}
							</time>
						</div>

						<!-- Dismiss button -->
						{#if dismissible}
							<button
								type="button"
								onclick={() => dismiss(message.id)}
								class="flex-shrink-0 p-1 rounded-md text-foreground-faint hover:text-foreground-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
								aria-label="Dismiss message: {message.title}"
							>
								<X class="w-4 h-4" />
							</button>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
