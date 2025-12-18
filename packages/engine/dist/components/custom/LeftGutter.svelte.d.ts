export default LeftGutter;
type LeftGutter = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const LeftGutter: import("svelte").Component<{
    items?: any;
    headers?: any;
    contentHeight?: number;
    onOverflowChange?: any;
}, {}, "">;
type $$ComponentProps = {
    items?: any;
    headers?: any;
    contentHeight?: number;
    onOverflowChange?: any;
};
