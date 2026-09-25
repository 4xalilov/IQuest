import { sql } from 'drizzle-orm';
import {
  bigint, boolean, date, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tgId: bigint('tg_id', { mode: 'number' }).notNull().unique(),
  username: text('username'),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  lang: text('lang').notNull().default('uz'),                 // 'uz' | 'ru' | 'kril'
  photoUrl: text('photo_url'),
  proExpiresAt: ts('pro_expires_at'),                        // null yoki o'tgan sana = Pro emas
  referralCode: text('referral_code').notNull().unique(),
  referredBy: integer('referred_by'),                        // users.id
  xp: integer('xp').notNull().default(0),                     // reyting uchun jami ball
  createdAt: ts('created_at').notNull().defaultNow(),
  lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
});

/** Admin boshqaradigan sozlamalar (limitlar, chegirma, narxlar). value — JSON. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

/** Server tomonda ball hisoblanadigan IQ test sessiyasi (@iquest/engine). */
export const iqSessions = pgTable('iq_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seed: integer('seed').notNull(),
  formVersion: text('form_version').notNull(),
  status: text('status').notNull().default('active'),        // 'active' | 'finished' | 'abandoned'
  ageBand: text('age_band'),
  answers: jsonb('answers'),                                 // Answer[][]
  rtMs: jsonb('rt_ms'),                                      // number[][]
  blurCount: integer('blur_count').notNull().default(0),
  result: jsonb('result'),                                   // engine Result
  bandLow: integer('band_low'),
  bandHigh: integer('band_high'),
  startedAt: ts('started_at').notNull().defaultNow(),
  finishedAt: ts('finished_at'),
}, (t) => [index('iq_sessions_user_idx').on(t.userId, t.startedAt)]);

/** Mashq / to'plam / IQ test natijalari — statistika va reyting manbai. */
export const results = pgTable('results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                              // 'set' | 'practice' | 'iq'
  setId: integer('set_id'),                                  // kind='set' bo'lsa to'plam raqami (1..100)
  iqSessionId: uuid('iq_session_id'),
  correct: integer('correct').notNull(),
  total: integer('total').notNull(),
  durationSec: integer('duration_sec').notNull().default(0),
  xp: integer('xp').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('results_user_idx').on(t.userId, t.createdAt), index('results_created_idx').on(t.createdAt)]);

/** Kunlik limitlar hisoblagichi (bepul foydalanuvchilar uchun). day — Asia/Tashkent sanasi. */
export const dailyUsage = pgTable('daily_usage', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  kind: text('kind').notNull(),                              // 'practice_questions' | 'iq_tests'
  count: integer('count').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.day, t.kind] })]);

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredId: integer('referred_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull().defaultNow(),
});

/** Referal mukofotlari — har milestone bir marta beriladi. */
export const referralRewards = pgTable('referral_rewards', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  milestone: integer('milestone').notNull(),                 // 3 | 5 | 10
  days: integer('days').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.milestone] })]);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),                      // 'stars' | 'card_receipt'
  plan: text('plan').notNull(),                              // 'week' | 'month1' | 'month2'
  amount: integer('amount').notNull(),
  currency: text('currency').notNull(),                      // 'XTR' | 'UZS'
  status: text('status').notNull().default('pending'),       // 'pending' | 'paid' | 'rejected' | 'refunded'
  payload: text('payload').notNull().unique(),               // invoice payload / ichki id
  receiptPath: text('receipt_path'),
  telegramChargeId: text('telegram_charge_id').unique(),
  reviewedBy: integer('reviewed_by'),
  note: text('note'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('payments_status_idx').on(t.status, t.createdAt)]);

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                              // 'daily' | 'result' | 'new' | 'exam' | 'payment' | 'referral'
  titleKey: text('title_key').notNull(),
  body: jsonb('body').notNull(),                             // { uz, ru, kril }
  read: boolean('read').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]);

/** Saqlangan (bookmark) savollar. key — frontend kaliti, masalan "12-5" yoki "rules-0-2". */
export const savedQuestions = pgTable('saved_questions', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  data: jsonb('data').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.key] })]);

/** Foydalanuvchining sozlamalari (bildirishnoma turlari). */
export const notificationPrefs = pgTable('notification_prefs', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  daily: boolean('daily').notNull().default(true),
  result: boolean('result').notNull().default(true),
  new: boolean('new').notNull().default(true),
  exam: boolean('exam').notNull().default(true),
});

