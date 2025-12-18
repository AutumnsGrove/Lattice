export default MarkdownEditor;
type MarkdownEditor = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
} & {
    getAvailableAnchors: () => string[];
    insertAnchor: (name: string) => void;
    clearDraft: () => void;
    getDraftStatus: () => {
        hasDraft: boolean;
        storedDraft: StoredDraft | null;
    };
};
declare const MarkdownEditor: import("svelte").Component<{
    content?: string;
    onSave?: Function;
    saving?: boolean;
    readonly?: boolean;
    draftKey?: any;
    onDraftRestored?: any;
    previewTitle?: string;
    previewDate?: string;
    previewTags?: any;
}, {
    getAvailableAnchors: () => string[];
    insertAnchor: (name: string) => void;
    clearDraft: () => void;
    getDraftStatus: () => {
        hasDraft: boolean;
        storedDraft: import("./composables/useDraftManager.svelte.js").StoredDraft | null;
    };
}, "content">;
type $$ComponentProps = {
    content?: string;
    onSave?: Function;
    saving?: boolean;
    readonly?: boolean;
    draftKey?: any;
    onDraftRestored?: any;
    previewTitle?: string;
    previewDate?: string;
    previewTags?: any;
};
