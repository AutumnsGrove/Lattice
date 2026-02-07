<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard, GroveMessages } from '@autumnsgrove/groveengine/ui';
	import type { GroveMessage, GroveMessageChannel } from '@autumnsgrove/groveengine/ui';
	import {
		Plus,
		Pencil,
		Trash2,
		Eye,
		EyeOff,
		Pin,
		Info,
		AlertTriangle,
		Sparkles,
		PartyPopper
	} from 'lucide-svelte';

	interface DbMessage {
		id: string;
		channel: string;
		title: string;
		body: string;
		message_type: string;
		pinned: number;
		published: number;
		expires_at: string | null;
		created_by: string;
		created_at: string;
		updated_at: string;
	}

	let { data }: { data: PageData } = $props();

	// UI state
	let showCreateForm = $state(false);
	let editingId = $state<string | null>(null);
	let previewChannel = $state<GroveMessageChannel | null>(null);

	// All channels in display order
	const channels: { key: GroveMessageChannel; label: string }[] = [
		{ key: 'landing', label: 'Landing' },
		{ key: 'arbor', label: 'Arbor' },
		{ key: 'plant', label: 'Plant' },
		{ key: 'meadow', label: 'Meadow' },
		{ key: 'clearing', label: 'Clearing' }
	];

	// Type config for display
	const typeConfig: Record<string, { label: string; icon: typeof Info; color: string }> = {
		info: { label: 'Info', icon: Info, color: 'text-teal-600 dark:text-teal-400' },
		warning: { label: 'Warning', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' },
		celebration: { label: 'Celebration', icon: PartyPopper, color: 'text-emerald-600 dark:text-emerald-400' },
		update: { label: 'Update', icon: Sparkles, color: 'text-violet-600 dark:text-violet-400' }
	};

	// Group messages by channel
	let landingMessages = $derived(data.messages.filter((m: DbMessage) => m.channel === 'landing'));
	let arborMessages = $derived(data.messages.filter((m: DbMessage) => m.channel === 'arbor'));
	let plantMessages = $derived(data.messages.filter((m: DbMessage) => m.channel === 'plant'));
	let meadowMessages = $derived(data.messages.filter((m: DbMessage) => m.channel === 'meadow'));
	let clearingMessages = $derived(data.messages.filter((m: DbMessage) => m.channel === 'clearing'));

	// Channel → messages lookup for snippet rendering
	function getChannelMessages(channel: GroveMessageChannel): DbMessage[] {
		switch (channel) {
			case 'landing': return landingMessages;
			case 'arbor': return arborMessages;
			case 'plant': return plantMessages;
			case 'meadow': return meadowMessages;
			case 'clearing': return clearingMessages;
		}
	}

	// Preview data — transforms DB row into component-compatible shape
	function toPreviewMessages(channel: GroveMessageChannel): GroveMessage[] {
		return data.messages
			.filter((m: DbMessage) => m.channel === channel && m.published)
			.map((m: DbMessage) => ({
				id: m.id,
				title: m.title,
				body: m.body,
				message_type: m.message_type as GroveMessage['message_type'],
				pinned: !!m.pinned,
				created_at: m.created_at
			}));
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	function statusLabel(msg: { published: number; expires_at: string | null }): string {
		if (isExpired(msg.expires_at)) return 'expired';
		return msg.published ? 'published' : 'draft';
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'published':
				return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
			case 'draft':
				return 'bg-cream-100 dark:bg-bark-700 text-foreground-subtle dark:text-cream-300';
			case 'expired':
				return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
			default:
				return '';
		}
	}

	// Stats summary line
	let statsLine = $derived(
		`${data.stats.total} total · ${data.stats.published} published · ` +
		channels.map(c => `${data.stats.byChannel[c.key] ?? 0} ${c.key}`).join(' · ')
	);
</script>

{#snippet channelSelect(id: string, name: string, value?: string)}
	<select {id} {name} {value}
		class="px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground">
		{#each channels as ch}
			<option value={ch.key}>{ch.label}</option>
		{/each}
	</select>
{/snippet}

{#snippet messageCard(msg: DbMessage)}
	{@const config = typeConfig[msg.message_type] || typeConfig.info}
	{@const status = statusLabel(msg)}
	{@const TypeIcon = config.icon}
	<GlassCard class="p-4">
		{#if editingId === msg.id}
			<!-- Edit Form -->
			<form method="POST" action="?/update" use:enhance={() => {
				return async ({ update }) => {
					await update();
					editingId = null;
				};
			}}>
				<input type="hidden" name="id" value={msg.id} />
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
					<input name="title" value={msg.title} required
						class="px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground" />
					<div class="grid grid-cols-2 gap-2">
						{@render channelSelect('', 'channel', msg.channel)}
						<select name="message_type" value={msg.message_type}
							class="px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground">
							<option value="info">Info</option>
							<option value="warning">Warning</option>
							<option value="celebration">Celebration</option>
							<option value="update">Update</option>
						</select>
					</div>
				</div>
				<textarea name="body" rows="2" required
					class="w-full px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground resize-y mb-3"
				>{msg.body}</textarea>
				<div class="flex items-center gap-3 mb-3">
					<input name="expires_at" type="datetime-local" value={msg.expires_at?.slice(0, 16) || ''}
						class="px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground" />
					<label class="flex items-center gap-2 text-sm font-sans text-foreground cursor-pointer">
						<input type="checkbox" name="pinned" checked={!!msg.pinned} />
						Pinned
					</label>
				</div>
				<div class="flex gap-2">
					<button type="submit" class="px-3 py-1.5 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors">Save</button>
					<button type="button" onclick={() => (editingId = null)} class="px-3 py-1.5 text-foreground-muted text-sm font-sans hover:text-foreground transition-colors">Cancel</button>
				</div>
			</form>
		{:else}
			<!-- Display -->
			<div class="flex items-start gap-3">
				<TypeIcon class="w-5 h-5 mt-0.5 flex-shrink-0 {config.color}" />
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-0.5">
						<span class="text-sm font-sans font-medium text-foreground">{msg.title}</span>
						{#if msg.pinned}
							<Pin class="w-3 h-3 text-foreground-muted" />
						{/if}
						<span class="text-[10px] font-sans px-1.5 py-0.5 rounded {statusColor(status)}">{status}</span>
					</div>
					<p class="text-sm font-sans text-foreground-muted leading-relaxed">{msg.body}</p>
					<div class="text-xs font-sans text-foreground-faint mt-1">
						{formatDate(msg.created_at)}
						{#if msg.expires_at}
							· expires {formatDate(msg.expires_at)}
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-1 flex-shrink-0">
					<!-- Publish toggle -->
					<form method="POST" action="?/publish" use:enhance>
						<input type="hidden" name="id" value={msg.id} />
						<input type="hidden" name="published" value={msg.published ? '0' : '1'} />
						<button type="submit" class="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title={msg.published ? 'Unpublish' : 'Publish'}>
							{#if msg.published}
								<Eye class="w-4 h-4" />
							{:else}
								<EyeOff class="w-4 h-4" />
							{/if}
						</button>
					</form>
					<!-- Edit -->
					<button type="button" onclick={() => (editingId = msg.id)} class="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Edit">
						<Pencil class="w-4 h-4" />
					</button>
					<!-- Archive -->
					<form method="POST" action="?/archive" use:enhance>
						<input type="hidden" name="id" value={msg.id} />
						<button type="submit" class="p-1.5 rounded-md text-foreground-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
							<Trash2 class="w-4 h-4" />
						</button>
					</form>
				</div>
			</div>
		{/if}
	</GlassCard>
{/snippet}

{#snippet channelSection(channelKey: GroveMessageChannel, channelLabel: string, channelMessages: DbMessage[])}
	<section class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">
			{channelLabel} Channel
			<span class="text-sm font-sans text-foreground-muted font-normal ml-2">{channelMessages.length}</span>
		</h2>

		{#if channelMessages.length === 0}
			<p class="text-sm font-sans text-foreground-muted">No {channelKey} messages yet.</p>
		{:else}
			<div class="space-y-3">
				{#each channelMessages as msg (msg.id)}
					{@render messageCard(msg)}
				{/each}
			</div>
		{/if}
	</section>
{/snippet}

<svelte:head>
	<title>Messages - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-serif text-foreground">Messages</h1>
		<p class="text-foreground-muted font-sans mt-1">
			{statsLine}
		</p>
	</div>
	<button
		type="button"
		onclick={() => (showCreateForm = !showCreateForm)}
		class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
	>
		<Plus class="w-4 h-4" />
		New Message
	</button>
</div>

<!-- Create Form -->
{#if showCreateForm}
	<GlassCard class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">Compose Message</h2>
		<form method="POST" action="?/create" use:enhance={() => {
			return async ({ update }) => {
				await update();
				showCreateForm = false;
			};
		}}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<label for="create-title" class="block text-sm font-sans font-medium text-foreground mb-1">Title</label>
					<input
						id="create-title"
						name="title"
						type="text"
						required
						class="w-full px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground"
						placeholder="What's happening?"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="create-channel" class="block text-sm font-sans font-medium text-foreground mb-1">Channel</label>
						{@render channelSelect('create-channel', 'channel')}
					</div>
					<div>
						<label for="create-type" class="block text-sm font-sans font-medium text-foreground mb-1">Type</label>
						<select
							id="create-type"
							name="message_type"
							class="w-full px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground"
						>
							<option value="info">Info</option>
							<option value="warning">Warning</option>
							<option value="celebration">Celebration</option>
							<option value="update">Update</option>
						</select>
					</div>
				</div>
			</div>

			<div class="mb-4">
				<label for="create-body" class="block text-sm font-sans font-medium text-foreground mb-1">Body</label>
				<textarea
					id="create-body"
					name="body"
					required
					rows="3"
					class="w-full px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground resize-y"
					placeholder="Write your message..."
				></textarea>
			</div>

			<div class="flex flex-wrap items-center gap-4 mb-4">
				<div>
					<label for="create-expires" class="block text-sm font-sans font-medium text-foreground mb-1">Expires (optional)</label>
					<input
						id="create-expires"
						name="expires_at"
						type="datetime-local"
						class="px-3 py-2 text-sm font-sans border border-grove-200 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground"
					/>
				</div>
				<label class="flex items-center gap-2 text-sm font-sans text-foreground cursor-pointer mt-5">
					<input type="checkbox" name="pinned" class="rounded border-grove-300 dark:border-bark-600" />
					<Pin class="w-4 h-4 text-foreground-muted" />
					Pin to top
				</label>
				<label class="flex items-center gap-2 text-sm font-sans text-foreground cursor-pointer mt-5">
					<input type="checkbox" name="published" />
					Publish immediately
				</label>
			</div>

			<div class="flex gap-3">
				<button
					type="submit"
					class="px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
				>
					Create Message
				</button>
				<button
					type="button"
					onclick={() => (showCreateForm = false)}
					class="px-4 py-2 text-foreground-muted text-sm font-sans hover:text-foreground transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	</GlassCard>
{/if}

<!-- Preview Toggle -->
<div class="mb-6 flex flex-wrap gap-2">
	{#each channels as ch}
		<button
			type="button"
			onclick={() => (previewChannel = previewChannel === ch.key ? null : ch.key)}
			class="text-xs font-sans px-3 py-1.5 rounded-lg transition-colors {previewChannel === ch.key
				? 'bg-grove-600 text-white'
				: 'bg-grove-100 dark:bg-bark-700 text-foreground-muted hover:text-foreground'}"
		>
			Preview {ch.label}
		</button>
	{/each}
</div>

<!-- Preview -->
{#if previewChannel}
	{@const preview = toPreviewMessages(previewChannel)}
	<div class="mb-8">
		<p class="text-xs font-sans text-foreground-muted mb-2 uppercase tracking-wider">
			Preview: {previewChannel} channel (published only)
		</p>
		{#if preview.length > 0}
			<div class="max-w-2xl">
				<GroveMessages messages={preview} dismissible={previewChannel !== 'landing'} />
			</div>
		{:else}
			<p class="text-sm font-sans text-foreground-muted italic">No published messages for this channel.</p>
		{/if}
	</div>
{/if}

<!-- Channel Sections -->
{#each channels as ch}
	{@render channelSection(ch.key, ch.label, getChannelMessages(ch.key))}
{/each}
