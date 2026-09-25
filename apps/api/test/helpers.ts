import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { createMemoryDb, type Db } from '../src/db/client';
import { signInitData } from '../src/lib/telegram';

export const TEST_BOT_TOKEN = '123456:TEST_TOKEN';
export const ADMIN_TG_ID = 999;

export interface TestCtx { app: FastifyInstance; db: Db; config: Config; close: () => Promise<void> }

/** Har test fayli uchun toza in-process Postgres (PGlite) + ilova. */
export async function makeTestApp(env: Record<string, string> = {}): Promise<TestCtx> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'pglite://memory',
    BOT_TOKEN: TEST_BOT_TOKEN,
    JWT_SECRET: 'test-secret-test-secret',
    ADMIN_TG_IDS: String(ADMIN_TG_ID),
    BOT_WEBHOOK_SECRET: 'hook-secret',
    UPLOAD_DIR: `/tmp/iquest-test-uploads-${process.pid}`,
    ...env,
  });
  const { db, close } = await createMemoryDb();
  const app = await buildApp({ db, config });
  await app.ready();
  return { app, db, config, close: async () => { await app.close(); await close(); } };
}

export function initDataFor(tgId: number, extra: Record<string, string> = {}, user: Record<string, unknown> = {}): string {
  return signInitData({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAE',
    user: JSON.stringify({ id: tgId, first_name: `User${tgId}`, username: `u${tgId}`, ...user }),
    ...extra,
  }, TEST_BOT_TOKEN);
}

/** Telegram orqali kiradi va { token, user, auth } qaytaradi. */
export async function login(app: FastifyInstance, tgId: number, extra: Record<string, string> = {}) {
  const res = await app.inject({ method: 'POST', url: '/auth/telegram', payload: { initData: initDataFor(tgId, extra) } });
  if (res.statusCode !== 200) throw new Error(`login ${res.statusCode}: ${res.body}`);
  const body = res.json() as { token: string; user: { id: number; referralCode: string; isPro: boolean } };
  return { ...body, auth: { authorization: `Bearer ${body.token}` } };
}
