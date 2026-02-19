<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';

	// GroveText - String parser that renders [[term]] as interactive GroveTerm
	//
	// Parses [[term]] and [[term|display]] syntax in plain strings and renders
	// each match as a <GroveTerm> with popup. Eliminates hand-written snippet
	// overrides for data arrays (FAQs, descriptions, etc.).
	//
	// Usage:
	//   <GroveText content="Your [[bloom|blooms]] are protected by [[shade]]." />

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

{#each segments as seg}{#if seg.type === 'text'}{seg.value}{:else}<GroveTerm term={seg.value}>{#if seg.display}{seg.display}{:else}{seg.value}{/if}</GroveTerm>{/if}{/each}
