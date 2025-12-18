export default GutterManager;
type GutterManager = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const GutterManager: import("svelte").Component<{
    gutterItems?: any;
    onInsertAnchor?: any;
    availableAnchors?: any;
}, {}, "gutterItems">;
type $$ComponentProps = {
    gutterItems?: any;
    onInsertAnchor?: any;
    availableAnchors?: any;
};
