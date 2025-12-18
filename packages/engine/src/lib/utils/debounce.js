/**
 * Debounce function calls
 * @template {(...args: any[]) => any} T
 * @param {T} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {(...args: Parameters<T>) => void} Debounced function
 */
export function debounce(fn, delay = 300) {
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timeoutId = null;

	return (/** @type {Parameters<T>} */ ...args) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}
