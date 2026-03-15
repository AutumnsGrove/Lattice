// @autumnsgrove/prism — Icon manifest
//
// THE vocabulary for all icons in Grove. Pure data — no component imports.
// Maps semantic aliases (what code uses) to icon pack names (what renders).
//
// This file is the SSOT. When a new icon is needed, add it here first.

import type { IconGroupManifest, IconGroupName, IconManifest } from "./types.js";

// ---------------------------------------------------------------------------
// Normalizer — case & delimiter insensitive lookups
// ---------------------------------------------------------------------------

/**
 * Normalize an icon key for forgiving lookups.
 * Strips `-` and `_` delimiters, lowercases the result.
 *
 * "checkCircle" = "CHECK_CIRCLE" = "check-circle" = "checkcircle"
 */
export function normalize(key: string): string {
	return key.replace(/[-_]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Canonical key sets — built lazily from the manifest for O(1) validation
// ---------------------------------------------------------------------------

let _allKeysNormalized: Set<string> | null = null;
let _groupKeysNormalized: Map<IconGroupName, Set<string>> | null = null;

function ensureKeyIndexes(): void {
	if (_allKeysNormalized) return;

	_allKeysNormalized = new Set<string>();
	_groupKeysNormalized = new Map<IconGroupName, Set<string>>();

	for (const [groupName, group] of Object.entries(ICON_MANIFEST)) {
		const groupSet = new Set<string>();
		for (const key of Object.keys(group)) {
			const normalized = normalize(key);
			_allKeysNormalized.add(normalized);
			groupSet.add(normalized);
		}
		_groupKeysNormalized.set(groupName as IconGroupName, groupSet);
	}
}

// ---------------------------------------------------------------------------
// Type guards — Rootwork-inspired validation at trust boundaries
// ---------------------------------------------------------------------------

/**
 * Is this string a valid icon alias in ANY group?
 * Uses the forgiving normalizer — "CHECK_CIRCLE" matches "checkCircle".
 */
export function isIconKey(key: string): boolean {
	ensureKeyIndexes();
	return _allKeysNormalized!.has(normalize(key));
}

/**
 * Is this string a valid icon alias in a SPECIFIC group?
 * Uses the forgiving normalizer.
 */
export function isGroupKey(group: IconGroupName, key: string): boolean {
	ensureKeyIndexes();
	const groupSet = _groupKeysNormalized!.get(group);
	if (!groupSet) return false;
	return groupSet.has(normalize(key));
}

/**
 * Get all canonical (pre-normalization) keys for a group.
 */
export function getGroupKeys(group: IconGroupName): string[] {
	return Object.keys(ICON_MANIFEST[group] ?? {});
}

/**
 * Get all group names.
 */
export function getGroupNames(): IconGroupName[] {
	return Object.keys(ICON_MANIFEST) as IconGroupName[];
}

/**
 * Find which group(s) contain a given key. Returns empty array if not found.
 * Useful for debugging and the icon reference generator.
 */
export function findKeyGroups(key: string): IconGroupName[] {
	ensureKeyIndexes();
	const normalized = normalize(key);
	const results: IconGroupName[] = [];
	for (const [groupName, groupSet] of _groupKeysNormalized!) {
		if (groupSet.has(normalized)) {
			results.push(groupName);
		}
	}
	return results;
}

// ---------------------------------------------------------------------------
// Manifest — stub groups (populated in Phase 0b)
// ---------------------------------------------------------------------------

/**
 * The complete icon manifest for Grove.
 *
 * Keys are semantic aliases (camelCase canonical form).
 * Values are icon pack component names (PascalCase, matching @lucide/svelte exports).
 *
 * To add an icon: pick the right group, add `aliasName: "LucideComponentName"`.
 */
export const ICON_MANIFEST: IconManifest = {
	// -----------------------------------------------------------------------
	// nav — Navigation and wayfinding
	// -----------------------------------------------------------------------
	nav: {
		home: "Home",
		search: "Search",
		menu: "Menu",
		arrowRight: "ArrowRight",
		arrowLeft: "ArrowLeft",
		arrowUpRight: "ArrowUpRight",
		arrowDownRight: "ArrowDownRight",
		chevronRight: "ChevronRight",
		chevronLeft: "ChevronLeft",
		chevronDown: "ChevronDown",
		chevronUp: "ChevronUp",
		external: "ExternalLink",
		globe: "Globe",
		earth: "Earth",
		compass: "Compass",
		mapPin: "MapPin",
		signpost: "Signpost",
		route: "Route",
		waypoints: "Waypoints",
	},

	// -----------------------------------------------------------------------
	// state — Feedback and status
	// -----------------------------------------------------------------------
	state: {
		check: "Check",
		checkCircle: "CheckCircle",
		checkCircle2: "CheckCircle2",
		x: "X",
		xCircle: "XCircle",
		loader: "Loader2",
		warning: "AlertTriangle",
		alertCircle: "AlertCircle",
		help: "HelpCircle",
		info: "Info",
		circle: "Circle",
		lock: "Lock",
		ban: "Ban",
		eye: "Eye",
		eyeOff: "EyeOff",
		smile: "Smile",
		meh: "Meh",
		frown: "Frown",
	},

	// -----------------------------------------------------------------------
	// nature — Grove's soul — growth and life
	// -----------------------------------------------------------------------
	nature: {
		sprout: "Sprout",
		leaf: "Leaf",
		heart: "Heart",
		heartPulse: "HeartPulse",
		flower: "Flower",
		flower2: "Flower2",
		cherry: "Cherry",
		trees: "Trees",
		treeDeciduous: "TreeDeciduous",
		treePine: "TreePine",
		shrub: "Shrub",
		crown: "Crown",
		footprints: "Footprints",
		bird: "Bird",
		shell: "Shell",
		flame: "Flame",
		wind: "Wind",
		cloudSun: "CloudSun",
		sun: "Sun",
		moon: "Moon",
		snowflake: "Snowflake",
	},

	// -----------------------------------------------------------------------
	// season — Seasonal theming system
	// -----------------------------------------------------------------------
	season: {
		spring: "Flower2",
		summer: "Sun",
		autumn: "Leaf",
		winter: "Snowflake",
		midnight: "Moon",
	},

	// -----------------------------------------------------------------------
	// action — User-initiated operations
	// -----------------------------------------------------------------------
	action: {
		plus: "Plus",
		minus: "Minus",
		copy: "Copy",
		trash: "Trash2",
		settings: "Settings",
		download: "Download",
		upload: "Upload",
		send: "Send",
		save: "Save",
		refresh: "RefreshCw",
		rotateCcw: "RotateCcw",
		edit: "Pencil",
		penLine: "PenLine",
		penTool: "PenTool",
		share: "Share2",
		reply: "Reply",
		bookmark: "Bookmark",
		bookMarked: "BookMarked",
		filter: "Filter",
		ellipsis: "Ellipsis",
		bold: "Bold",
		italic: "Italic",
		heading1: "Heading1",
		heading2: "Heading2",
		heading3: "Heading3",
		list: "List",
		link: "Link",
		type: "Type",
		sticker: "Sticker",
		mousePointer: "MousePointer",
		hand: "Hand",
		focus: "Focus",
	},

	// -----------------------------------------------------------------------
	// feature — Platform capabilities
	// -----------------------------------------------------------------------
	feature: {
		mail: "Mail",
		mailOpen: "MailOpen",
		mailX: "MailX",
		mailbox: "Mailbox",
		hardDrive: "HardDrive",
		palette: "Palette",
		paintbrush: "PaintbrushVertical",
		swatchBook: "SwatchBook",
		cloud: "Cloud",
		cloudCog: "CloudCog",
		searchCode: "SearchCode",
		archive: "Archive",
		rss: "Rss",
		fileText: "FileText",
		fileCode: "FileCode",
		fileBox: "FileBox",
		fileStack: "FileStack",
		fileEdit: "FileEdit",
		fileWarning: "FileWarning",
		tag: "Tag",
		hash: "Hash",
		layers: "Layers",
		database: "Database",
		server: "Server",
		serverCog: "ServerCog",
		image: "Image",
		images: "Images",
		imageUp: "ImageUp",
		layout: "Layout",
		layoutDashboard: "LayoutDashboard",
		layoutList: "LayoutList",
		component: "Component",
		box: "Box",
		package: "Package",
		code: "Code",
		terminal: "Terminal",
		webhook: "Webhook",
		network: "Network",
		bookOpen: "BookOpen",
		bookType: "BookType",
		bookUser: "BookUser",
		bookOpenCheck: "BookOpenCheck",
		notebookText: "NotebookText",
		notebookPen: "NotebookPen",
		messageCircle: "MessageCircle",
		messageSquare: "MessageSquare",
		messageSquareText: "MessageSquareText",
		messageSquareDot: "MessageSquareDot",
		messagesSquare: "MessagesSquare",
		newspaper: "Newspaper",
		globe: "Globe",
		globeLock: "GlobeLock",
		listTree: "ListTree",
		gitBranch: "GitBranch",
		galleryHorizontalEnd: "GalleryHorizontalEnd",
		chevronsLeftRightEllipsis: "ChevronsLeftRightEllipsis",
		squaresExclude: "SquaresExclude",
	},

	// -----------------------------------------------------------------------
	// auth — Authentication and security
	// -----------------------------------------------------------------------
	auth: {
		fingerprint: "Fingerprint",
		key: "KeyRound",
		keyLegacy: "Key",
		shield: "Shield",
		shieldCheck: "ShieldCheck",
		shieldAlert: "ShieldAlert",
		shieldOff: "ShieldOff",
		shieldUser: "ShieldUser",
		login: "LogIn",
		logout: "LogOut",
		lock: "Lock",
		user: "User",
		userPlus: "UserPlus",
		userCheck: "UserCheck",
		userMinus: "UserMinus",
		userX: "UserX",
		users: "Users",
		idCard: "IdCard",
		idCardLanyard: "IdCardLanyard",
		badgeCheck: "BadgeCheck",
		vault: "Vault",
		contact: "Contact",
		atSign: "AtSign",
	},

	// -----------------------------------------------------------------------
	// metric — Analytics and measurement
	// -----------------------------------------------------------------------
	metric: {
		clock: "Clock",
		calendar: "Calendar",
		calendarDays: "CalendarDays",
		trending: "TrendingUp",
		trendDown: "TrendingDown",
		activity: "Activity",
		barChart: "BarChart3",
		gauge: "Gauge",
		radar: "Radar",
		users: "Users",
		dollarSign: "DollarSign",
		creditCard: "CreditCard",
		handCoins: "HandCoins",
	},

	// -----------------------------------------------------------------------
	// phase — Mystical and aspirational
	// -----------------------------------------------------------------------
	phase: {
		gem: "Gem",
		sparkles: "Sparkles",
		star: "Star",
		moon: "Moon",
		sun: "Sun",
		award: "Award",
		trophy: "Trophy",
		partyPopper: "PartyPopper",
		zap: "Zap",
		lightbulb: "Lightbulb",
		rocket: "Rocket",
		brain: "Brain",
		flaskConical: "FlaskConical",
	},

	// -----------------------------------------------------------------------
	// tool — Grove tools and services (flat)
	//
	// Every Grove service gets one entry. tool.reverie → "Eclipse" means
	// any package can render Reverie's icon without knowing the Lucide name.
	// -----------------------------------------------------------------------
	tool: {
		// Core infrastructure
		lattice: "Layers",
		heartwood: "Fingerprint",
		loom: "FileBox",
		threshold: "Building2",
		aspen: "TreeDeciduous",
		// Content & creation
		arbor: "PenLine",
		garden: "Flower",
		blooms: "NotebookText",
		curios: "Amphora",
		terrarium: "Frame",
		weave: "SplinePointer",
		flow: "DraftingCompass",
		scribe: "Mic",
		// Communication
		ivy: "Mailbox",
		chirp: "MessageCircle",
		reeds: "MessageSquareDot",
		meadow: "Users",
		forests: "Trees",
		porch: "RockingChair",
		// AI & intelligence
		reverie: "Eclipse",
		lumen: "LampCeiling",
		moss: "Leaf",
		wisp: "Wind",
		gossamer: "Sparkles",
		// Storage & media
		amber: "HardDrive",
		shutter: "Aperture",
		petal: "Fan",
		press: "Stamp",
		// Security & moderation
		warden: "Vault",
		thorn: "ShieldCheck",
		shade: "Bot",
		// Discovery & navigation
		forage: "SearchCode",
		lantern: "Lamp",
		wander: "Earth",
		passage: "Kayak",
		burrow: "Network",
		scout: "ShoppingBasket",
		trove: "ScanQrCode",
		// Monitoring & operations
		clearing: "Activity",
		sentinel: "Radar",
		vista: "Cpu",
		rings: "Eye",
		// Theming & design
		foliage: "SwatchBook",
		prism: "Palette",
		// Domain & infrastructure
		loam: "Funnel",
		centennial: "SquaresExclude",
		greenhouse: "Warehouse",
		zephyr: "Cable",
		patina: "Database",
		// Identity & auth
		passkeys: "Fingerprint",
		// Integrations
		mycelium: "CircuitBoard",
		songbird: "Bird",
		bloom: "Zap",
		outpost: "Telescope",
		pantry: "Store",
		trace: "Footprints",
		etch: "Highlighter",
		trails: "MapPinPlus",
		// Feature management
		grafts: "Flag",
		graftsOff: "FlagOff",
		graftsPropagate: "FileStack",
		graftsBlight: "TriangleAlert",
		graftsCultivate: "Unplug",
		graftsCultivars: "Gamepad",
		// Verge
		verge: "Zap",
		// Nook
		nook: "BadgeCheck",
	},

	// -----------------------------------------------------------------------
	// blaze — Content marker categories
	//
	// Icons for the blaze system (post type badges, custom content markers).
	// Must cover all icons in LUCIDE_ICON_MAP from blazes/palette.ts.
	// -----------------------------------------------------------------------
	blaze: {
		bell: "Bell",
		utensilsCrossed: "UtensilsCrossed",
		heart: "Heart",
		graduationCap: "GraduationCap",
		hammer: "Hammer",
		star: "Star",
		cloudSun: "CloudSun",
		megaphone: "Megaphone",
		bookOpen: "BookOpen",
		penLine: "PenLine",
		lightbulb: "Lightbulb",
		sparkles: "Sparkles",
		palette: "Palette",
		leaf: "Leaf",
		flower2: "Flower2",
		sprout: "Sprout",
		treeDeciduous: "TreeDeciduous",
		flame: "Flame",
		sun: "Sun",
		moon: "Moon",
		compass: "Compass",
		mapPin: "MapPin",
		globe: "Globe",
		plane: "Plane",
		footprints: "Footprints",
		camera: "Camera",
		coffee: "Coffee",
		music: "Music",
		headphones: "Headphones",
		chefHat: "ChefHat",
		gift: "Gift",
		umbrella: "Umbrella",
		laptop: "Laptop",
		briefcase: "Briefcase",
		rocket: "Rocket",
		zap: "Zap",
		tag: "Tag",
		messageCircle: "MessageCircle",
		crown: "Crown",
		key: "Key",
		notebookText: "NotebookText",
		feather: "Feather",
	},

	// -----------------------------------------------------------------------
	// chrome — UI chrome and layout
	//
	// Icons specific to UI structure: dashboards, panels, frames.
	// -----------------------------------------------------------------------
	chrome: {
		dashboard: "LayoutDashboard",
		layers: "Layers",
		component: "Component",
		frame: "Frame",
		shapes: "Shapes",
		panelLeftOpen: "PanelLeftOpen",
		sliders: "SlidersHorizontal",
		monitor: "Monitor",
		smartphone: "Smartphone",
		blinds: "Blinds",
		dock: "Dock",
		pyramid: "Pyramid",
		toolbox: "Wrench",
		origami: "Origami",
		toolCase: "ToolCase",
		codepen: "Codepen",
		codesandbox: "Codesandbox",
		grape: "Grape",
		pickaxe: "Pickaxe",
		pencilRuler: "PencilRuler",
		brickWall: "BrickWall",
		brickWallFire: "BrickWallFire",
		solarPanel: "SolarPanel",
		refrigerator: "Refrigerator",
		projector: "Projector",
		spool: "Spool",
		binoculars: "Binoculars",
		landPlot: "LandPlot",
		goal: "Goal",
		regex: "Regex",
		sendToBack: "SendToBack",
		waves: "Waves",
		lineSquiggle: "LineSquiggle",
		draftingCompass: "DraftingCompass",
		squareAsterisk: "SquareAsterisk",
		github: "Github",
		chrome: "Chrome",
		volume: "Volume2",
		micOff: "MicOff",
		mic: "Mic",
		wand: "Wand2",
		qrCode: "QrCode",
		lifebuoy: "LifeBuoy",
		telescope: "Telescope",
		handCoins: "HandCoins",
		thumbsUp: "ThumbsUp",
		thumbsDown: "ThumbsDown",
	},
};

// ---------------------------------------------------------------------------
// Reset key indexes (for testing — allows manifest mutation between tests)
// ---------------------------------------------------------------------------

/** @internal — reset cached indexes. Only use in tests. */
export function _resetKeyIndexes(): void {
	_allKeysNormalized = null;
	_groupKeysNormalized = null;
}
