const STORAGE_KEY = "dailypill-sidebar-collapsed";

export function getStoredSidebarCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function storeSidebarCollapsed(collapsed: boolean) {
  localStorage.setItem(STORAGE_KEY, String(collapsed));
}
