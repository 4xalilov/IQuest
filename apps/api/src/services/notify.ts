import type { Db } from '../db/client';
import { notifications } from '../db/schema';

export type Localized = { uz: string; ru: string; kril: string };
export type NotifType = 'daily' | 'result' | 'new' | 'exam' | 'payment' | 'referral';

/** Ilova ichidagi bildirishnoma (Bildirishnomalar ekrani). titleKey — frontend LANGS kaliti. */
export async function notify(db: Db, userId: number, n: { type: NotifType; titleKey: string; body: Localized }): Promise<void> {
  await db.insert(notifications).values({ userId, type: n.type, titleKey: n.titleKey, body: n.body });
}
