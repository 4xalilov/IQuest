/**
 * Small synchronous key/value persistence for app-level data (profile, results, flags).
 * The test session itself goes through engine `createStore()` (CloudStorage when available).
 * Every access is guarded: storage can be missing in previews / private mode.
 */
const PREFIX = 'iquest.app.';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / unavailable — keep in memory */
  }
}

/** Removes every app-level key (used by "delete my data"). */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('iquest.')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
