/**
 * Svelte action that calls a callback when a click occurs outside the element.
 * Uses requestAnimationFrame to avoid catching the originating click that
 * caused the element to appear (e.g. a toggle button).
 *
 * Usage: <div use:clickOutside={() => open = false}>...</div>
 */
export function clickOutside(node: HTMLElement, callback: () => void) {
	const handleClick = (event: MouseEvent) => {
		if (!node.contains(event.target as Node)) {
			callback();
		}
	};

	// Delay listener attachment so the click that opened the menu doesn't
	// immediately trigger the outside handler on the same event cycle.
	const frame = requestAnimationFrame(() => {
		document.addEventListener("click", handleClick);
	});

	return {
		destroy() {
			cancelAnimationFrame(frame);
			document.removeEventListener("click", handleClick);
		},
	};
}
