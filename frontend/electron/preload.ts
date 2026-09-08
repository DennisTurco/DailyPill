import { contextBridge, ipcRenderer } from "electron";

export interface DailyPillBridge {
  getApiBaseUrl: () => Promise<string>;
  onNavigate: (callback: (route: string) => void) => void;
  closeWindow: () => void;
}

const bridge: DailyPillBridge = {
  getApiBaseUrl: () => ipcRenderer.invoke("get-api-base-url"),
  onNavigate: (callback) => {
    ipcRenderer.on("navigate", (_event, route: string) => callback(route));
  },
  closeWindow: () => ipcRenderer.send("close-current-window"),
};

contextBridge.exposeInMainWorld("dailyPill", bridge);
