<script lang="ts">
	type IconName =
		| "inbox"
		| "send"
		| "file"
		| "archive"
		| "trash"
		| "settings"
		| "compose"
		| "search"
		| "sun"
		| "moon"
		| "chevron-down"
		| "chevron-right"
		| "x"
		| "menu"
		| "paperclip"
		| "bold"
		| "italic"
		| "link"
		| "list"
		| "reply"
		| "reply-all"
		| "forward"
		| "star"
		| "star-filled"
		| "label"
		| "user"
		| "leaf"
		| "github"
		| "log-out";

	let {
		name,
		size = 20,
		class: className = "",
	}: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
>
	{#if name === "inbox"}
		<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
		<path
			d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
		/>
	{:else if name === "send"}
		<path d="m22 2-7 20-4-9-9-4Z" />
		<path d="M22 2 11 13" />
	{:else if name === "file"}
		<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
		<path d="M14 2v4a2 2 0 0 0 2 2h4" />
	{:else if name === "archive"}
		<rect width="20" height="5" x="2" y="3" rx="1" />
		<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
		<path d="M10 12h4" />
	{:else if name === "trash"}
		<path d="M3 6h18" />
		<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
		<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
	{:else if name === "settings"}
		<path
			d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
		/>
		<circle cx="12" cy="12" r="3" />
	{:else if name === "compose"}
		<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
		<path
			d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
		/>
	{:else if name === "search"}
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	{:else if name === "sun"}
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2" />
		<path d="M12 20v2" />
		<path d="m4.93 4.93 1.41 1.41" />
		<path d="m17.66 17.66 1.41 1.41" />
		<path d="M2 12h2" />
		<path d="M20 12h2" />
		<path d="m6.34 17.66-1.41 1.41" />
		<path d="m19.07 4.93-1.41 1.41" />
	{:else if name === "moon"}
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
	{:else if name === "chevron-down"}
		<path d="m6 9 6 6 6-6" />
	{:else if name === "chevron-right"}
		<path d="m9 18 6-6-6-6" />
	{:else if name === "x"}
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	{:else if name === "menu"}
		<line x1="4" x2="20" y1="12" y2="12" />
		<line x1="4" x2="20" y1="6" y2="6" />
		<line x1="4" x2="20" y1="18" y2="18" />
	{:else if name === "paperclip"}
		<path
			d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
		/>
	{:else if name === "bold"}
		<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
	{:else if name === "italic"}
		<line x1="19" x2="10" y1="4" y2="4" />
		<line x1="14" x2="5" y1="20" y2="20" />
		<line x1="15" x2="9" y1="4" y2="20" />
	{:else if name === "link"}
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	{:else if name === "list"}
		<line x1="8" x2="21" y1="6" y2="6" />
		<line x1="8" x2="21" y1="12" y2="12" />
		<line x1="8" x2="21" y1="18" y2="18" />
		<line x1="3" x2="3.01" y1="6" y2="6" />
		<line x1="3" x2="3.01" y1="12" y2="12" />
		<line x1="3" x2="3.01" y1="18" y2="18" />
	{:else if name === "reply"}
		<polyline points="9 17 4 12 9 7" />
		<path d="M20 18v-2a4 4 0 0 0-4-4H4" />
	{:else if name === "reply-all"}
		<polyline points="7 17 2 12 7 7" />
		<polyline points="12 17 7 12 12 7" />
		<path d="M22 18v-2a4 4 0 0 0-4-4H7" />
	{:else if name === "forward"}
		<polyline points="15 17 20 12 15 7" />
		<path d="M4 18v-2a4 4 0 0 1 4-4h12" />
	{:else if name === "star"}
		<polygon
			points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
		/>
	{:else if name === "star-filled"}
		<polygon
			points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
			fill="currentColor"
		/>
	{:else if name === "label"}
		<path
			d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
		/>
		<circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
	{:else if name === "user"}
		<circle cx="12" cy="8" r="5" />
		<path d="M20 21a8 8 0 0 0-16 0" />
	{:else if name === "leaf"}
		<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
		<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
	{:else if name === "github"}
		<path
			d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
		/>
		<path d="M9 18c-4.51 2-5-2-7-2" />
	{:else if name === "log-out"}
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
		<polyline points="16 17 21 12 16 7" />
		<line x1="21" x2="9" y1="12" y2="12" />
	{/if}
</svg>
