import { contextBridge, ipcRenderer } from "electron";

export interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
  startScheduledQuiz: (topicId: number) => void;
}

const bridge: DailyPillBridge = {
  getApiBaseUrl: () => ipcRenderer.invoke("get-api-base-url"),
  onNavigate: (callback) => {
    ipcRenderer.on("navigate", (_event, route: string) => callback(route));
  },
  closeWindow: () => ipcRenderer.send("close-current-window"),
  startScheduledQuiz: (topicId) => ipcRenderer.send("quiz-popup:start", topicId),
};

contextBridge.exposeInMainWorld("dailyPill", bridge);
