<script lang="ts">
	/**
	 * Choosing the timezone a timeline summary is written for.
	 *
	 * The zone decides which day the nightly run asks for (#1832), so getting it
	 * wrong is silent: the page is a day late or misses an evening. A free-text
	 * IANA name was guesswork, and a twelve-entry dropdown did not cover most of
	 * the world — so this is the browser's own zone, suggested, plus the full list
	 * to search.
	 */
	import { onMount } from "svelte";

	interface Props {
		value: string;
		/** False when the tenant has no saved timeline config, so the detected zone can prefill. */
		saved?: boolean;
	}

	let { value = $bindable("UTC"), saved = false }: Props = $props();

	/** Zones worth showing before anyone types, most of them the old dropdown. */
	const COMMON = [
		{ value: "America/New_York", label: "Eastern Time — US & Canada" },
		{ value: "America/Chicago", label: "Central Time — US & Canada" },
		{ value: "America/Denver", label: "Mountain Time — US & Canada" },
		{ value: "America/Phoenix", label: "Arizona (no daylight saving)" },
		{ value: "America/Los_Angeles", label: "Pacific Time — US & Canada" },
		{ value: "America/Anchorage", label: "Alaska" },
		{ value: "Pacific/Honolulu", label: "Hawaii" },
		{ value: "America/Toronto", label: "Toronto" },
		{ value: "America/Vancouver", label: "Vancouver" },
		{ value: "America/Mexico_City", label: "Mexico City" },
		{ value: "America/Sao_Paulo", label: "São Paulo" },
		{ value: "Europe/London", label: "London" },
		{ value: "Europe/Dublin", label: "Dublin" },
		{ value: "Europe/Paris", label: "Paris" },
		{ value: "Europe/Berlin", label: "Berlin" },
		{ value: "Europe/Madrid", label: "Madrid" },
		{ value: "Europe/Amsterdam", label: "Amsterdam" },
		{ value: "Europe/Stockholm", label: "Stockholm" },
		{ value: "Europe/Warsaw", label: "Warsaw" },
		{ value: "Africa/Lagos", label: "Lagos" },
		{ value: "Africa/Johannesburg", label: "Johannesburg" },
		{ value: "Asia/Dubai", label: "Dubai" },
		{ value: "Asia/Kolkata", label: "India" },
		{ value: "Asia/Shanghai", label: "Shanghai" },
		{ value: "Asia/Tokyo", label: "Tokyo" },
		{ value: "Asia/Seoul", label: "Seoul" },
		{ value: "Australia/Perth", label: "Perth" },
		{ value: "Australia/Sydney", label: "Sydney" },
		{ value: "Pacific/Auckland", label: "Auckland" },
		{ value: "UTC", label: "UTC" },
	];

	const FRIENDLY = new Map(COMMON.map((zone) => [zone.value, zone.label]));

	let detected = $state("");
	let zones = $state<string[]>([]);
	let query = $state("");
	let open = $state(false);
	let activeIndex = $state(0);
	let inputEl: HTMLInputElement | null = $state(null);
	let listEl: HTMLElement | null = $state(null);

	/** "America/Los_Angeles" reads better as "America / Los Angeles". */
	function humanize(zone: string): string {
		return zone.replace(/_/g, " ").replace("/", " / ");
	}

	function labelFor(zone: string): string {
		return FRIENDLY.get(zone) ?? humanize(zone);
	}

	function zoneSystem(): string[] {
		const supported = (
			Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
		).supportedValuesOf?.("timeZone");
		return supported ?? [];
	}

	onMount(() => {
		detected = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
		zones = Array.from(new Set([...COMMON.map((z) => z.value), ...zoneSystem()])).sort((a, b) =>
			a.localeCompare(b),
		);

		// A tenant who has never saved a config gets their own zone, not the
		// column default. Once saved, the stored zone wins unless they change it.
		if (!saved && detected && detected !== value) {
			value = detected;
		}
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return COMMON.map((z) => z.value);
		}
		return zones
			.filter((zone) => {
				const label = labelFor(zone).toLowerCase();
				return zone.toLowerCase().includes(q) || label.includes(q);
			})
			.slice(0, 60);
	});

	/** What the selected zone means right now, so the choice can be checked at a glance. */
	const selectedHint = $derived.by(() => {
		if (!value) return "";
		try {
			const now = new Date();
			const offset =
				new Intl.DateTimeFormat("en-US", { timeZone: value, timeZoneName: "shortOffset" })
					.formatToParts(now)
					.find((part) => part.type === "timeZoneName")?.value ?? "";
			const time = new Intl.DateTimeFormat(undefined, {
				timeZone: value,
				hour: "numeric",
				minute: "2-digit",
			}).format(now);
			return `${offset} · ${time} there now`;
		} catch {
			return "Not a zone this browser recognises";
		}
	});

	const detectedHint = $derived(detected && detected !== value ? detected : "");

	function choose(zone: string) {
		value = zone;
		query = "";
		open = false;
		inputEl?.blur();
	}

	function onInput() {
		open = true;
		activeIndex = 0;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			open = true;
			const step = event.key === "ArrowDown" ? 1 : -1;
			const count = filtered.length;
			if (count === 0) return;
			activeIndex = (activeIndex + step + count) % count;
			listEl
				?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
				?.scrollIntoView({ block: "nearest" });
		} else if (event.key === "Enter") {
			if (!open) {
				open = true;
				return;
			}
			const zone = filtered[activeIndex];
			if (zone) {
				event.preventDefault();
				choose(zone);
			}
		} else if (event.key === "Escape") {
			open = false;
			query = "";
		}
	}
</script>

<div class="timezone-picker">
	<div class="zone-field">
		<input
			id="timezone"
			bind:this={inputEl}
			type="text"
			class="field-input zone-search"
			role="combobox"
			aria-expanded={open}
			aria-controls="timezone-listbox"
			aria-autocomplete="list"
			aria-activedescendant={open ? `timezone-option-${activeIndex}` : undefined}
			aria-label="Search for a timezone"
			placeholder="Search a city or region — try “Oregon”"
			value={query}
			oninput={(e) => {
				query = e.currentTarget.value;
				onInput();
			}}
			onfocus={() => {
				open = true;
				activeIndex = 0;
			}}
			onkeydown={onKeydown}
		/>
		{#if open}
			<ul bind:this={listEl} id="timezone-listbox" class="zone-list" role="listbox">
				{#if query.trim() === ""}
					<li class="zone-group" aria-hidden="true">Common</li>
				{/if}
				{#each filtered as zone, i (zone)}
					<li
						id="timezone-option-{i}"
						data-index={i}
						class="zone-option"
						class:active={i === activeIndex}
						role="option"
						aria-selected={zone === value}
					>
						<button
							type="button"
							onclick={() => choose(zone)}
							onmousedown={(e) => e.preventDefault()}
						>
							<span class="zone-name">{labelFor(zone)}</span>
							{#if FRIENDLY.has(zone)}
								<span class="zone-id">{zone}</span>
							{/if}
						</button>
					</li>
				{:else}
					<li class="zone-empty">No zone matches “{query}”.</li>
				{/each}
			</ul>
		{/if}
	</div>

	<p class="field-help selected">
		{labelFor(value)}
		{#if selectedHint}<span class="muted">· {selectedHint}</span>{/if}
	</p>

	{#if detectedHint}
		<p class="field-help">
			This browser is in <strong>{labelFor(detectedHint)}</strong>.
			<button type="button" class="use-detected" onclick={() => choose(detectedHint)}>
				Use {humanize(detectedHint)}
			</button>
		</p>
	{/if}

	<p class="field-help">
		Summaries are written for your local midnight-to-midnight, so this decides which day the nightly
		run asks for.
	</p>
</div>

<style>
	.timezone-picker {
		display: flex;
		flex-direction: column;
	}

	.zone-field {
		position: relative;
	}

	.zone-search {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--grove-overlay-4);
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		color: var(--color-text);
		font-size: 0.9rem;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.zone-search:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
	}

	.zone-search::placeholder {
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	.zone-list {
		position: absolute;
		z-index: 20;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		max-height: 18rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		background: var(--color-surface, var(--grove-overlay-4));
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		backdrop-filter: blur(12px);
	}

	.zone-group {
		padding: 0.375rem 0.625rem;
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.zone-option button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.0625rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: 0;
		border-radius: calc(var(--border-radius-standard) - 2px);
		background: transparent;
		color: var(--color-text);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
	}

	.zone-option.active button,
	.zone-option button:hover {
		background: var(--grove-overlay-8);
	}

	.zone-option[aria-selected="true"] .zone-name {
		color: var(--color-primary);
		font-weight: 600;
	}

	.zone-id {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.zone-empty {
		padding: 0.75rem 0.625rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.selected {
		margin-top: 0.5rem;
	}

	.muted {
		color: var(--color-text-muted);
	}

	.use-detected {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-primary);
		font-size: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
