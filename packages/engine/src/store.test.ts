import { afterEach, describe, expect, it } from 'vitest';
import { buildForm } from './generator';
import { newSession } from './session';
import { createStore, STORE_KEY } from './store';

const g = globalThis as Record<string, unknown>;
const form = buildForm(2);

function fakeLocal() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
function fakeCloud() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string, cb: (e: unknown, v?: string) => void) => setTimeout(() => cb(null, m.get(k) ?? ''), 0),
    setItem: (k: string, v: string, cb?: (e: unknown, ok?: boolean) => void) =>
      setTimeout(() => (v.length > 4096 ? cb?.('VALUE_TOO_LONG') : (m.set(k, v), cb?.(null, true))), 0),
    removeItem: (k: string, cb?: (e: unknown, ok?: boolean) => void) => setTimeout(() => (m.delete(k), cb?.(null, true)), 0),
  };
}

afterEach(() => {
  delete g.localStorage;
  delete g.Telegram;
});

describe('createStore', () => {
  it('works in memory when nothing is available', async () => {
    const st = createStore();
    expect(await st.load()).toBeNull();
    const s = newSession(form, 2);
    await st.save(s);
    expect(await st.load()).toEqual(s);
    await st.clear();
    expect(await st.load()).toBeNull();
  });

  it('uses localStorage and returns null for corrupted JSON', async () => {
    const ls = fakeLocal();
    g.localStorage = ls;
    const st = createStore();
    await st.save(newSession(form, 2));
    expect(ls.m.has(STORE_KEY)).toBe(true);
    ls.m.set(STORE_KEY, '{not json');
    expect(await st.load()).toBeNull();
    ls.m.set(STORE_KEY, JSON.stringify({ formId: 'x' }));
    expect(await st.load()).toBeNull();
  });

  it('prefers Telegram CloudStorage and keeps values under 4096 chars', async () => {
    const ls = fakeLocal();
    const cs = fakeCloud();
    g.localStorage = ls;
    g.Telegram = { WebApp: { CloudStorage: cs, isVersionAtLeast: () => true } };
    const st = createStore();
    const s = newSession(form, 2);
    await st.save(s);
    expect(cs.m.get(STORE_KEY)!.length).toBeLessThanOrEqual(4096);
    expect(ls.m.has(STORE_KEY)).toBe(false);
    expect(await st.load()).toEqual(s);
    cs.m.set(STORE_KEY, 'garbage');
    expect(await st.load()).toBeNull();
    await st.clear();
    expect(cs.m.has(STORE_KEY)).toBe(false);
  });

  it('falls back to localStorage when the value is too large for CloudStorage', async () => {
    const ls = fakeLocal();
    const cs = fakeCloud();
    g.localStorage = ls;
    g.Telegram = { WebApp: { CloudStorage: cs } };
    const st = createStore();
    const s = { ...newSession(form, 2), formId: 'x'.repeat(5000) };
    await st.save(s);
    expect(cs.m.has(STORE_KEY)).toBe(false);
    expect(ls.m.has(STORE_KEY)).toBe(true);
    expect(await st.load()).toEqual(s);
  });

  it('never throws when storage throws', async () => {
    g.localStorage = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    g.Telegram = { WebApp: { CloudStorage: { getItem() { throw new Error('y'); }, setItem() { throw new Error('y'); }, removeItem() { throw new Error('y'); } } } };
    const st = createStore();
    await st.save(newSession(form, 2));
    expect(await st.load()).toEqual(newSession(form, 2)); // memory fallback
    await st.clear();
  });
});
