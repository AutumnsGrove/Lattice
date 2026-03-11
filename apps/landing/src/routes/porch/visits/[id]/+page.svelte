<script lang="ts">
	import { deserialize } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/stores";
	import {
		GlassChat,
		GlassCard,
		createConversationalChatController,
	} from "@autumnsgrove/lattice/ui";
	import type { ChatMessageData } from "@autumnsgrove/lattice/ui";
	import Header from "$lib/components/Header.svelte";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import Footer from "$lib/components/Footer.svelte";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import { MessageCircle, Clock, CheckCircle, ArrowLeft } from "@lucide/svelte";
	import { toChatMessages, PORCH_VISITOR_ROLES } from "$lib/utils/porch";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusConfig = {
		open: {
			label: "Open",
			icon: MessageCircle,
			color: "text-info bg-info-bg",
		},
		pending: {
			label: "Pending",
			icon: Clock,
			color: "text-warning bg-warning-bg",
		},
		resolved: {
			label: "Resolved",
			icon: CheckCircle,
			color: "text-success bg-success-bg",
		},
	} as const;

	const categoryLabels: Record<string, string> = {
		billing: "Billing",
		technical: "Technical",
		account: "Account",
		hello: "Just saying hi",
		other: "Other",
	};

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	const isResolved = $derived(data.visit?.status === "resolved");

	// ── Chat Controller ──────────────────────────────────────────────────────
	const chat = createConversationalChatController({
		localRole: "visitor",
		async onSend(message) {
			const formData = new FormData();
			formData.set("content", message);

			const response = await fetch($page.url.pathname + "?/reply", {
				method: "POST",
				body: formData,
			});

			const result = deserialize(await response.text());

			if (result.type !== "success") {
				throw new Error("Failed to send reply");
			}

			await invalidateAll();
		},
	});

	// Sync server messages into the controller whenever page data changes
	$effect(() => {
		chat.messages = toChatMessages(data.messages);
	});
</script>

<svelte:head>
	<title>{data.visit?.subject || "Visit"} - The Porch</title>
</svelte:head>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Back link -->
		<a
			href="/porch/visits"
			class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground font-sans mb-6"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to visits
		</a>

		{#if !data.visit}
			<!-- Visit not found -->
			<GlassCard class="text-center">
				<Logo class="w-12 h-12 mx-auto mb-4" season={seasonStore.current} />
				<h2 class="text-xl font-serif text-foreground mb-2">Visit not found</h2>
				<p class="text-foreground-muted font-sans">
					This visit doesn't exist or you don't have access to it.
				</p>
			</GlassCard>
		{:else}
			{@const config =
				statusConfig[data.visit.status as keyof typeof statusConfig] || statusConfig.open}

			<!-- Visit Header -->
			<GlassCard class="mb-6">
				<div class="flex items-start justify-between gap-4 mb-4">
					<div>
						<span class="text-xs font-mono text-foreground/50">{data.visit.visit_number}</span>
						<h1 class="text-xl font-serif text-foreground mt-1">{data.visit.subject}</h1>
						<p class="text-sm text-foreground-muted font-sans mt-1">
							{categoryLabels[data.visit.category] || data.visit.category} &middot; Started {formatDate(
								data.visit.created_at,
							)}
						</p>
					</div>
					<span
						class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-sans {config.color}"
					>
						<config.icon class="w-4 h-4" />
						{config.label}
					</span>
				</div>
			</GlassCard>

			<!-- Chat -->
			{#if form?.success}
				<GlassCard class="bg-success-bg border-success/30 mb-4">
					<p class="text-sm text-success font-sans">Reply sent! Autumn will see it soon.</p>
				</GlassCard>
			{/if}

			{#if form?.error}
				<GlassCard class="bg-error-bg border-error/30 mb-4">
					<p class="text-sm text-error font-sans">{form.error}</p>
				</GlassCard>
			{/if}

			<GlassChat
				messages={chat.messages}
				roles={PORCH_VISITOR_ROLES}
				variant="default"
				bind:inputValue={chat.inputValue}
				onSend={chat.send}
				inputDisabled={isResolved || chat.isLoading}
				inputPlaceholder={isResolved
					? "This conversation has been resolved"
					: "Continue the conversation..."}
				logLabel="Porch conversation"
				class="h-[500px]"
				inputClass="border-input bg-surface-hover/30"
			>
				{#snippet messageContent(message: ChatMessageData)}
					<p class="m-0 leading-relaxed whitespace-pre-wrap text-foreground font-sans">
						{message.content}
					</p>
					<time datetime={message.timestamp} class="block text-xs text-foreground/50 mt-1">
						{new Date(message.timestamp).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							hour: "numeric",
							minute: "2-digit",
						})}
					</time>
				{/snippet}

				{#snippet inputFooter()}
					{#if isResolved}
						<div
							class="flex items-center justify-center gap-2 text-sm text-foreground-muted font-sans py-1"
						>
							<CheckCircle class="w-4 h-4 text-success" />
							<span>
								This conversation has been resolved. Need more help?
								<a href="/porch/new" class="text-primary hover:text-primary/80 underline"
									>Start a new visit</a
								>
							</span>
						</div>
					{/if}
				{/snippet}
			</GlassChat>
		{/if}
	</div>
</main>

<Footer />
