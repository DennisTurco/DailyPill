/// <reference types="vite/client" />

interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
  startScheduledQuiz: (topicId: number) => void;
  runCode: (language: string, code: string) => Promise<import("./lib/codeRunner").CodeRunResult>;
  getPathForFile: (file: File) => string;
}

interface Window {
  dailyPill?: DailyPillBridge;
}
