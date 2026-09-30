import { useCallback, useEffect, useState } from "react";

// Device ids are specific to this browser and origin, so the choice lives in localStorage
// rather than in the backend settings.
const STORAGE_KEY = "dailypill.microphoneId";
const CHANGE_EVENT = "dailypill:microphone-change";

/** The chosen input device id, or null for the system default. */
export function getPreferredMicrophone(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setPreferredMicrophone(deviceId: string | null) {
  try {
    if (deviceId) localStorage.setItem(STORAGE_KEY, deviceId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the choice just won't survive a reload.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Audio input devices plus the current choice, kept in sync across every picker on the page. */
export function useMicrophones() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(getPreferredMicrophone);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("This browser can't list microphones.");
      return;
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    // Chrome adds "default"/"communications" aliases of real devices; "System default" already covers them.
    setDevices(all.filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications"));
  }, []);

  useEffect(() => {
    void refresh();
    const onChoice = () => setSelectedId(getPreferredMicrophone());
    window.addEventListener(CHANGE_EVENT, onChoice);
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChoice);
      navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
    };
  }, [refresh]);

  // Browsers hide device names (and real ids) until the page has been granted microphone access once.
  const needsPermission = devices.length > 0 && devices.every((d) => !d.label);

  async function requestPermission() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (err) {
      setError(`Microphone access denied: ${String(err)}`);
    }
  }

  // A saved device that has been unplugged falls back to the default when recording.
  const selectedAvailable = selectedId === null || needsPermission || devices.some((d) => d.deviceId === selectedId);

  return { devices, selectedId, selectedAvailable, needsPermission, error, requestPermission, select: setPreferredMicrophone };
}
