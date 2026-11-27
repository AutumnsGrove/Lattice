/** `import.meta.glob` is Vite's, and it is only used by the scenario runner. */
interface ImportMeta {
	glob<T = unknown>(
		pattern: string | string[],
		options?: { query?: string; import?: string; eager?: boolean },
	): Record<string, T>;
}
