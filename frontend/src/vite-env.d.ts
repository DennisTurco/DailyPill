/// <reference types="vite/client" />

interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
  startScheduledQuiz: (topicId: number) => void;
}

interface Window {
  dailyPill?: DailyPillBridge;
}
