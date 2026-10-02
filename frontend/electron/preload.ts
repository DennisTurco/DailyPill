import { contextBridge, ipcRenderer } from "electron";
import type { CodeRunResult } from "./codeRunner";

export interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
  startScheduledQuiz: (topicId: number) => void;
  runCode: (language: string, code: string) => Promise<CodeRunResult>;
}

const bridge: DailyPillBridge = {
  getApiBaseUrl: () => ipcRenderer.invoke("get-api-base-url"),
  onNavigate: (callback) => {
    ipcRenderer.on("navigate", (_event, route: string) => callback(route));
  },
  closeWindow: () => ipcRenderer.send("close-current-window"),
  startScheduledQuiz: (topicId) => ipcRenderer.send("quiz-popup:start", topicId),
  runCode: (language, code) => ipcRenderer.invoke("code:run", language, code),
};

contextBridge.exposeInMainWorld("dailyPill", bridge);
