const STORAGE_KEY = "dailypill-onboarding-seen";
const TRIGGER_EVENT = "dailypill:show-onboarding";

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markOnboardingSeen() {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function triggerOnboarding() {
  window.dispatchEvent(new Event(TRIGGER_EVENT));
}

export function onOnboardingTrigger(callback: () => void): () => void {
  window.addEventListener(TRIGGER_EVENT, callback);
  return () => window.removeEventListener(TRIGGER_EVENT, callback);
}
