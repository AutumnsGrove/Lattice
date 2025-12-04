export default MarkdownEditor;
type MarkdownEditor = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
} & {
    getAvailableAnchors: () => string[];
    insertAnchor: (name: any) => void;
    clearDraft: () => void;
    getDraftStatus: () => any;
};
declare const MarkdownEditor: import("svelte").Component<{
    content?: string;
    onSave?: Function;
    saving?: boolean;
    readonly?: boolean;
    draftKey?: any;
    onDraftRestored?: Function;
    previewTitle?: string;
    previewDate?: string;
    previewTags?: any[];
}, {
    getAvailableAnchors: () => string[];
    insertAnchor: (name: any) => void;
    clearDraft: () => void;
    getDraftStatus: () => any;
}, "content">;
type $$ComponentProps = {
    content?: string;
    onSave?: Function;
    saving?: boolean;
    readonly?: boolean;
    draftKey?: any;
    onDraftRestored?: Function;
    previewTitle?: string;
    previewDate?: string;
    previewTags?: any[];
};
