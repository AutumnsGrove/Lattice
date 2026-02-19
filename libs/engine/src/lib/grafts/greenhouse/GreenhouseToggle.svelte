<script lang="ts">
	/**
	 * GreenhouseToggle - Enable/disable toggle for greenhouse tenants
	 *
	 * Simple toggle switch component that shows greenhouse status
	 * and allows operators to enable/disable a tenant's access.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GreenhouseToggle
	 *   tenantId="abc123"
	 *   enabled={true}
	 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
	 * />
	 * ```
	 */

	import type { GreenhouseToggleProps } from "./types.js";

	let {
		enabled,
		tenantId,
		disabled = false,
		onToggle,
		class: className = "",
	}: GreenhouseToggleProps = $props();

	function handleClick() {
		if (!disabled) {
			onToggle(tenantId, !enabled);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleClick();
		}
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={enabled}
	aria-label={enabled ? "Disable greenhouse access" : "Enable greenhouse access"}
	class="greenhouse-toggle {className}"
	class:enabled
	class:disabled
	onclick={handleClick}
	onkeydown={handleKeydown}
	{disabled}
>
	<span class="toggle-track">
		<span class="toggle-thumb"></span>
	</span>
	<span class="toggle-label sr-only">
		{enabled ? "Enabled" : "Disabled"}
	</span>
</button>

<style>
	.greenhouse-toggle {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
		padding: 2px;
		border-radius: 14px;
	}

	.greenhouse-toggle:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-surface, white), 0 0 0 4px #10b981;
	}

	:global(.dark) .greenhouse-toggle:focus-visible {
		box-shadow: 0 0 0 2px #1e293b, 0 0 0 4px #10b981;
	}

	.greenhouse-toggle.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.toggle-track {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--color-border, #d1d5db);
		border-radius: 12px;
		transition: background-color 0.2s ease;
	}

	.greenhouse-toggle.enabled .toggle-track {
		background: #10b981; /* emerald-500 */
	}

	:global(.dark) .toggle-track {
		background: #374151; /* gray-700 */
	}

	:global(.dark) .greenhouse-toggle.enabled .toggle-track {
		background: #059669; /* emerald-600 */
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease;
	}

	.greenhouse-toggle.enabled .toggle-thumb {
		transform: translateX(20px);
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
		border: 0;
	}
</style>
