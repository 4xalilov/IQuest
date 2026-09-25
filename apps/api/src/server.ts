import { buildApp } from './app';
import { loadConfig } from './config';
import { createPgDb } from './db/client';

const config = loadConfig();
const { db, close } = await createPgDb(config.databaseUrl);
const app = await buildApp({ db, config, logger: true });

const shutdown = async () => { await app.close(); await close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.port, host: config.host });
