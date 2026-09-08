/// <reference types="vite/client" />

interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
}

interface Window {
  dailyPill?: DailyPillBridge;
}
