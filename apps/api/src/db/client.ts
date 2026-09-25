import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export { schema };
/** postgres-js (prod) va PGlite (test) uchun umumiy tur. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export async function createPgDb(url: string): Promise<{ db: Db; close: () => Promise<void> }> {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const sql = postgres(url, { max: 10 });
  return { db: drizzle(sql, { schema }) as unknown as Db, close: () => sql.end() };
}

/** In-process Postgres (PGlite) — testlar va lokal tajriba uchun. Migratsiyalar qo'llanadi. */
export async function createMemoryDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  return { db: db as unknown as Db, close: () => client.close() };
}
