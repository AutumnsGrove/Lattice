import type { StoredDraft } from "./composables";
import type { GutterItem as GutterItemProp } from "$lib/utils/gutter";

export type FlagsRecord = Record<string, boolean>;

export interface MarkdownEditorProps {
	content?: string;
	onSave?: () => void;
	saving?: boolean;
	readonly?: boolean;
	draftKey?: string | null;
	onDraftRestored?: (draft: StoredDraft) => void;
	previewTitle?: string;
	previewDate?: string;
	previewTags?: string[];
	gutterItems?: GutterItemProp[];
	flags?: FlagsRecord;
	configuredCurios?: { slug: string; name: string; enabled: boolean }[];
	serverDraftSlug?: string | null;
	/**
	 * Where to ask for photo uploads when the gate says no (#1626). Built by the
	 * app, because only it knows the tenant; the editor just renders the door.
	 */
	uploadAccessUrl?: string | null;
}
