<script lang="ts">
	import {
		Vault,
		LayoutDashboard,
		Folder,
		Trash2,
		Settings,
		Search,
		Sun,
		Moon,
		Upload,
		Download,
		X,
		Check,
		ChevronRight,
		ChevronDown,
		Grid3x3,
		List,
		Filter,
		ArrowUpDown,
		File,
		Image,
		Video,
		Music,
		FileText,
		Archive,
		MoreHorizontal,
		RefreshCw,
		Share,
		Plus,
		HardDrive,
		Menu,
	} from "lucide-svelte";

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
			| "menu";
		size?: number;
		class?: string;
	}

	let { name, size = 20, class: className = "" }: Props = $props();

	const iconMap = {
		amber: Vault,
		dashboard: LayoutDashboard,
		folder: Folder,
		trash: Trash2,
		settings: Settings,
		search: Search,
		sun: Sun,
		moon: Moon,
		upload: Upload,
		download: Download,
		x: X,
		check: Check,
		"chevron-right": ChevronRight,
		"chevron-down": ChevronDown,
		grid: Grid3x3,
		list: List,
		filter: Filter,
		sort: ArrowUpDown,
		file: File,
		image: Image,
		video: Video,
		audio: Music,
		document: FileText,
		archive: Archive,
		more: MoreHorizontal,
		refresh: RefreshCw,
		export: Share,
		plus: Plus,
		storage: HardDrive,
		menu: Menu,
	};

	const IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
	<IconComponent {size} class={className} />
{/if}
