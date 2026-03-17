<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';

	// GroveText - String parser that renders [[term]] markers as GroveTerm
	// and [text](url) markdown links as <a> tags.
	//
	// Defaults to non-interactive (silent swap). Use ! suffix for interactive:
	//   [[bloom]]         → <GroveTerm term="bloom" />              (silent swap)
	//   [[bloom!]]        → <GroveTerm term="bloom" interactive />  (popup + underline)
	//   [[bloom|blooms]]  → <GroveTerm term="bloom">blooms</GroveTerm>
	//   [[bloom!|blooms]] → <GroveTerm term="bloom" interactive>blooms</GroveTerm>
	//   [click here](/page) → <a href="/page">click here</a>

	interface Props {
		/** String containing [[term]] or [[term|display]] markers */
		content: string;
	}

	let { content }: Props = $props();

	const PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(!)?\s*(?:\|([^\]]*))?\]\]/g;

	interface Segment {
		type: 'text' | 'term' | 'link';
		value: string;
		display?: string;
		interactive?: boolean;
		href?: string;
	}

	const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

	function parseLinks(text: string): Segment[] {
		const result: Segment[] = [];
		let lastIndex = 0;
		const re = new RegExp(LINK_PATTERN.source, 'g');
		let match: RegExpExecArray | null;
		while ((match = re.exec(text)) !== null) {
			if (match.index > lastIndex)
				result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
			result.push({ type: 'link', value: match[1], href: match[2] });
			lastIndex = re.lastIndex;
		}
		if (lastIndex < text.length) result.push({ type: 'text', value: text.slice(lastIndex) });
		return result;
	}

	const segments = $derived.by(() => {
		const termParsed: Segment[] = [];
		let lastIndex = 0;
		const re = new RegExp(PATTERN.source, 'g');
		let match: RegExpExecArray | null;
		while ((match = re.exec(content)) !== null) {
			if (match.index > lastIndex)
				termParsed.push({ type: 'text', value: content.slice(lastIndex, match.index) });
			termParsed.push({
				type: 'term',
				value: match[1],
				interactive: match[2] === '!',
				display: match[3]?.trim() || undefined
			});
			lastIndex = re.lastIndex;
		}
		if (lastIndex < content.length)
			termParsed.push({ type: 'text', value: content.slice(lastIndex) });

		// Second pass: parse markdown links in text segments
		const result: Segment[] = [];
		for (const seg of termParsed) {
			if (seg.type === 'text' && LINK_PATTERN.test(seg.value)) {
				result.push(...parseLinks(seg.value));
			} else {
				result.push(seg);
			}
		}
		return result;
	});
</script>

{#each segments as seg}{#if seg.type === 'text'}{seg.value}{:else if seg.type === 'link'}<a href={seg.href} class="text-accent-muted hover:text-accent underline underline-offset-2 transition-colors">{seg.value}</a>{:else}<GroveTerm term={seg.value} interactive={seg.interactive}>{#if seg.display}{seg.display}{:else}{seg.value}{/if}</GroveTerm>{/if}{/each}
