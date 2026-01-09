/**
 * Mock for $app/navigation in vitest
 * Used when testing components that import from the engine package
 */

export const goto = async (url: string) => {
  console.log("[test mock] goto:", url);
};

export const invalidate = async (url: string) => {
  console.log("[test mock] invalidate:", url);
};

export const invalidateAll = async () => {
  console.log("[test mock] invalidateAll");
};

export const preloadData = async (url: string) => {
  console.log("[test mock] preloadData:", url);
};

export const preloadCode = async (url: string) => {
  console.log("[test mock] preloadCode:", url);
};

export const beforeNavigate = () => {};
export const afterNavigate = () => {};
export const onNavigate = () => {};
