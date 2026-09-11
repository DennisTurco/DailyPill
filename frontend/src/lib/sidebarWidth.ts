const STORAGE_KEY = "dailypill-sidebar-width";

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 212;

function clamp(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

export function getStoredSidebarWidth(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isNaN(parsed) ? SIDEBAR_DEFAULT_WIDTH : clamp(parsed);
}

export function storeSidebarWidth(width: number) {
  localStorage.setItem(STORAGE_KEY, String(clamp(width)));
}
