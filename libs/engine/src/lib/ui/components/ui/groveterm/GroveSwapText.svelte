<script lang="ts">
	import GroveSwap from './GroveSwap.svelte';

	// GroveSwapText - String parser that renders [[term]] as silent GroveSwap
	//
	// Same parsing as GroveText but renders <GroveSwap> instead of <GroveTerm>.
	// No popup, no underline — just reactive text swaps in plain strings.
	// Use for high-frequency or compact contexts where popups are overkill.
	//
	// Usage:
	//   <GroveSwapText content="Your [[bloom|blooms]] live in your [[your-garden|garden]]." />

	interface Props {
		/** String containing [[term]] or [[term|display]] markers */
		content: string;
	}

	let { content }: Props = $props();

	const PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(?:\|([^\]]*))?\]\]/g;

	interface Segment {
		type: 'text' | 'term';
		value: string;
		display?: string;
	}

	const segments = $derived.by(() => {
		const result: Segment[] = [];
		let lastIndex = 0;
		const re = new RegExp(PATTERN.source, 'g');
		let match: RegExpExecArray | null;
		while ((match = re.exec(content)) !== null) {
			if (match.index > lastIndex)
				result.push({ type: 'text', value: content.slice(lastIndex, match.index) });
			result.push({
				type: 'term',
				value: match[1],
				display: match[2]?.trim() || undefined
			});
			lastIndex = re.lastIndex;
		}
		if (lastIndex < content.length)
			result.push({ type: 'text', value: content.slice(lastIndex) });
		return result;
	});
</script>

{#each segments as seg}{#if seg.type === 'text'}{seg.value}{:else}<GroveSwap term={seg.value}>{#if seg.display}{seg.display}{:else}{seg.value}{/if}</GroveSwap>{/if}{/each}
