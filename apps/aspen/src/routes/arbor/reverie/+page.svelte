<script lang="ts">
	import GlassChat from "@autumnsgrove/lattice/ui/components/ui/glasschat/GlassChat.svelte";
	import { createAIChatController } from "@autumnsgrove/lattice/ui/components/ui/glasschat/controller.svelte";
	import type {
		ChatMessageData,
		ChatRoleMap,
	} from "@autumnsgrove/lattice/ui/components/ui/glasschat/types";
	import { TierGate } from "@autumnsgrove/lattice/ui/vineyard";
	import type { GroveTier } from "@autumnsgrove/lattice/ui/vineyard/types";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { getCSRFToken } from "@autumnsgrove/lattice/utils/api";
	import { phaseIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import ReverieHeader from "./ReverieHeader.svelte";
	import ReverieChangeCard from "./ReverieChangeCard.svelte";
	import ReverieResultCard from "./ReverieResultCard.svelte";

	let { data } = $props();

	// ── Role Map ──────────────────────────────────────────────────────────────
	// Reverie uses Midnight Bloom tones — deep plum base with violet borders.
	// User bubbles are subtle white glass for contrast.
	const REVERIE_ROLES: ChatRoleMap = {
		user: {
			label: "You",
			align: "end",
			bubbleClass: "bg-white/10 text-white",
		},
		reverie: {
			label: "Reverie",
			align: "start",
			bubbleClass:
				"bg-[rgba(88,28,135,0.15)] border border-[rgba(124,58,237,0.2)] text-white shadow-[inset_0_1px_0_rgba(139,92,246,0.06)]",
			labelClass: "text-violet-300",
		},
	};

	// ── Reverie State (domain-specific, not managed by controller) ────────────
	let pendingRequestId = $state<string | null>(null);
	let isApplying = $state(false);

	// ── Types ─────────────────────────────────────────────────────────────────
	interface ChangePreview {
		domain: string;
		field: string;
		from: unknown;
		to: unknown;
		description: string;
	}

	interface ConfigureResponseData {
		requestId: string;
		action: string;
		changes: ChangePreview[];
		domainsMatched: string[];
		atmosphereUsed?: string;
		message: string;
	}

	interface ExecuteStep {
		domain: string;
		field: string;
		success: boolean;
		error?: string;
	}

	interface ExecuteResponseData {
		requestId: string;
		appliedCount: number;
		failedCount: number;
		steps: ExecuteStep[];
	}

	interface ReverieResponse<T = unknown> {
		success: boolean;
		data?: T;
		error?: { code: string; message: string };
	}

	// ── Error Messages ────────────────────────────────────────────────────────
	// Map every known error code to a friendly, actionable message.
	// Never display raw API error messages — they may leak internal details.
	// Fed into the controller's errorMessages option for automatic resolution.
	const SAFE_ERROR_MESSAGES: Record<string, string> = {
		// Reverie worker errors (REV-XXX)
		"REV-001": "You need to be signed in to use Reverie.",
		"REV-002": "Your session has expired. Please sign in again.",
		"REV-003": "Reverie requires a paid plan. Take Root to unlock it!",
		"REV-004": "Reverie didn't understand that request. Try rephrasing?",
		"REV-005": "That message is too long. Try keeping it shorter.",
		"REV-006":
			'Reverie couldn\'t find any settings to change. Try being more specific — for example, "make my accent color warmer" or "change my font to something cozy".',
		"REV-007": "That change preview has expired. Send your request again to get a fresh preview.",
		"REV-008": "Those settings are read-only and can't be changed through Reverie.",
		"REV-009":
			"Some of the values Reverie chose didn't pass validation. Try rephrasing your request.",
		"REV-010": "Reverie couldn't apply those changes. Please try again.",
		"REV-011": "You're sending requests too quickly. Take a breath and try again in a moment.",
		"REV-012": "Reverie's AI is temporarily unavailable. Please try again in a moment.",
		"REV-013": "Reverie's AI ran into an issue. Please try again.",
		"REV-014": "Something went wrong on our end. Please try again in a moment.",
		"REV-015": "Reverie couldn't save that change. Please try again.",
		// Engine proxy errors (GROVE-API-XXX)
		"GROVE-API-010": "Reverie is temporarily unavailable. Please try again in a moment.",
		"GROVE-API-020": "You need to be signed in to use Reverie.",
	};
	const DEFAULT_CONFIGURE_ERROR = "Reverie couldn't process that request. Please try again.";
	const DEFAULT_EXECUTE_ERROR = "Some changes couldn't be applied. Please try again.";

	// ── Reverie Fetch Helper ──────────────────────────────────────────────────
	// Uses fetch directly instead of api.post because api.post throws on non-2xx,
	// which loses the structured error codes we need for friendly messages.
	async function reverieFetch<T>(url: string, body: unknown): Promise<ReverieResponse<T>> {
		const csrfToken = getCSRFToken();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};
		if (csrfToken) {
			headers["X-CSRF-Token"] = csrfToken;
			headers["csrf-token"] = csrfToken;
		}
		const res = await fetch(url, {
			method: "POST",
			headers,
			credentials: "include",
			body: JSON.stringify(body),
		});
		return res.json() as Promise<ReverieResponse<T>>;
	}

	// ── Chat Controller ──────────────────────────────────────────────────────
	const chat = createAIChatController({
		aiRole: "reverie",
		errorMessages: SAFE_ERROR_MESSAGES,
		defaultError: DEFAULT_CONFIGURE_ERROR,
		async onSend(input) {
			const result = await reverieFetch<ConfigureResponseData>("/api/reverie/configure", {
				input,
				session_id: chat.sessionId,
			});

			if (!result || !result.success || !result.data) {
				console.error("[Reverie] Configure failed:", result?.error);
				// Throw the error object — extractErrorCode finds .code,
				// errorMessages maps it to a friendly string
				throw result?.error ?? new Error(DEFAULT_CONFIGURE_ERROR);
			}

			const { requestId, changes, message, atmosphereUsed } = result.data;
			pendingRequestId = requestId;

			const domainSet = new Set(changes.map((c) => c.domain.split(".")[0]));

			return {
				content: message,
				metadata: {
					type: "change-preview",
					requestId,
					changes,
					atmosphereUsed,
					domainCount: domainSet.size,
					applied: false,
				},
			};
		},
	});

	// ── Apply Changes ─────────────────────────────────────────────────────────
	async function handleApply(messageId: string, requestId: string, changes: ChangePreview[]) {
		isApplying = true;

		try {
			const executeChanges = changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				value: c.to,
			}));

			const result = await reverieFetch<ExecuteResponseData>("/api/reverie/execute", {
				request_id: requestId,
				changes: executeChanges,
			});

			// Mark the change card as applied
			chat.updateMessageMetadata(messageId, { applied: true });

			if (!result || !result.success || !result.data) {
				const errMsg =
					(result?.error?.code && result.error.code in SAFE_ERROR_MESSAGES
						? SAFE_ERROR_MESSAGES[result.error.code]
						: null) ?? DEFAULT_EXECUTE_ERROR;
				chat.addMessage("reverie", errMsg, {
					metadata: {
						type: "execution-result",
						appliedCount: 0,
						failedCount: changes.length,
						steps: [],
					},
				});
				toast.error(errMsg);
				return;
			}

			const { appliedCount, failedCount, steps } = result.data;

			chat.addMessage(
				"reverie",
				failedCount > 0
					? `Applied ${appliedCount} of ${appliedCount + failedCount} changes.`
					: `Applied ${appliedCount} changes.`,
				{
					metadata: {
						type: "execution-result",
						appliedCount,
						failedCount,
						steps,
					},
				},
			);

			if (failedCount > 0) {
				toast.warning(`${appliedCount} applied, ${failedCount} failed.`);
			} else {
				toast.success("Your grove has a new atmosphere.");
			}

			pendingRequestId = null;
		} catch {
			toast.error(DEFAULT_EXECUTE_ERROR);
			chat.addMessage("reverie", DEFAULT_EXECUTE_ERROR);
		} finally {
			isApplying = false;
		}
	}

	function handleCancel(messageId: string) {
		chat.updateMessageMetadata(messageId, { applied: true, cancelled: true });
		pendingRequestId = null;
		chat.addMessage("reverie", "No changes applied. What else would you like to try?");
	}

	// ── Atmosphere Quick-Pick ─────────────────────────────────────────────────
	function handleAtmospherePick(keyword: string) {
		chat.inputValue = `Make my site feel ${keyword}`;
		chat.send();
	}
</script>

<svelte:head>
	<title>Reverie - Grove</title>
</svelte:head>

<div class="reverie-page">
	<TierGate required="seedling" current={data.userTier as GroveTier}>
		<GlassChat
			messages={chat.messages}
			roles={REVERIE_ROLES}
			isLoading={chat.isLoading}
			loadingRole="reverie"
			error={chat.error}
			bind:inputValue={chat.inputValue}
			onSend={chat.send}
			inputDisabled={chat.isLoading || isApplying}
			inputPlaceholder="Describe your grove..."
			variant="dark"
			logLabel="Reverie conversation"
			class="h-[calc(100vh-8rem)] max-h-[800px]"
		>
			{#snippet header()}
				<ReverieHeader onAtmospherePick={handleAtmospherePick} />
			{/snippet}

			{#snippet messageContent(message: ChatMessageData)}
				{#if message.metadata?.type === "change-preview"}
					<ReverieChangeCard
						changes={message.metadata.changes as ChangePreview[]}
						requestId={message.metadata.requestId as string}
						atmosphereUsed={message.metadata.atmosphereUsed as string | undefined}
						applied={!!message.metadata.applied}
						cancelled={!!message.metadata.cancelled}
						{isApplying}
						onApply={() =>
							handleApply(
								message.id,
								message.metadata?.requestId as string,
								message.metadata?.changes as ChangePreview[],
							)}
						onCancel={() => handleCancel(message.id)}
					/>
				{:else if message.metadata?.type === "execution-result"}
					<ReverieResultCard
						appliedCount={message.metadata.appliedCount as number}
						failedCount={message.metadata.failedCount as number}
						steps={message.metadata.steps as ExecuteStep[]}
					/>
				{:else}
					<p class="m-0 leading-relaxed whitespace-pre-wrap">{message.content}</p>
				{/if}
			{/snippet}
		</GlassChat>

		<!-- Screen reader announcement for applying state -->
		<span class="sr-only" aria-live="assertive" aria-atomic="true">
			{isApplying ? "Applying changes, please wait." : ""}
		</span>

		{#snippet fallback()}
			<div class="tier-fallback">
				<div class="fallback-glow"></div>
				<div class="fallback-content">
					<div class="fallback-icon">
						<phaseIcons.sparkles size={32} aria-hidden="true" />
					</div>
					<h2 class="text-xl font-semibold text-bark-800 dark:text-white mb-2">Reverie</h2>
					<p class="text-bark-600 dark:text-white/60 text-sm mb-1">
						Describe your grove, and it becomes real.
					</p>
					<p class="text-bark-500 dark:text-white/40 text-xs mb-6">
						"Make my site feel like a midnight library" — and watch it happen.
					</p>
					<a
						href="/arbor/account"
						class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
							bg-gradient-to-r from-violet-600 to-violet-500
							text-white text-sm font-medium
							hover:from-violet-500 hover:to-violet-400
							transition-all shadow-lg shadow-violet-500/25"
					>
						<stateIcons.lock size={14} aria-hidden="true" />
						Take Root to unlock Reverie
					</a>
				</div>
			</div>
		{/snippet}
	</TierGate>
</div>

<style>
	.reverie-page {
		padding: 1rem;
		height: 100%;

		/* ── Midnight Bloom palette (CSS custom properties) ───────────── */
		--reverie-plum: #581c87;
		--reverie-purple: #7c3aed;
		--reverie-violet: #8b5cf6;
		--reverie-amber: #f59e0b;
		--reverie-cream: #fef3c7;
		--reverie-gold: #fcd34d;

		/* Atmospheric background glow — subtle deep plum radial */
		background:
			radial-gradient(ellipse at 30% 20%, rgba(88, 28, 135, 0.08) 0%, transparent 50%),
			radial-gradient(ellipse at 70% 80%, rgba(124, 58, 237, 0.05) 0%, transparent 50%);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.tier-fallback {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		border-radius: 0.75rem;
		overflow: hidden;
		background: rgba(139, 92, 246, 0.04);
		border: 1px solid rgba(139, 92, 246, 0.12);
	}

	:global(.dark) .tier-fallback {
		background: rgba(0, 0, 0, 0.3);
		border-color: rgba(139, 92, 246, 0.15);
	}

	.fallback-glow {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at center, rgba(139, 92, 246, 0.06) 0%, transparent 60%),
			radial-gradient(ellipse at 60% 40%, rgba(124, 58, 237, 0.04) 0%, transparent 50%);
		pointer-events: none;
	}

	:global(.dark) .fallback-glow {
		background:
			radial-gradient(ellipse at center, rgba(88, 28, 135, 0.12) 0%, transparent 60%),
			radial-gradient(ellipse at 60% 40%, rgba(124, 58, 237, 0.06) 0%, transparent 50%);
	}

	.fallback-content {
		position: relative;
		text-align: center;
		padding: 2rem;
	}

	.fallback-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background: rgba(139, 92, 246, 0.1);
		color: rgb(124, 58, 237);
		margin-bottom: 1rem;
		box-shadow: 0 0 24px rgba(124, 58, 237, 0.08);
	}

	:global(.dark) .fallback-icon {
		background: rgba(88, 28, 135, 0.2);
		color: rgb(167, 139, 250);
		box-shadow: 0 0 24px rgba(124, 58, 237, 0.15);
	}
</style>
