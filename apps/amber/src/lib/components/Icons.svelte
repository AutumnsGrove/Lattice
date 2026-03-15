<script lang="ts">
	import {
		authIcons,
		featureIcons,
		actionIcons,
		navIcons,
		natureIcons,
		stateIcons,
		chromeIcons,
		blazeIcons,
	} from "@autumnsgrove/prism/icons";

	interface Props {
		name:
			| "amber"
			| "dashboard"
			| "folder"
			| "trash"
			| "settings"
			| "search"
			| "sun"
			| "moon"
			| "upload"
			| "download"
			| "x"
			| "check"
			| "chevron-right"
			| "chevron-down"
			| "grid"
			| "list"
			| "filter"
			| "sort"
			| "file"
			| "image"
			| "video"
			| "audio"
			| "document"
			| "archive"
			| "more"
			| "refresh"
			| "export"
			| "plus"
			| "storage"
			| "menu"
			| "logout"
			| "github"
			| "google";
		size?: number;
		class?: string;
	}

	let { name, size = 20, class: className = "" }: Props = $props();

	const iconMap = {
		amber: authIcons.vault,
		dashboard: featureIcons.layoutDashboard,
		folder: featureIcons.folder,
		trash: actionIcons.trash,
		settings: actionIcons.settings,
		search: navIcons.search,
		sun: natureIcons.sun,
		moon: natureIcons.moon,
		upload: actionIcons.upload,
		download: actionIcons.download,
		x: stateIcons.x,
		check: stateIcons.check,
		"chevron-right": navIcons.chevronRight,
		"chevron-down": navIcons.chevronDown,
		grid: chromeIcons.grid,
		list: actionIcons.list,
		filter: actionIcons.filter,
		sort: actionIcons.sortAlt,
		file: featureIcons.fileText,
		image: featureIcons.image,
		video: featureIcons.video,
		audio: blazeIcons.music,
		document: featureIcons.fileText,
		archive: featureIcons.archive,
		more: actionIcons.ellipsisH,
		refresh: actionIcons.refresh,
		export: actionIcons.share,
		plus: actionIcons.plus,
		storage: featureIcons.hardDrive,
		menu: navIcons.menu,
		logout: authIcons.logout,
		github: chromeIcons.github,
		google: navIcons.globe,
	};

	const IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
	<IconComponent {size} class={className} />
{/if}
