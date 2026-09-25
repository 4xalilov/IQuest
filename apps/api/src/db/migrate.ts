import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL kerak');
const sql = postgres(url, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
await sql.end();
console.log('migratsiyalar qo\'llandi');
