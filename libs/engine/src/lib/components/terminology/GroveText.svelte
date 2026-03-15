<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';

	// GroveText - String parser that renders [[term]] markers as GroveTerm
	//
	// Defaults to non-interactive (silent swap). Use ! suffix for interactive:
	//   [[bloom]]         → <GroveTerm term="bloom" />              (silent swap)
	//   [[bloom!]]        → <GroveTerm term="bloom" interactive />  (popup + underline)
	//   [[bloom|blooms]]  → <GroveTerm term="bloom">blooms</GroveTerm>
	//   [[bloom!|blooms]] → <GroveTerm term="bloom" interactive>blooms</GroveTerm>

	interface Props {
		/** String containing [[term]] or [[term|display]] markers */
		content: string;
	}

	let { content }: Props = $props();

	const PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(!)?\s*(?:\|([^\]]*))?\]\]/g;

	interface Segment {
		type: 'text' | 'term';
		value: string;
		display?: string;
		interactive?: boolean;
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
				interactive: match[2] === '!',
				display: match[3]?.trim() || undefined
			});
			lastIndex = re.lastIndex;
		}
		if (lastIndex < content.length)
			result.push({ type: 'text', value: content.slice(lastIndex) });
		return result;
	});
</script>

{#each segments as seg}{#if seg.type === 'text'}{seg.value}{:else}<GroveTerm term={seg.value} interactive={seg.interactive}>{#if seg.display}{seg.display}{:else}{seg.value}{/if}</GroveTerm>{/if}{/each}
