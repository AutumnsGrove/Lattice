// Type utility for components that need element ref
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
  ref?: E | null;
};

// Re-export everything from utils directory (includes cn, api, csrf, etc.)
export * from "./utils/index";
