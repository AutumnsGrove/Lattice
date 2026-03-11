<script>
	import { ArborPanel } from "$lib/ui/components/arbor";
	import Toast from "$lib/ui/components/ui/Toast.svelte";
	import { defaultSuite, resolveIcon } from "$lib/ui/components/ui/groveicon";
	import { LayoutDashboard, FileStack, Image, Settings, CreditCard } from "lucide-svelte";

	let { data, children } = $props();

	// Service icons from the canonical manifest
	const gardenIcon = resolveIcon(defaultSuite.garden.icon);
	const reedsIcon = resolveIcon(defaultSuite.reeds.icon);
	const reverieIcon = resolveIcon(defaultSuite.reverie.icon);

	// Build nav items from tenant grafts and data
	let navItems = $derived([
		{ href: "/arbor", label: "Dashboard", icon: LayoutDashboard, termSlug: "arbor" },
		{ href: "/arbor/garden", label: "Garden", icon: gardenIcon, termSlug: "your-garden" },
		{ href: "/arbor/pages", label: "Pages", icon: FileStack },
		{ href: "/arbor/images", label: "Images", icon: Image },
		{
			href: "/arbor/reeds",
			label: "Comments",
			icon: reedsIcon,
			termSlug: "reeds",
			badge: data.pendingCommentCount ?? 0,
			visible: !!data.grafts?.reeds_comments,
		},
		{ href: "/arbor/reverie", label: "Reverie", icon: reverieIcon },
		{ href: "/arbor/account", label: "Account", icon: CreditCard },
		{ href: "/arbor/settings", label: "Settings", icon: Settings },
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
