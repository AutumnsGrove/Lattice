import { type GutterItem as GutterItemType, type Header } from '../../utils/gutter';
import '../../styles/content.css';
declare const ContentWithGutter: import("svelte").Component<{
    content?: string;
    gutterContent?: GutterItemType[];
    headers?: Header[];
    showTableOfContents?: boolean;
    children: any;
}, {}, "">;
type ContentWithGutter = ReturnType<typeof ContentWithGutter>;
export default ContentWithGutter;
