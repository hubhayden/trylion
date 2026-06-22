import { defaultData } from "./defaults";
import type { AppData, StorageSettings } from "./types";

const STORAGE_KEY = "creative-trust-points:v1";
const SETTINGS_KEY = "creative-trust-points:storage-settings:v1";

export function normalizeData(data: Partial<AppData> | null | undefined): AppData {
  const base = defaultData();
  return {
    ...base,
    ...(data ?? {}),
    users: data?.users ?? base.users,
    scoreRules: data?.scoreRules ?? base.scoreRules,
    uploadRecords: data?.uploadRecords ?? [],
    rewardUsages: data?.rewardUsages ?? [],
  };
}

export function loadData(): AppData {
  if (typeof localStorage === "undefined") {
    return defaultData();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = defaultData();
    saveData(seeded);
    return seeded;
  }

  try {
    return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    const seeded = defaultData();
    saveData(seeded);
    return seeded;
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadStorageSettings(): StorageSettings {
  if (typeof localStorage === "undefined") {
    return { mode: "local", sheetsApiUrl: "" };
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      mode: parsed.mode === "sheets" ? "sheets" : "local",
      sheetsApiUrl: typeof parsed.sheetsApiUrl === "string" ? parsed.sheetsApiUrl : "",
    };
  } catch {
    return { mode: "local", sheetsApiUrl: "" };
  }
}

export function saveStorageSettings(settings: StorageSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSheetsData(apiUrl: string): Promise<AppData> {
  return jsonp<AppData>(`${withAction(apiUrl, "load")}`)
    .then((data) => normalizeData(data))
    .then((data) => {
      saveData(data);
      return data;
    });
}

export async function saveSheetsData(apiUrl: string, data: AppData): Promise<void> {
  const payload = JSON.stringify({ action: "save", data });
  await fetch(apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: payload,
  });
}

function withAction(apiUrl: string, action: string) {
  const separator = apiUrl.includes("?") ? "&" : "?";
  return `${apiUrl}${separator}action=${encodeURIComponent(action)}`;
}

function jsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `trylionCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets response timed out"));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    }

    (window as unknown as Record<string, unknown>)[callbackName] = (value: T) => {
      cleanup();
      resolve(value);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheets response failed"));
    };
    script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}`;
    document.body.appendChild(script);
  });
}