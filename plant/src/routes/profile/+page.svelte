<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, X, Loader2, PenTool, Camera, Palette, ChefHat, Laptop, Plane, BookOpen, Briefcase, Star } from 'lucide-svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';

	let { data, form } = $props();

	// Form state
	let displayName = $state(data.user?.displayName || '');
	let username = $state('');
	let favoriteColor = $state<string | null>(null);
	let selectedInterests = $state<string[]>([]);

	// Username validation state
	let usernameStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
	let usernameError = $state<string | null>(null);
	let usernameSuggestions = $state<string[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Available interests
	const interests = [
		{ id: 'writing', label: 'Writing / Blogging', icon: PenTool },
		{ id: 'photography', label: 'Photography', icon: Camera },
		{ id: 'art', label: 'Art / Design', icon: Palette },
		{ id: 'cooking', label: 'Cooking / Food', icon: ChefHat },
		{ id: 'tech', label: 'Technology', icon: Laptop },
		{ id: 'travel', label: 'Travel', icon: Plane },
		{ id: 'personal', label: 'Personal / Journal', icon: BookOpen },
		{ id: 'business', label: 'Business / Professional', icon: Briefcase },
		{ id: 'other', label: 'Other', icon: Star }
	];

	// Color presets
	const colorPresets = [
		{ name: 'Grove Green', value: '142 76% 36%', hex: '#16a34a' },
		{ name: 'Midnight Purple', value: '340 45% 35%', hex: '#8b3a5c' },
		{ name: 'Ocean Blue', value: '200 80% 40%', hex: '#1490c7' },
		{ name: 'Sunset Orange', value: '25 90% 50%', hex: '#f27d0c' },
		{ name: 'Forest Teal', value: '170 50% 35%', hex: '#2c8c7e' },
		{ name: 'Berry Pink', value: '330 60% 50%', hex: '#cc4080' },
		{ name: 'Golden Amber', value: '38 70% 50%', hex: '#d9a520' },
		{ name: 'Slate Gray', value: '220 15% 45%', hex: '#626f84' }
	];

	// Check username availability
	async function checkUsername(value: string) {
		const trimmed = value.toLowerCase().trim();

		if (!trimmed || trimmed.length < 3) {
			usernameStatus = 'idle';
			usernameError = trimmed.length > 0 ? 'At least 3 characters' : null;
			usernameSuggestions = [];
			return;
		}

		usernameStatus = 'checking';
		usernameError = null;
		usernameSuggestions = [];

		try {
			const res = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`);
			const result = (await res.json()) as { available?: boolean; error?: string; suggestions?: string[] };

			if (result.available) {
				usernameStatus = 'available';
				usernameError = null;
			} else {
				usernameStatus = 'taken';
				usernameError = result.error || 'Username not available';
				usernameSuggestions = result.suggestions || [];
			}
		} catch {
			usernameStatus = 'error';
			usernameError = 'Unable to check availability';
		}
	}

	// Debounced username check
	function onUsernameInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => checkUsername(username), 300);
	}

	// Select a suggested username
	function selectSuggestion(suggestion: string) {
		username = suggestion;
		checkUsername(suggestion);
	}

	// Toggle interest selection
	function toggleInterest(id: string) {
		if (selectedInterests.includes(id)) {
			selectedInterests = selectedInterests.filter((i) => i !== id);
		} else {
			selectedInterests = [...selectedInterests, id];
		}
	}
</script>

<div class="animate-fade-in">
	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">Set up your profile</h1>
		<p class="text-foreground-muted">Tell us a bit about yourself and choose your blog address.</p>
	</div>

	<!-- Form -->
	<GlassCard variant="frosted" class="max-w-md mx-auto">
		<form method="POST" use:enhance class="space-y-6">
			<!-- Display Name -->
			<div>
				<label for="displayName" class="block text-sm font-medium text-foreground mb-1.5">
					Display Name <span class="text-error">*</span>
				</label>
				<input
					type="text"
					id="displayName"
					name="displayName"
					bind:value={displayName}
					placeholder="How should we call you?"
					required
					class="w-full px-4 py-3 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 text-foreground placeholder:text-foreground-faint transition-all focus:outline-none focus:border-primary focus:bg-white/70 dark:focus:bg-slate-800/70 focus:ring-2 focus:ring-primary/20"
				/>
				<p class="text-xs text-foreground-subtle mt-1">This is how your name appears on your blog.</p>
			</div>

			<!-- Username / Subdomain -->
			<div>
				<label for="username" class="block text-sm font-medium text-foreground mb-1.5">
					Username <span class="text-error">*</span>
				</label>
				<div class="relative">
					<input
						type="text"
						id="username"
						name="username"
						bind:value={username}
						oninput={onUsernameInput}
						placeholder="yourname"
						required
						class="w-full px-4 py-3 pr-32 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border text-foreground placeholder:text-foreground-faint transition-all focus:outline-none focus:bg-white/70 dark:focus:bg-slate-800/70 focus:ring-2 focus:ring-primary/20 {usernameStatus === 'available' ? 'border-success focus:border-success' : usernameStatus === 'taken' || usernameStatus === 'error' ? 'border-error focus:border-error' : 'border-white/30 focus:border-primary'}"
					/>
					<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
						<span class="text-sm text-foreground-subtle">.grove.place</span>
						{#if usernameStatus === 'checking'}
							<Loader2 size={16} class="animate-spin text-foreground-subtle" />
						{:else if usernameStatus === 'available'}
							<Check size={16} class="text-success" />
						{:else if usernameStatus === 'taken' || usernameStatus === 'error'}
							<X size={16} class="text-error" />
						{/if}
					</div>
				</div>

			{#if usernameError}
				<p class="text-xs text-error mt-1">{usernameError}</p>
			{:else if usernameStatus === 'available'}
				<p class="text-xs text-success mt-1">
					{username}.grove.place is available!
				</p>
			{:else}
				<p class="text-xs text-foreground-subtle mt-1">
					This becomes your blog URL: <strong>yourname.grove.place</strong>
				</p>
			{/if}

			<!-- Username suggestions -->
				{#if usernameSuggestions.length > 0}
					<div class="mt-2">
						<p class="text-xs text-foreground-subtle mb-1">Try one of these:</p>
						<div class="flex flex-wrap gap-2">
							{#each usernameSuggestions as suggestion}
								<button
									type="button"
									onclick={() => selectSuggestion(suggestion)}
									class="text-xs px-3 py-1.5 rounded-md bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 text-foreground hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-primary transition-all"
								>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Favorite Color (Optional) -->
			<div class="p-4 rounded-lg bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-white/20 dark:border-slate-700/20">
				<label class="block text-sm font-medium text-foreground mb-1.5">
					Favorite Color <span class="text-foreground-subtle">(optional)</span>
				</label>
				<p class="text-xs text-foreground-subtle mb-3">This will be your blog's accent color. You can change it later.</p>

				<div class="grid grid-cols-4 gap-2">
					{#each colorPresets as color}
						<button
							type="button"
							onclick={() => (favoriteColor = favoriteColor === color.value ? null : color.value)}
							class="aspect-square rounded-lg border-2 transition-all hover:scale-105"
							class:border-primary={favoriteColor === color.value}
							class:border-transparent={favoriteColor !== color.value}
							style="background-color: {color.hex}"
							title={color.name}
						>
							{#if favoriteColor === color.value}
								<Check size={20} class="text-white mx-auto" />
							{/if}
						</button>
					{/each}
				</div>
				<input type="hidden" name="favoriteColor" value={favoriteColor || ''} />
			</div>

			<!-- Interests (Optional) -->
			<div>
				<label class="block text-sm font-medium text-foreground mb-1.5">
					What brings you to Grove? <span class="text-foreground-subtle">(optional)</span>
				</label>
				<p class="text-xs text-foreground-subtle mb-3">Select all that apply. This helps us personalize your experience.</p>

				<div class="grid grid-cols-2 gap-2">
					{#each interests as interest}
						<button
							type="button"
							onclick={() => toggleInterest(interest.id)}
							class="flex items-center gap-2 p-3 rounded-lg backdrop-blur-sm border text-left text-sm transition-all {selectedInterests.includes(interest.id) ? 'bg-white/50 dark:bg-slate-800/50 border-primary' : 'bg-white/20 dark:bg-slate-800/20 border-white/30 dark:border-slate-700/30 hover:bg-white/40 dark:hover:bg-slate-800/40'}"
						>
							<svelte:component this={interest.icon} class="w-4 h-4" />
							<span class="text-foreground">{interest.label}</span>
						</button>
					{/each}
				</div>
				<input type="hidden" name="interests" value={JSON.stringify(selectedInterests)} />
			</div>

			<!-- Form error -->
			{#if form?.error}
				<div class="p-3 rounded-lg bg-error-bg border border-error text-error text-sm">
					{form.error}
				</div>
			{/if}

			<!-- Submit -->
			<button
				type="submit"
				disabled={!displayName || usernameStatus !== 'available'}
				class="btn-primary w-full"
			>
				Continue to Plans
			</button>
		</form>
	</GlassCard>
</div>
