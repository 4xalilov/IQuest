/**
 * Session persistence: Telegram CloudStorage (callback API) when available, else localStorage,
 * else in-memory. Anything unreadable/corrupted loads as null (never throws).
 */
import type { SessionState, Store } from './types';
import { isSessionState } from './session';

export const STORE_KEY = 'iquest.session.v1';
/** Telegram CloudStorage value limit. */
export const CLOUD_MAX = 4096;
const CLOUD_TIMEOUT_MS = 2500;

interface CloudStorageLike {
  getItem(key: string, cb: (err: unknown, value?: string) => void): void;
  setItem(key: string, value: string, cb?: (err: unknown, ok?: boolean) => void): void;
  removeItem(key: string, cb?: (err: unknown, ok?: boolean) => void): void;
}

interface KV {
  get(k: string): Promise<string | null>;
  set(k: string, v: string): Promise<boolean>;
  remove(k: string): Promise<void>;
}

function cloudKV(cs: CloudStorageLike): KV {
  const call = <T>(fn: (done: (v: T) => void) => void, fallback: T): Promise<T> =>
    new Promise((resolve) => {
      let settled = false;
      const done = (v: T) => { if (!settled) { settled = true; resolve(v); } };
      const timer = setTimeout(() => done(fallback), CLOUD_TIMEOUT_MS);
      try {
        fn((v) => { clearTimeout(timer); done(v); });
      } catch {
        clearTimeout(timer);
        done(fallback);
      }
    });
  return {
    get: (k) => call<string | null>((d) => cs.getItem(k, (err, v) => d(err || typeof v !== 'string' || v === '' ? null : v)), null),
    set: (k, v) => call<boolean>((d) => cs.setItem(k, v, (err) => d(!err)), false),
    remove: (k) => call<void>((d) => cs.removeItem(k, () => d()), undefined),
  };
}

function localKV(): KV | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__iquest_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      get: async (k) => { try { return ls.getItem(k); } catch { return null; } },
      set: async (k, v) => { try { ls.setItem(k, v); return true; } catch { return false; } },
      remove: async (k) => { try { ls.removeItem(k); } catch { /* ignore */ } },
    };
  } catch {
    return null;
  }
}

function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    get: async (k) => m.get(k) ?? null,
    set: async (k, v) => { m.set(k, v); return true; },
    remove: async (k) => { m.delete(k); },
  };
}

function findCloud(): CloudStorageLike | null {
  try {
    const wa = (globalThis as { Telegram?: { WebApp?: { CloudStorage?: CloudStorageLike; isVersionAtLeast?: (v: string) => boolean } } }).Telegram?.WebApp;
    const cs = wa?.CloudStorage;
    if (!cs || typeof cs.getItem !== 'function' || typeof cs.setItem !== 'function') return null;
    if (typeof wa?.isVersionAtLeast === 'function' && !wa.isVersionAtLeast('6.9')) return null;
    return cs;
  } catch {
    return null;
  }
}

function parse(raw: string | null): SessionState | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return isSessionState(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Store priority: CloudStorage (if present and the value fits in 4096 chars) → localStorage →
 * memory. On load, the newest readable copy wins (CloudStorage first, then localStorage).
 */
export function createStore(): Store {
  const cloudRaw = findCloud();
  const cloud = cloudRaw ? cloudKV(cloudRaw) : null;
  const local = localKV() ?? memoryKV();
  return {
    async load() {
      if (cloud) {
        const s = parse(await cloud.get(STORE_KEY));
        if (s) return s;
      }
      return parse(await local.get(STORE_KEY));
    },
    async save(s) {
      const raw = JSON.stringify(s);
      if (cloud && raw.length <= CLOUD_MAX && (await cloud.set(STORE_KEY, raw))) {
        await local.remove(STORE_KEY); // avoid a stale local copy shadowing nothing / confusing load
        return;
      }
      if (cloud) await cloud.remove(STORE_KEY); // too big or failed: drop the stale cloud copy
      await local.set(STORE_KEY, raw);
    },
    async clear() {
      if (cloud) await cloud.remove(STORE_KEY);
      await local.remove(STORE_KEY);
    },
  };
}
