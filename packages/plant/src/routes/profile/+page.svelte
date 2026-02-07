<script lang="ts">
	import { Check, X, Loader2, PenTool, Camera, Palette, ChefHat, Laptop, Plane, BookOpen, Briefcase, Star } from '@autumnsgrove/groveengine/ui/icons';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { COLOR_PRESETS } from '@autumnsgrove/groveengine';
	import { submitFormAndGo } from '$lib/submit-form';

	let { data } = $props();

	// Extract initial values (captured once, not reactive - intentional for form fields)
	const initialDisplayName = data.user?.displayName || '';

	// Form state - initialize from props on first render only
	let displayName = $state(initialDisplayName);
	let username = $state('');
	let favoriteColor = $state<string | null>(null);
	let selectedInterests = $state<string[]>([]);

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

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

	// Color presets imported from shared config (ensures consistency with Arbor settings)

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
			const res = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`); // csrf-ok: GET-only read
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

	// Submit profile via JSON API (grove-router POST proxy fix)
	async function saveProfile() {
		if (!displayName || usernameStatus !== 'available' || isSubmitting) return;

		isSubmitting = true;
		submitError = null;

		const error = await submitFormAndGo('/api/save-profile', {
			displayName,
			username,
			favoriteColor,
			interests: selectedInterests,
		});

		if (error) submitError = error;
		isSubmitting = false;
	}
</script>

<div class="animate-fade-in">
	<!-- Back navigation -->
	<div class="flex items-center gap-2 mb-6">
		<a
			href="/auth/logout"
			class="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
		>
			<X size={16} />
			Start over with different account
		</a>
	</div>

	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">Tell us about yourself</h1>
		<p class="text-foreground-muted">Let's get you settled in. Pick a name and claim your corner of the Grove.</p>
	</div>

	<!-- Form -->
	<GlassCard variant="frosted" class="max-w-md mx-auto">
		<div
			class="space-y-6"
		>
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
					class="w-full px-4 py-3 rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint transition-all focus:outline-none focus:border-primary focus:bg-white/80 dark:focus:bg-bark-800/70 focus:ring-2 focus:ring-primary/20"
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
						class="w-full px-4 py-3 pr-32 rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border text-foreground placeholder:text-foreground-faint transition-all focus:outline-none focus:bg-white/80 dark:focus:bg-bark-800/70 focus:ring-2 focus:ring-primary/20 {usernameStatus === 'available' ? 'border-success focus:border-success' : usernameStatus === 'taken' || usernameStatus === 'error' ? 'border-error focus:border-error' : 'border-white/30 focus:border-primary'}"
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
									class="text-xs px-3 py-1.5 rounded-md bg-white/60 dark:bg-bark-800/40 backdrop-blur-sm border border-white/30 dark:border-bark-700/30 text-foreground hover:bg-white/70 dark:hover:bg-bark-800/60 hover:border-primary transition-all"
								>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Favorite Color (Optional) -->
			<fieldset class="p-4 rounded-lg bg-white/50 dark:bg-bark-800/30 backdrop-blur-sm border border-white/20 dark:border-bark-700/20">
				<legend class="block text-sm font-medium text-foreground mb-1.5">
					Favorite Color <span class="text-foreground-subtle">(optional)</span>
				</legend>
				<p class="text-xs text-foreground-subtle mb-3">This will be your blog's accent color. You can change it later.</p>

				<div class="grid grid-cols-4 gap-2.5">
					{#each COLOR_PRESETS as color}
						<button
							type="button"
							onclick={() => (favoriteColor = favoriteColor === color.hex ? null : color.hex)}
							class="aspect-square rounded-lg border-3 transition-all hover:scale-105 relative {favoriteColor === color.hex ? 'border-white shadow-lg' : 'border-white/30 dark:border-bark-700/30'}"
							style="background-color: {color.hex}"
							title={color.name}
						>
							{#if favoriteColor === color.hex}
								<div class="absolute inset-0 flex items-center justify-center">
									<Check size={24} class="text-white drop-shadow-lg" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
				<input type="hidden" name="favoriteColor" value={favoriteColor || ''} />
			</fieldset>

			<!-- Interests (Optional) -->
			<fieldset>
				<legend class="block text-sm font-medium text-foreground mb-1.5">
					What brings you to Grove? <span class="text-foreground-subtle">(optional)</span>
				</legend>
				<p class="text-xs text-foreground-subtle mb-3">Select all that apply. This helps us personalize your experience.</p>

				<div class="grid grid-cols-2 gap-3">
					{#each interests as interest}
						{@const Icon = interest.icon}
						<button
							type="button"
							onclick={() => toggleInterest(interest.id)}
							class="flex items-center gap-3 p-4 rounded-lg backdrop-blur-sm border text-left text-sm transition-all relative {selectedInterests.includes(interest.id) ? 'bg-white/70 dark:bg-bark-800/60 border-primary border-2 shadow-md' : 'bg-white/50 dark:bg-bark-800/30 border-white/30 dark:border-bark-700/30 hover:bg-white/60 dark:hover:bg-bark-800/45'}"
						>
							<Icon class="w-5 h-5 {selectedInterests.includes(interest.id) ? 'text-primary' : 'text-foreground-muted'}" />
							<span class="text-foreground font-medium">{interest.label}</span>
							{#if selectedInterests.includes(interest.id)}
								<Check size={16} class="text-primary ml-auto" />
							{/if}
						</button>
					{/each}
				</div>
				<input type="hidden" name="interests" value={JSON.stringify(selectedInterests)} />
			</fieldset>

			<!-- Error -->
			{#if submitError}
				<div class="p-3 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
					{submitError}
				</div>
			{/if}

			<!-- Submit -->
			<button
				type="button"
				onclick={saveProfile}
				disabled={!displayName || usernameStatus !== 'available' || isSubmitting}
				class="btn-primary w-full"
			>
				{#if isSubmitting}
					<Loader2 size={18} class="animate-spin" />
					Saving...
				{:else}
					Continue to Plans
				{/if}
			</button>
		</div>
	</GlassCard>
</div>
