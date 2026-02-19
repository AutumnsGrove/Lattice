/**
 * Sidebar store for coordinating Arbor sidebar toggle across layouts.
 *
 * The Chrome Header (in root layout) and Arbor sidebar (in admin layout)
 * need to communicate. This store bridges them.
 *
 * Two modes of operation:
 * - Mobile (≤768px): `open` controls slide-in overlay
 * - Desktop (>768px): `collapsed` controls collapse to 72px icons
 */

let sidebarOpen = $state(false);
let sidebarCollapsed = $state(false);

export const sidebarStore = {
  // Mobile: slide-in overlay
  get open() {
    return sidebarOpen;
  },

  toggle() {
    sidebarOpen = !sidebarOpen;
  },

  close() {
    sidebarOpen = false;
  },

  set(value: boolean) {
    sidebarOpen = value;
  },

  // Desktop: collapse to icons
  get collapsed() {
    return sidebarCollapsed;
  },

  toggleCollapse() {
    sidebarCollapsed = !sidebarCollapsed;
  },

  setCollapsed(value: boolean) {
    sidebarCollapsed = value;
  },
};
