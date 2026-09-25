import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  /** Vergul bilan: http://localhost:5173,https://iquest.uz. Bo'sh — hamma origin'ga ruxsat (faqat dev). */
  CORS_ORIGINS: z.string().default(''),
  /** Vergul bilan Telegram id'lar — admin huquqi. */
  ADMIN_TG_IDS: z.string().default(''),
  /** Telegram setWebhook secret_token — X-Telegram-Bot-Api-Secret-Token sarlavhasi bilan solishtiriladi. */
  BOT_WEBHOOK_SECRET: z.string().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  INIT_DATA_MAX_AGE_SEC: z.coerce.number().int().default(86400),
  BOT_USERNAME: z.string().default('iquest_bot'),
  /** Mini App manzili (bot /start javobidagi web_app tugmasi). */
  WEBAPP_URL: z.string().default('https://iquest.uz/app'),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  databaseUrl: string;
  botToken: string;
  jwtSecret: string;
  corsOrigins: string[];
  adminTgIds: Set<string>;
  botWebhookSecret: string;
  uploadDir: string;
  initDataMaxAgeSec: number;
  botUsername: string;
  webappUrl: string;
}

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = Env.parse(env);
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    botToken: e.BOT_TOKEN,
    jwtSecret: e.JWT_SECRET,
    corsOrigins: list(e.CORS_ORIGINS),
    adminTgIds: new Set(list(e.ADMIN_TG_IDS)),
    botWebhookSecret: e.BOT_WEBHOOK_SECRET,
    uploadDir: e.UPLOAD_DIR,
    initDataMaxAgeSec: e.INIT_DATA_MAX_AGE_SEC,
    botUsername: e.BOT_USERNAME,
    webappUrl: e.WEBAPP_URL,
  };
}
