const DEFAULT_BASE_URL = "http://localhost:8420";

let cachedBaseUrl: string | null = null;

async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  if (window.dailyPill) {
    cachedBaseUrl = await window.dailyPill.getApiBaseUrl();
  } else {
    cachedBaseUrl = DEFAULT_BASE_URL;
  }
  return cachedBaseUrl;
}

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.detail === "string") return parsed.detail;
    if (typeof parsed?.title === "string") return parsed.title;
  } catch {
    // Not JSON (e.g. an ASP.NET Core dev-exception-page dump) — fall through.
  }
  return body.split("\n")[0].trim();
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : fallback;
}

async function downloadFile(path: string): Promise<DownloadedFile> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, { method: "POST" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${extractErrorMessage(body)}`);
  }
  const blob = await response.blob();
  const filename = filenameFromContentDisposition(response.headers.get("Content-Disposition"), "export.yaml");
  return { blob, filename };
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${extractErrorMessage(body)}`);
  }
  return response.json() as Promise<T>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${extractErrorMessage(body)}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => uploadRequest<T>(path, formData),
  downloadFile: (path: string) => downloadFile(path),
};
