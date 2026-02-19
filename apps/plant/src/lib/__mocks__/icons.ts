/**
 * Mock icon components for testing.
 * These stub the Lucide icons imported from @autumnsgrove/lattice/ui/icons
 */

// Create a simple stub component constructor
const createIconStub = (name: string) => {
  const stub = () => null;
  stub.displayName = name;
  return stub;
};

// Export the icons used in plans.ts
export const Sprout = createIconStub("Sprout");
export const TreeDeciduous = createIconStub("TreeDeciduous");
export const Trees = createIconStub("Trees");
export const Crown = createIconStub("Crown");
