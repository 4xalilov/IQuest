import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { settings } from '../db/schema';

/** Narxlar: UZS — karta orqali (chek bilan), XTR — Telegram Stars. */
export interface PlanPrice { days: number; uzs: number; stars: number }
export interface AppSettings {
  dailyTestLimit: number;       // bepul: kuniga mashq savollari
  freeExamCount: number;        // bepul: kuniga IQ test
  freeTicketCount: number;      // bepul to'plamlar (1..N)
  discount: { active: boolean; percent: number; label: string; endDate: string | null; code: string };
  plans: Record<'week' | 'month1' | 'month2', PlanPrice>;
  referralMilestones: { count: number; days: number }[];
  card: { number: string; owner: string };
}

export const DEFAULT_SETTINGS: AppSettings = {
  dailyTestLimit: 100,
  freeExamCount: 2,
  freeTicketCount: 10,
  discount: { active: false, percent: 0, label: '', endDate: null, code: '' },
  plans: {
    week: { days: 7, uzs: 9900, stars: 50 },
    month1: { days: 30, uzs: 29900, stars: 150 },
    month2: { days: 60, uzs: 49900, stars: 250 },
  },
  referralMilestones: [{ count: 3, days: 7 }, { count: 5, days: 30 }, { count: 10, days: 60 }],
  card: { number: '', owner: 'IQUEST' },
};

export type SettingKey = keyof AppSettings;

export async function getSettings(db: Db): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const out = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, unknown>;
  for (const r of rows) if (r.key in out) out[r.key] = r.value;
  return out as unknown as AppSettings;
}

export async function setSetting<K extends SettingKey>(db: Db, key: K, value: AppSettings[K]): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function deleteSetting(db: Db, key: SettingKey): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

/** iquest-frontend (App.jsx) kutayotgan shakl: res.settings.daily_test_limit.value va h.k. */
export function toPublicSettings(s: AppSettings) {
  return {
    daily_test_limit: { value: s.dailyTestLimit },
    free_exam_count: { value: s.freeExamCount },
    free_ticket_count: { value: s.freeTicketCount },
    discount: s.discount,
    plans: s.plans,
    referral_milestones: s.referralMilestones,
    card: s.card,
  };
}
