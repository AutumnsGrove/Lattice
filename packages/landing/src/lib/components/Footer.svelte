<script lang="ts">
	import { Footer as EngineFooter } from '@autumnsgrove/lattice/ui/chrome';
	import {
		LANDING_RESOURCE_LINKS,
		LANDING_CONNECT_LINKS,
		LANDING_LEGAL_LINKS
	} from '@autumnsgrove/lattice/ui/chrome';
	import type { MaxWidth } from '@autumnsgrove/lattice/ui/chrome';

	interface Props {
		maxWidth?: MaxWidth;
	}

	let { maxWidth }: Props = $props();
</script>

<EngineFooter
	resourceLinks={LANDING_RESOURCE_LINKS}
	connectLinks={LANDING_CONNECT_LINKS}
	legalLinks={LANDING_LEGAL_LINKS}
	{maxWidth}
/>
