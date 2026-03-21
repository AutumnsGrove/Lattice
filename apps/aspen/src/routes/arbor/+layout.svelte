<script lang="ts">
	import { ArborPanel } from "@autumnsgrove/lattice/ui/components/arbor";
	import Toast from "@autumnsgrove/lattice/ui/components/ui/Toast.svelte";
	import { defaultSuite, resolveIcon } from "@autumnsgrove/lattice/ui/components/ui/groveicon";
	import { featureIcons, actionIcons, metricIcons } from "@autumnsgrove/prism/icons";

	let { data, children } = $props();

	// Service icons from the canonical manifest
	const gardenIcon = resolveIcon(defaultSuite.garden.icon);
	const reedsIcon = resolveIcon(defaultSuite.reeds.icon);
	const curioIcon = resolveIcon(defaultSuite.curio.icon);
	const reverieIcon = resolveIcon(defaultSuite.reverie.icon);

	// Build nav items from tenant grafts and data
	let navItems = $derived([
		{ href: "/arbor", label: "Dashboard", icon: featureIcons.layoutDashboard, termSlug: "arbor" },
		{ href: "/arbor/garden", label: "Garden", icon: gardenIcon, termSlug: "your-garden" },
		{ href: "/arbor/pages", label: "Pages", icon: featureIcons.fileStack },
		{ href: "/arbor/images", label: "Images", icon: featureIcons.image },
		{
			href: "/arbor/reeds",
			label: "Comments",
			icon: reedsIcon,
			termSlug: "reeds",
			badge: data.pendingCommentCount ?? 0,
			visible: !!data.grafts?.reeds_comments,
		},
		{
			href: "/arbor/chat",
			label: "Messages",
			icon: featureIcons.messageCircle,
			visible: !!data.grafts?.chirp_enabled,
		},
		{ href: "/arbor/curios", label: "Curios", icon: curioIcon, termSlug: "curio" },
		{
			href: "/arbor/reverie",
			label: "Reverie",
			icon: reverieIcon,
			visible: !!data.grafts?.reverie_enabled,
		},
		{ href: "/arbor/account", label: "Account", icon: metricIcons.creditCard },
		{ href: "/arbor/settings", label: "Settings", icon: actionIcons.settings },
	]);

	const footerLinks = [
		{ href: "https://grove.place/knowledge/help", label: "Help Center", external: true },
		{ href: "https://grove.place/porch", label: "Get Support", external: true },
	];
</script>

<svelte:head>
	<title>Admin - {data.tenant?.displayName || data.tenant?.subdomain || "Grove"}</title>
</svelte:head>

<ArborPanel
	{navItems}
	{footerLinks}
	user={data.user}
	logoutHref="/auth/logout"
	messages={data.messages}
	isDemoMode={data.isDemoMode}
>
	{@render children()}
</ArborPanel>

<Toast />
