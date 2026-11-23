/** `import.meta.glob` is Vite's; the workers-side scenario run is its only user here. */
interface ImportMeta {
	glob<T = unknown>(
		pattern: string | string[],
		options?: { query?: string; import?: string; eager?: boolean },
	): Record<string, T>;
}
