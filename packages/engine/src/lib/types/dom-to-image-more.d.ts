/**
 * Type declarations for dom-to-image-more
 *
 * Grove — A place to Be
 * Copyright (c) 2025 Autumn Brown
 * Licensed under AGPL-3.0
 */

declare module "dom-to-image-more" {
  interface Options {
    /** Filter out elements */
    filter?: (node: Element) => boolean;
    /** Background color */
    bgcolor?: string;
    /** Image width */
    width?: number;
    /** Image height */
    height?: number;
    /** Style to apply to the root element */
    style?: Record<string, string>;
    /** Image quality (0-1) */
    quality?: number;
    /** Cache bust */
    cacheBust?: boolean;
    /** Image placeholder */
    imagePlaceholder?: string;
  }

  interface DomToImage {
    toSvg(node: Node, options?: Options): Promise<string>;
    toPng(node: Node, options?: Options): Promise<string>;
    toJpeg(node: Node, options?: Options): Promise<string>;
    toBlob(node: Node, options?: Options): Promise<Blob>;
    toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
  }

  const domtoimage: DomToImage;
  export default domtoimage;
}
