import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { createMemoryDb, createPgDb, type Db } from '../src/db/client';
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
  const { db, close } = process.env.TEST_DATABASE_URL ? await createRealTestDb(process.env.TEST_DATABASE_URL) : await createMemoryDb();
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

/**
 * TEST_DATABASE_URL berilsa (masalan postgres://postgres@localhost:5433/postgres) — har test fayli uchun
 * alohida vaqtinchalik baza yaratiladi, migratsiya qilinadi va oxirida o'chiriladi (haqiqiy Postgres'da tekshirish).
 */
async function createRealTestDb(adminUrl: string): Promise<{ db: Db; close: () => Promise<void> }> {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  const name = `iquest_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl); url.pathname = `/${name}`;
  const migrator = postgres(url.toString(), { max: 1, onnotice: () => {} });
  await migrate(drizzle(migrator), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  await migrator.end();
  const { db, close } = await createPgDb(url.toString());
  return { db, close: async () => { await close(); await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`); await admin.end(); } };
}
