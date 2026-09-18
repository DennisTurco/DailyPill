import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, shell } from "electron";
import * as path from "path";
import { ChildProcess, spawn } from "child_process";
import AutoLaunch from "auto-launch";

const isDev = process.env.NODE_ENV === "development";
const API_PORT = 8420;

let mainWindow: BrowserWindow | null = null;
let infoFactWindow: BrowserWindow | null = null;
let quizStartWindow: BrowserWindow | null = null;
let quizWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendProcess: ChildProcess | null = null;
let lastFiredKey: string | null = null;
let lastShownFactId: number | null = null;
let snoozeUntil = 0;

const SNOOZE_MINUTES = 30;

const autoLauncher = new AutoLaunch({ name: "DailyPill" });

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function loadRoute(window: BrowserWindow, hash: string): void {
  if (isDev) {
    window.loadURL(`http://localhost:5173/#${hash}`);
  } else {
    window.loadFile(path.join(__dirname, "../dist/index.html"), { hash });
  }
}

function attachExternalLinkHandler(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    show: false,
    icon: path.join(__dirname, "assets", "app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRoute(mainWindow, "/");
  attachExternalLinkHandler(mainWindow);

  mainWindow.on("close", (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function showAndNavigate(route: string): void {
  if (!mainWindow) {
    createWindow();
  }
  mainWindow?.show();
  mainWindow?.focus();
  mainWindow?.webContents.send("navigate", route);
}

function openInfoFactPopup(): void {
  if (infoFactWindow) {
    infoFactWindow.show();
    infoFactWindow.focus();
    return;
  }

  infoFactWindow = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: "DailyPill",
    icon: path.join(__dirname, "assets", "app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachExternalLinkHandler(infoFactWindow);
  loadRoute(infoFactWindow, "/popup/info-fact");

  infoFactWindow.on("closed", () => {
    infoFactWindow = null;
  });
}

function openQuizStartPopup(topicId: number, topicName: string): void {
  const hash = `/popup/quiz-start?topicId=${topicId}&topicName=${encodeURIComponent(topicName)}`;

  if (quizStartWindow) {
    loadRoute(quizStartWindow, hash);
    quizStartWindow.show();
    quizStartWindow.focus();
    return;
  }

  quizStartWindow = new BrowserWindow({
    width: 440,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: "DailyPill",
    icon: path.join(__dirname, "assets", "app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachExternalLinkHandler(quizStartWindow);
  loadRoute(quizStartWindow, hash);

  quizStartWindow.on("closed", () => {
    quizStartWindow = null;
  });
}

function openQuizWindow(topicId: number): void {
  if (quizWindow) {
    quizWindow.show();
    quizWindow.focus();
    quizWindow.webContents.send("navigate", `/popup/quiz?topicId=${topicId}`);
    return;
  }

  quizWindow = new BrowserWindow({
    width: 720,
    height: 800,
    title: "DailyPill",
    icon: path.join(__dirname, "assets", "app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachExternalLinkHandler(quizWindow);
  loadRoute(quizWindow, `/popup/quiz?topicId=${topicId}`);

  quizWindow.on("closed", () => {
    quizWindow = null;
  });
}

function createTray(): void {
  const trayIconPath = path.join(
    __dirname,
    "assets",
    process.platform === "darwin" ? "tray-icon.png" : "tray-icon@2x.png",
  );
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip("DailyPill");

  const menu = Menu.buildFromTemplate([
    { label: "Open dashboard", click: () => showAndNavigate("/") },
    { label: "Start quiz now", click: () => showAndNavigate("/quiz") },
    {
      label: `Snooze reminders (${SNOOZE_MINUTES} min)`,
      click: () => {
        snoozeUntil = Date.now() + SNOOZE_MINUTES * 60_000;
        const until = new Date(snoozeUntil);
        const untilLabel = `${String(until.getHours()).padStart(2, "0")}:${String(until.getMinutes()).padStart(2, "0")}`;
        if (Notification.isSupported()) {
          new Notification({
            title: "DailyPill",
            body: `Reminders snoozed until ${untilLabel}.`,
          }).show();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => showAndNavigate("/"));
}

function spawnBackend(): void {
  if (isDev) {
    return;
  }
  const backendDir = path.join(process.resourcesPath, "backend");
  const apiExe = path.join(backendDir, process.platform === "win32" ? "DailyPill.Api.exe" : "DailyPill.Api");
  backendProcess = spawn(apiExe, [], {
    cwd: backendDir,
    windowsHide: true,
  });
  backendProcess.stdout?.on("data", (chunk) => console.log(`[backend] ${chunk}`));
  backendProcess.stderr?.on("data", (chunk) => console.error(`[backend] ${chunk}`));
}

async function checkSchedules(): Promise<void> {
  if (Date.now() < snoozeUntil) return;
  try {
    const response = await fetch(`http://localhost:${API_PORT}/schedules`);
    if (!response.ok) return;
    const schedules: Array<{ topic_id: number; topic_name: string; day_of_week: number; time_of_day: string }> =
      await response.json();

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    for (const schedule of schedules) {
      if (schedule.day_of_week === currentDay && schedule.time_of_day === currentTime) {
        const key = `${schedule.topic_id}-${schedule.day_of_week}-${schedule.time_of_day}-${now.toDateString()}`;
        if (lastFiredKey === key) continue;
        lastFiredKey = key;
        openQuizStartPopup(schedule.topic_id, schedule.topic_name);
      }
    }
  } catch {
    // Backend not reachable yet; ignore and try again next tick.
  }
}

async function checkDailyFact(): Promise<void> {
  if (Date.now() < snoozeUntil) return;
  try {
    const response = await fetch(`http://localhost:${API_PORT}/info-facts/daily`);
    if (!response.ok) return;
    const fact: { id: number } = await response.json();
    if (fact.id === lastShownFactId) return;
    lastShownFactId = fact.id;
    openInfoFactPopup();
  } catch {
    // Backend not reachable, or no facts exist yet; ignore and try again next tick.
  }
}

app.on("second-instance", () => {
  showAndNavigate("/");
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  spawnBackend();
  createWindow();
  createTray();

  if (!isDev) {
    try {
      const isEnabled = await autoLauncher.isEnabled();
      if (!isEnabled) await autoLauncher.enable();
    } catch {
      // Auto-launch registration can fail silently on some platforms/packaging setups.
    }
  }

  setInterval(() => {
    checkSchedules();
    checkDailyFact();
  }, 60_000);
});

ipcMain.handle("get-api-base-url", () => `http://localhost:${API_PORT}`);

ipcMain.on("close-current-window", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.on("quiz-popup:start", (event, topicId: number) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
  openQuizWindow(topicId);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep running in the tray; do not quit.
  }
});

app.on("before-quit", () => {
  (app as any).isQuitting = true;
  backendProcess?.kill();
});
