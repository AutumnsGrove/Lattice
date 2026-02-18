<script lang="ts">
	import { Header as EngineHeader } from '@autumnsgrove/lattice/ui/chrome';
	import {
		LANDING_MOBILE_RESOURCE_LINKS,
		LANDING_MOBILE_CONNECT_LINKS
	} from '@autumnsgrove/lattice/ui/chrome';
	import type { MaxWidth, HeaderUser } from '@autumnsgrove/lattice/ui/chrome';

	interface Props {
		maxWidth?: MaxWidth;
		user?: HeaderUser | null;
		signInHref?: string;
		signInLabel?: string;
		userHref?: string;
		showSidebarToggle?: boolean;
	}

	let { maxWidth, user, signInHref, signInLabel, userHref, showSidebarToggle = false }: Props =
		$props();
</script>

<EngineHeader
	resourceLinks={LANDING_MOBILE_RESOURCE_LINKS}
	connectLinks={LANDING_MOBILE_CONNECT_LINKS}
	{maxWidth}
	{user}
	{signInHref}
	{signInLabel}
	{userHref}
	{showSidebarToggle}
/>
